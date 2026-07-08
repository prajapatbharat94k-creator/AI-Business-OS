from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from backend.database import get_session
from backend.models import User, UserRole, EmployeeProfile, Attendance, LeaveRequest
from backend.auth_utils import get_current_user, RoleChecker

router = APIRouter(prefix="/employees", tags=["employees"])

# Schemas
class LeaveCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    reason: str

class SalaryUpdate(BaseModel):
    salary: float

# ----------------- ATTENDANCE -----------------
@router.post("/attendance/check-in", response_model=Attendance)
def check_in(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    today = date.today()
    # Check if already checked in today
    existing = session.exec(
        select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == today)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")
        
    att = Attendance(
        user_id=current_user.id,
        date=today,
        check_in=datetime.utcnow(),
        status="PRESENT"
    )
    session.add(att)
    session.commit()
    session.refresh(att)
    return att

@router.post("/attendance/check-out", response_model=Attendance)
def check_out(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    today = date.today()
    att = session.exec(
        select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == today)
    ).first()
    
    if not att:
        raise HTTPException(status_code=400, detail="No check-in record found for today")
    if att.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")
        
    att.check_out = datetime.utcnow()
    session.add(att)
    session.commit()
    session.refresh(att)
    return att

@router.get("/attendance/history", response_model=List[Attendance])
def get_my_attendance(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(
        select(Attendance).where(Attendance.user_id == current_user.id).order_by(Attendance.date.desc())
    ).all()

@router.get("/attendance/all")
def get_all_attendance(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    records = session.exec(select(Attendance).order_by(Attendance.date.desc())).all()
    results = []
    for r in records:
        u = session.get(User, r.user_id)
        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": u.name if u else "Unknown",
            "user_email": u.email if u else "",
            "date": r.date,
            "check_in": r.check_in,
            "check_out": r.check_out,
            "status": r.status
        })
    return results

# ----------------- LEAVE MANAGEMENT -----------------
@router.post("/leave/request", response_model=LeaveRequest)
def create_leave_request(
    leave_in: LeaveCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)).first()
    days_requested = (leave_in.end_date - leave_in.start_date).days + 1
    
    if days_requested <= 0:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")
        
    if profile and profile.leave_balance < days_requested:
        raise HTTPException(status_code=400, detail=f"Insufficient leave balance. Remaining: {profile.leave_balance}")
        
    req = LeaveRequest(
        user_id=current_user.id,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        leave_type=leave_in.leave_type,
        reason=leave_in.reason,
        status="PENDING"
    )
    session.add(req)
    session.commit()
    session.refresh(req)
    return req

@router.get("/leave/my-requests", response_model=List[LeaveRequest])
def list_my_leaves(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(
        select(LeaveRequest).where(LeaveRequest.user_id == current_user.id).order_by(LeaveRequest.created_at.desc())
    ).all()

@router.get("/leave/all")
def list_all_leaves(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    requests = session.exec(select(LeaveRequest).order_by(LeaveRequest.created_at.desc())).all()
    results = []
    for r in requests:
        u = session.get(User, r.user_id)
        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": u.name if u else "Unknown",
            "start_date": r.start_date,
            "end_date": r.end_date,
            "leave_type": r.leave_type,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at
        })
    return results

@router.put("/leave/{request_id}/status")
def update_leave_status(
    request_id: int,
    status: str, # APPROVED, REJECTED
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    req = session.get(LeaveRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail="Leave request already processed")
        
    if status == "APPROVED":
        # Deduct leave days
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == req.user_id)).first()
        if profile:
            days = (req.end_date - req.start_date).days + 1
            if profile.leave_balance < days:
                raise HTTPException(status_code=400, detail="Employee has insufficient leave balance")
            profile.leave_balance -= days
            session.add(profile)
            
            # Log attendance log for dates as LEAVE
            # Simple simulation: just update request
            
    req.status = status
    session.add(req)
    session.commit()
    return {"detail": f"Leave request {status.lower()} successfully"}

# ----------------- PAYROLL & PROFILES -----------------
@router.get("/profiles")
def list_employee_profiles(
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    profiles = session.exec(select(EmployeeProfile)).all()
    results = []
    for p in profiles:
        u = session.get(User, p.user_id)
        if u:
            branch = session.get(Branch, u.branch_id) if u.branch_id else None
            results.append({
                "id": p.id,
                "user_id": p.user_id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "position": p.position,
                "salary": p.salary,
                "hire_date": p.hire_date,
                "leave_balance": p.leave_balance,
                "branch_name": branch.name if branch else "Central Office"
            })
    return results

@router.put("/profiles/{profile_id}/salary")
def update_salary(
    profile_id: int,
    sal_in: SalaryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER]))
):
    profile = session.get(EmployeeProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    profile.salary = sal_in.salary
    session.add(profile)
    session.commit()
    return {"detail": "Salary updated successfully", "salary": profile.salary}
