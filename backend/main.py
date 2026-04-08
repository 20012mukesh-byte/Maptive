from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from .database import engine, Base
from .routes import auth, chat, network, pdf
from .websocket.manager import manager
import asyncio

app = FastAPI(title="Maptive API")

# Setup database tables on startup (simple approach for dev)
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Include routes
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(network.router)
app.include_router(pdf.router)

@app.websocket("/ws/{role}")
async def websocket_endpoint(websocket: WebSocket, role: str):
    await manager.connect(websocket, role)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle real-time network updates (enterprise only)
            if role == "enterprise":
                await manager.broadcast(data, "enterprise")
    except WebSocketDisconnect:
        manager.disconnect(websocket, role)

@app.get("/")
async def root():
    return {"message": "Maptive Backend Refactored"}
