from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from backend.database import get_session
from backend.models import User, UserRole, Branch
from backend.auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    RoleChecker
)

router = APIRouter(prefix="/auth", tags=["auth"])

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class StaffRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    branch_id: Optional[int] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str
    branch_id: Optional[int] = None

class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    branch_id: Optional[int] = None
    status: str

@router.post("/register", response_model=UserProfile)
def register_customer(user_in: UserRegister, session: Session = Depends(get_session)):
    # Check if email exists
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed,
        role=UserRole.CUSTOMER,
        status="ACTIVE"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Also create a Customer profile linked to it
    from backend.models import Customer
    customer = Customer(
        user_id=user.id,
        name=user.name,
        email=user.email,
        loyalty_points=10 # welcome points
    )
    session.add(customer)
    session.commit()
    
    return user

@router.post("/register-staff", response_model=UserProfile)
def register_staff(
    staff_in: StaffRegister, 
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    existing = session.exec(select(User).where(User.email == staff_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    if staff_in.branch_id:
        branch = session.get(Branch, staff_in.branch_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
            
    hashed = get_password_hash(staff_in.password)
    user = User(
        name=staff_in.name,
        email=staff_in.email,
        hashed_password=hashed,
        role=staff_in.role,
        branch_id=staff_in.branch_id,
        status="ACTIVE"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create employee profile if staff role is manager or employee
    if staff_in.role in [UserRole.MANAGER, UserRole.EMPLOYEE]:
        from backend.models import EmployeeProfile
        profile = EmployeeProfile(
            user_id=user.id,
            position=staff_in.role.value,
            salary=2500.0 if staff_in.role == UserRole.EMPLOYEE else 4500.0,
            leave_balance=20
        )
        session.add(profile)
        session.commit()
        
    return user

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User account is deactivated")
        
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "branch_id": user.branch_id
    }

@router.get("/me", response_model=UserProfile)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserProfile])
def list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    users = session.exec(select(User)).all()
    return users

@router.put("/users/{user_id}/status", response_model=UserProfile)
def update_user_status(
    user_id: int,
    status: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    if status not in ["ACTIVE", "INACTIVE"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
        
    user.status = status
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
