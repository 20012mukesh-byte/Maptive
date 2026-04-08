from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database import get_db
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(uid: str, email: str, db: AsyncSession = Depends(get_db)):
    # Simple Firebase UID to role mapping logic
    # In production, verify token with firebase_admin.auth
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalars().first()
    
    if not user:
        # Auto-create user with standard role
        user = User(id=uid, email=email, role="standard")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return {"id": user.id, "email": user.email, "role": user.role}
