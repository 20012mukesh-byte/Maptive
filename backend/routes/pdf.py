from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.pdf import PDFFile
from ..models.network import Network
from ..config import settings
import os
import uuid

router = APIRouter(prefix="/pdf", tags=["pdf"])

async def process_pdf_task(file_path: str, user_id: str, db_session_factory):
    # Mock processing
    mock_graph = {
        "nodes": [{"id": "R1", "type": "router", "label": "Processed Core"}],
        "links": []
    }
    
    async with db_session_factory() as db:
        new_network = Network(
            user_id=user_id,
            type="simulation",
            graph_data=mock_graph
        )
        db.add(new_network)
        await db.commit()

@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    user_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Save to SQL
    pdf_entry = PDFFile(user_id=user_id, file_path=file_path)
    db.add(pdf_entry)
    await db.commit()
    
    # Trigger background processing
    from ..database import AsyncSessionLocal
    background_tasks.add_task(process_pdf_task, file_path, user_id, AsyncSessionLocal)
    
    return {"message": "File uploaded successfully", "path": file_path}
