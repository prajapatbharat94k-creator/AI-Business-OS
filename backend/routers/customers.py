from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.database import get_session
from backend.models import Customer, CRMActivity, User, UserRole
from backend.auth_utils import get_current_user, RoleChecker

router = APIRouter(prefix="/customers", tags=["customers"])

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int = 0

class CRMActivityCreate(BaseModel):
    activity_type: str # CALL, EMAIL, MEETING, NOTE, TRANSACTION
    notes: str

@router.get("/", response_model=List[Customer])
def list_customers(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Customer)).all()

@router.post("/", response_model=Customer)
def create_customer(
    customer_in: CustomerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER, UserRole.EMPLOYEE]))
):
    existing = session.exec(select(Customer).where(Customer.email == customer_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
        
    customer = Customer(**customer_in.model_dump())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # Get purchase history count and spend
    from backend.models import Order
    orders = session.exec(select(Order).where(Order.customer_id == customer_id)).all()
    total_spent = sum(o.total_amount for o in orders)
    
    return {
        "customer": customer,
        "total_orders": len(orders),
        "total_spent": total_spent,
        "recent_orders": orders[:5]
    }

@router.put("/{customer_id}", response_model=Customer)
def update_customer(
    customer_id: int,
    customer_in: CustomerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER, UserRole.EMPLOYEE]))
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    for key, val in customer_in.model_dump().items():
        setattr(customer, key, val)
        
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@router.post("/{customer_id}/activities", response_model=CRMActivity)
def create_crm_activity(
    customer_id: int,
    activity_in: CRMActivityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    activity = CRMActivity(
        customer_id=customer_id,
        activity_type=activity_in.activity_type,
        notes=activity_in.notes,
        staff_name=current_user.name
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

@router.get("/{customer_id}/activities", response_model=List[CRMActivity])
def list_crm_activities(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    activities = session.exec(select(CRMActivity).where(CRMActivity.customer_id == customer_id).order_by(CRMActivity.date.desc())).all()
    return activities
