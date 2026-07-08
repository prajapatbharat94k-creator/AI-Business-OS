from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, timedelta

from backend.database import get_session
from backend.models import Order, OrderItem, Product, Branch, Customer, User, LeaveRequest, EmployeeProfile
from backend.auth_utils import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(
    branch_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    orders_statement = select(Order)
    if branch_id:
        orders_statement = orders_statement.where(Order.branch_id == branch_id)
    elif current_user.role == "EMPLOYEE":
        orders_statement = orders_statement.where(Order.branch_id == current_user.branch_id)
        
    orders = session.exec(orders_statement).all()
    
    # 1. Total Revenue
    revenue = sum(o.total_amount for o in orders)
    sales_count = len(orders)
    
    # 2. Profit = total sales price - total cost price
    cost_of_goods_sold = 0.0
    for o in orders:
        for item in o.items:
            product = session.get(Product, item.product_id)
            if product:
                cost_of_goods_sold += (product.cost_price * item.quantity)
            else:
                cost_of_goods_sold += (item.price * 0.6 * item.quantity) # fallback cost of 60%
                
    gross_profit = revenue - cost_of_goods_sold
    
    # 3. Expenses: Employee Payroll + estimated utility overhead
    profiles = session.exec(select(EmployeeProfile)).all()
    payroll = sum(p.salary for p in profiles)
    overhead = 1500.0 # general mock business monthly overhead expenses
    total_expenses = payroll + overhead
    
    # Adjust expenses pro-rata if branch_id is specified
    if branch_id or current_user.role == "EMPLOYEE":
        b_id = branch_id or current_user.branch_id
        # Filter payroll by employees assigned to this branch
        branch_users = session.exec(select(User).where(User.branch_id == b_id)).all()
        branch_u_ids = [u.id for u in branch_users]
        b_payroll = sum(p.salary for p in profiles if p.user_id in branch_u_ids)
        total_expenses = b_payroll + (overhead / 4) # portion of overhead
        
    net_profit = gross_profit - total_expenses
    
    # 4. Inventory Status
    product_statement = select(Product)
    if branch_id:
        product_statement = product_statement.where(Product.branch_id == branch_id)
    elif current_user.role == "EMPLOYEE":
        product_statement = product_statement.where(Product.branch_id == current_user.branch_id)
        
    products = session.exec(product_statement).all()
    total_products = len(products)
    low_stock_count = sum(1 for p in products if p.stock_quantity <= p.low_stock_threshold)
    
    # 5. Branch comparison sales
    branch_stats = []
    branches = session.exec(select(Branch)).all()
    for b in branches:
        b_orders = session.exec(select(Order).where(Order.branch_id == b.id)).all()
        branch_stats.append({
            "branch_id": b.id,
            "branch_name": b.name,
            "revenue": sum(o.total_amount for o in b_orders),
            "orders": len(b_orders)
        })
        
    # 6. Recent Activity Feed
    activities = []
    # Recent orders
    recent_orders = sorted(orders, key=lambda x: x.date, reverse=True)[:5]
    for ro in recent_orders:
        cust = session.get(Customer, ro.customer_id) if ro.customer_id else None
        activities.append({
            "type": "ORDER",
            "message": f"New order #{ro.id} placed by {cust.name if cust else 'Walk-in Guest'}",
            "amount": f"${ro.total_amount:.2f}",
            "time": ro.date
        })
        
    # Recent leave requests
    leaves = session.exec(select(LeaveRequest).order_by(LeaveRequest.created_at.desc()).limit(3)).all()
    for lv in leaves:
        u = session.get(User, lv.user_id)
        activities.append({
            "type": "LEAVE",
            "message": f"Leave requested by {u.name if u else 'Staff'}: {lv.leave_type}",
            "amount": lv.status,
            "time": lv.created_at
        })
        
    # Recent customers
    new_customers = session.exec(select(Customer).order_by(Customer.created_at.desc()).limit(3)).all()
    for nc in new_customers:
        activities.append({
            "type": "CUSTOMER",
            "message": f"Customer registered: {nc.name}",
            "amount": f"+10 Pts",
            "time": nc.created_at
        })
        
    # Sort activities by time
    activities = sorted(activities, key=lambda x: x["time"], reverse=True)[:8]
    
    return {
        "revenue": round(revenue, 2),
        "sales_count": sales_count,
        "gross_profit": round(gross_profit, 2),
        "expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "inventory": {
            "total_items": total_products,
            "low_stock_items": low_stock_count
        },
        "branch_performance": branch_stats,
        "recent_activities": activities
    }
