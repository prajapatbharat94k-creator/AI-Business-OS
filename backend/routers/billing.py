from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from typing import List, Optional
import io

from backend.database import get_session
from backend.models import Invoice, Order, OrderItem, Product, Branch, Customer, User, UserRole, EmployeeProfile
from backend.auth_utils import get_current_user, RoleChecker
from backend.services.pdf_service import generate_invoice_pdf
from backend.services.excel_service import generate_report_excel

router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/invoices")
def list_invoices(
    payment_status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Invoice)
    
    if current_user.role == UserRole.CUSTOMER:
        customer = session.exec(select(Customer).where(Customer.user_id == current_user.id)).first()
        if not customer:
            return []
        statement = statement.join(Order).where(Order.customer_id == customer.id)
    elif current_user.role == UserRole.EMPLOYEE:
        statement = statement.join(Order).where(Order.branch_id == current_user.branch_id)
        
    if payment_status:
        statement = statement.where(Invoice.payment_status == payment_status)
        
    invoices = session.exec(statement.order_by(Invoice.date.desc())).all()
    
    results = []
    for inv in invoices:
        order = session.get(Order, inv.order_id)
        cust = session.get(Customer, order.customer_id) if order and order.customer_id else None
        results.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "order_id": inv.order_id,
            "date": inv.date,
            "subtotal": inv.subtotal,
            "gst_rate": inv.gst_rate,
            "gst_amount": inv.gst_amount,
            "total_amount": inv.total_amount,
            "payment_status": inv.payment_status,
            "customer_name": cust.name if cust else "Walk-in Guest",
            "branch_name": order.branch.name if order and order.branch else "Main Branch"
        })
    return results

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    order = session.get(Order, invoice.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Access checks
    if current_user.role == UserRole.CUSTOMER:
        customer = session.exec(select(Customer).where(Customer.user_id == current_user.id)).first()
        if not customer or order.customer_id != customer.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
    # Gather invoice items
    items_with_products = []
    for item in order.items:
        p = session.get(Product, item.product_id)
        items_with_products.append({
            "product_name": p.name if p else "Unknown Product",
            "quantity": item.quantity,
            "unit_price": item.price,
            "total_price": item.quantity * item.price
        })
        
    branch_name = order.branch.name if order.branch else "Main Branch"
    
    pdf_bytes = generate_invoice_pdf(
        invoice_data=invoice,
        order_data=order,
        items_with_products=items_with_products,
        branch_name=branch_name
    )
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"}
    )

@router.get("/reports/excel")
def download_report_excel(
    report_type: str, # sales, inventory, customer, employee
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    data = []
    
    if report_type == "sales":
        orders = session.exec(select(Order).order_by(Order.date.desc())).all()
        for o in orders:
            cust = session.get(Customer, o.customer_id) if o.customer_id else None
            inv = session.exec(select(Invoice).where(Invoice.order_id == o.id)).first()
            data.append({
                "date": o.date,
                "invoice_number": inv.invoice_number if inv else f"ORD-{o.id}",
                "customer_name": cust.name if cust else "Walk-in Guest",
                "branch_name": o.branch.name if o.branch else "Main Branch",
                "payment_method": o.payment_method,
                "status": o.status.value,
                "subtotal": inv.subtotal if inv else o.total_amount,
                "gst_amount": inv.gst_amount if inv else 0.0,
                "total_amount": o.total_amount
            })
            
    elif report_type == "inventory":
        products = session.exec(select(Product)).all()
        for p in products:
            from backend.models import Category, Supplier
            cat = session.get(Category, p.category_id) if p.category_id else None
            sup = session.get(Supplier, p.supplier_id) if p.supplier_id else None
            data.append({
                "name": p.name,
                "sku": p.sku,
                "price": p.price,
                "cost_price": p.cost_price,
                "stock_quantity": p.stock_quantity,
                "low_stock_threshold": p.low_stock_threshold,
                "category_name": cat.name if cat else "Uncategorized",
                "branch_name": p.branch.name if p.branch else "Central Storage",
                "supplier_name": sup.name if sup else "None"
            })
            
    elif report_type == "customer":
        customers = session.exec(select(Customer)).all()
        for c in customers:
            orders = session.exec(select(Order).where(Order.customer_id == c.id)).all()
            total_spent = sum(o.total_amount for o in orders)
            data.append({
                "name": c.name,
                "email": c.email,
                "phone": c.phone or "",
                "address": c.address or "",
                "loyalty_points": c.loyalty_points,
                "total_orders": len(orders),
                "total_spent": total_spent
            })
            
    elif report_type == "employee":
        profiles = session.exec(select(EmployeeProfile)).all()
        for p in profiles:
            u = session.get(User, p.user_id)
            if u:
                data.append({
                    "name": u.name,
                    "email": u.email,
                    "position": p.position,
                    "branch_name": u.branch.name if u.branch else "Central Office",
                    "salary": p.salary,
                    "hire_date": p.hire_date,
                    "leave_balance": p.leave_balance
                })
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
        
    excel_bytes = generate_report_excel(report_type=report_type, data=data)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"}
    )
