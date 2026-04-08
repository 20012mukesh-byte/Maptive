from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from ..database import Base

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String)
    messages = Column(JSON)
