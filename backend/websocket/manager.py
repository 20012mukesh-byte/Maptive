from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "enterprise": [],
            "standard": []
        }

    async def connect(self, websocket: WebSocket, role: str):
        await websocket.accept()
        if role in self.active_connections:
            self.active_connections[role].append(websocket)

    def disconnect(self, websocket: WebSocket, role: str):
        if role in self.active_connections:
            self.active_connections[role].remove(websocket)

    async def broadcast(self, message: dict, role: str):
        if role in self.active_connections:
            for connection in self.active_connections[role]:
                await connection.send_json(message)

manager = ConnectionManager()
