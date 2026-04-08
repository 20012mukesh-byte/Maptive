from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from ..database import Base

class PDFFile(Base):
    __tablename__ = "pdf_files"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    file_path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
