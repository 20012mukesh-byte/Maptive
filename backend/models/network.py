from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from datetime import datetime
from ..database import Base

class Network(Base):
    __tablename__ = "networks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    type = Column(String) # "enterprise" / "simulation"
    graph_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("networks.id"))
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
