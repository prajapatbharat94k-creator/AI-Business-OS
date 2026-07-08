from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from backend.database import get_session
from backend.models import Order, OrderItem, Product, Customer, Invoice, User, UserRole, OrderStatus, PaymentStatus
from backend.auth_utils import get_current_user, RoleChecker

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    branch_id: int
    customer_id: Optional[int] = None
    items: List[OrderItemCreate]
    payment_method: str = "CASH"
    payment_status: PaymentStatus = PaymentStatus.PENDING

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderPaymentUpdate(BaseModel):
    payment_status: PaymentStatus

@router.get("/")
def list_orders(
    branch_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Order)
    filters = []
    
    # Role-based restriction
    if current_user.role == UserRole.CUSTOMER:
        # Find customer linked to this user
        customer = session.exec(select(Customer).where(Customer.user_id == current_user.id)).first()
        if not customer:
            return []
        filters.append(Order.customer_id == customer.id)
    elif current_user.role == UserRole.EMPLOYEE:
        # Employees see only their branch orders
        filters.append(Order.branch_id == current_user.branch_id)
    else:
        # Admins, Owners, Managers can filter
        if branch_id:
            filters.append(Order.branch_id == branch_id)
        if customer_id:
            filters.append(Order.customer_id == customer_id)
            
    if filters:
        statement = statement.where(*filters)
        
    orders = session.exec(statement.order_by(Order.date.desc())).all()
    
    results = []
    for o in orders:
        cust = session.get(Customer, o.customer_id) if o.customer_id else None
        results.append({
            "id": o.id,
            "branch_id": o.branch_id,
            "branch_name": o.branch.name if o.branch else "Main Branch",
            "customer_id": o.customer_id,
            "customer_name": cust.name if cust else "Walk-in Guest",
            "date": o.date,
            "total_amount": o.total_amount,
            "status": o.status,
            "payment_status": o.payment_status,
            "payment_method": o.payment_method
        })
    return results

@router.post("/", response_model=Order)
def create_order(
    order_in: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
        
    total_amount = 0.0
    items_to_create = []
    
    # 1. Process items and check stock
    for item in order_in.items:
        product = session.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}, Requested: {item.quantity}"
            )
            
        # Deduct stock
        product.stock_quantity -= item.quantity
        session.add(product)
        
        line_total = product.price * item.quantity
        total_amount += line_total
        
        items_to_create.append({
            "product_id": product.id,
            "quantity": item.quantity,
            "price": product.price
        })
        
    # 2. Save order
    order = Order(
        customer_id=order_in.customer_id,
        branch_id=order_in.branch_id,
        total_amount=total_amount,
        status=OrderStatus.PENDING,
        payment_status=order_in.payment_status,
        payment_method=order_in.payment_method,
        created_by_id=current_user.id
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    
    # 3. Create order items
    for item_data in items_to_create:
        order_item = OrderItem(
            order_id=order.id,
            **item_data
        )
        session.add(order_item)
        
    # 4. Award loyalty points if customer exists (1 point per $10 spent)
    if order_in.customer_id:
        customer = session.get(Customer, order_in.customer_id)
        if customer:
            points_earned = int(total_amount // 10)
            customer.loyalty_points += points_earned
            session.add(customer)
            
            # Log CRM activity
            from backend.models import CRMActivity
            crm = CRMActivity(
                customer_id=customer.id,
                activity_type="TRANSACTION",
                notes=f"Placed order #{order.id} for ${total_amount:.2f}. Earned {points_earned} loyalty points.",
                staff_name=current_user.name
            )
            session.add(crm)
            
    # 5. Automatically generate Invoice
    gst_rate = 18.0 # standard 18% GST
    subtotal = total_amount / (1.0 + (gst_rate / 100.0))
    gst_amount = total_amount - subtotal
    
    unique_inv = f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
    invoice = Invoice(
        order_id=order.id,
        invoice_number=unique_inv,
        subtotal=round(subtotal, 2),
        gst_rate=gst_rate,
        gst_amount=round(gst_amount, 2),
        total_amount=round(total_amount, 2),
        payment_status=order_in.payment_status.value
    )
    session.add(invoice)
    
    session.commit()
    session.refresh(order)
    return order

@router.get("/{order_id}")
def get_order(
    order_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Access checks
    if current_user.role == UserRole.CUSTOMER:
        customer = session.exec(select(Customer).where(Customer.user_id == current_user.id)).first()
        if not customer or order.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
    # Load items and products
    items = []
    for item in order.items:
        p = session.get(Product, item.product_id)
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": p.name if p else "Unknown Product",
            "sku": p.sku if p else "",
            "quantity": item.quantity,
            "price": item.price,
            "total_price": item.quantity * item.price
        })
        
    cust = session.get(Customer, order.customer_id) if order.customer_id else None
    invoice = session.exec(select(Invoice).where(Invoice.order_id == order_id)).first()
    
    return {
        "id": order.id,
        "branch_id": order.branch_id,
        "branch_name": order.branch.name if order.branch else "Main Branch",
        "customer_id": order.customer_id,
        "customer_name": cust.name if cust else "Walk-in Guest",
        "customer_phone": cust.phone if cust else "",
        "date": order.date,
        "total_amount": order.total_amount,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "items": items,
        "invoice_number": invoice.invoice_number if invoice else None
    }

@router.put("/{order_id}/status")
def update_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER, UserRole.EMPLOYEE]))
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = status_update.status
    session.add(order)
    session.commit()
    return {"detail": f"Order status updated to {status_update.status}"}

@router.put("/{order_id}/payment")
def update_payment_status(
    order_id: int,
    pay_update: OrderPaymentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER, UserRole.EMPLOYEE]))
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.payment_status = pay_update.payment_status
    session.add(order)
    
    # Also update invoice status
    invoice = session.exec(select(Invoice).where(Invoice.order_id == order_id)).first()
    if invoice:
        invoice.payment_status = pay_update.payment_status.value
        session.add(invoice)
        
    session.commit()
    return {"detail": f"Order payment status updated to {pay_update.payment_status}"}
