from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel

from backend.database import get_session
from backend.models import Branch, User, UserRole
from backend.auth_utils import get_current_user, RoleChecker

router = APIRouter(prefix="/branches", tags=["branches"])

class BranchCreate(BaseModel):
    name: str
    address: str
    phone: str
    email: str

@router.get("/", response_model=List[Branch])
def list_branches(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # All logged-in users can list branches
    branches = session.exec(select(Branch)).all()
    return branches

@router.post("/", response_model=Branch)
def create_branch(
    branch_in: BranchCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    branch = Branch(**branch_in.model_dump())
    session.add(branch)
    session.commit()
    session.refresh(branch)
    return branch

@router.get("/{branch_id}", response_model=Branch)
def get_branch(
    branch_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@router.put("/{branch_id}", response_model=Branch)
def update_branch(
    branch_id: int,
    branch_in: BranchCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    for key, val in branch_in.model_dump().items():
        setattr(branch, key, val)
        
    session.add(branch)
    session.commit()
    session.refresh(branch)
    return branch

@router.delete("/{branch_id}")
def delete_branch(
    branch_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    # Check if users are assigned to this branch
    users = session.exec(select(User).where(User.branch_id == branch_id)).first()
    if users:
        raise HTTPException(status_code=400, detail="Cannot delete branch with assigned users")
        
    session.delete(branch)
    session.commit()
    return {"detail": "Branch deleted successfully"}
