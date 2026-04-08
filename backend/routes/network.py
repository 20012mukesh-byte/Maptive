from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import get_db
from ..models.network import Network
from ..services.graph_engine import graph_engine

router = APIRouter(prefix="/network", tags=["network"])

@router.get("/{network_id}")
async def get_network(network_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Network).where(Network.id == network_id))
    network = result.scalars().first()
    if not network:
        return {"error": "Network not found"}
    
    # Load into rustworkx engine
    engine = graph_engine.create_graph(network.graph_data)
    
    return {
        "id": network.id,
        "data": engine.to_json()
    }
