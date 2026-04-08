"""ASGI entry for `uvicorn main:app` — app lives in `graph_engine`."""
from graph_engine import app

__all__ = ["app"]
