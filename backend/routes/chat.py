from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.chat import ChatHistory
from ..services.cache import cache
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    user_id: str
    role: str
    message: str

@router.post("/")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Logical Cache check: enterprise:{user_id} or standard:{user_id}
    cache_key = f"{req.role}:{req.user_id}"
    context = cache.get(cache_key) or []
    
    # Simple AI mock
    reply = f"Mock response for {req.role} user: {req.message}"
    
    context.append({"human": req.message, "ai": reply})
    cache.set(cache_key, context)
    
    # Store in DB
    chat_entry = ChatHistory(
        user_id=req.user_id,
        role=req.role,
        messages=context
    )
    db.add(chat_entry)
    await db.commit()
    
    return {"reply": reply}
