from sqlalchemy import Column, String
from ..database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # Firebase UID
    email = Column(String, unique=True, index=True)
    role = Column(String, default="standard") # "enterprise" or "standard"
