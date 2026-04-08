from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.all_models import PDFFile, Network
from ..config import settings
from ..services.pdf_parser import extract_text_from_pdf, parse_network_with_ai
import os
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdf", tags=["pdf"])

async def process_pdf_task(file_path: str, user_id: str, db_session_factory):
    """Background task to extract text and generate network topology."""
    try:
        # 1. Extract text
        text = extract_text_from_pdf(file_path)
        
        # 2. Get AI JSON
        graph_data = parse_network_with_ai(text)
        
        # 3. Store in SQL
        async with db_session_factory() as db:
            new_network = Network(
                user_id=user_id,
                type="simulation",
                graph_data=graph_data
            )
            db.add(new_network)
            await db.commit()
            logger.info(f"✅ Network generated for user {user_id} from {file_path}")
            
    except Exception as e:
        logger.error(f"❌ Background task failed: {e}")

@router.post("/upload")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    user_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    # Save the file to disk
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Save file record to SQL
    pdf_entry = PDFFile(user_id=user_id, file_path=file_path)
    db.add(pdf_entry)
    await db.commit()
    
    # Trigger AI processing in background
    from ..database import AsyncSessionLocal
    background_tasks.add_task(process_pdf_task, file_path, user_id, AsyncSessionLocal)
    
    return {
        "message": "File uploaded. AI architect is processing the network in the background.",
        "path": file_path,
        "status": "processing"
    }
