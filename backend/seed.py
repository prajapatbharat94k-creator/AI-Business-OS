from datetime import datetime, timedelta, date
from sqlmodel import Session, select
import random
import uuid

from backend.database import init_db, engine
from backend.models import (
    Branch, User, UserRole, EmployeeProfile, Category, Supplier, Product, 
    Customer, CRMActivity, Order, OrderItem, Invoice, Attendance, LeaveRequest, OrderStatus, PaymentStatus
)
from backend.auth_utils import get_password_hash

def seed_database():
    print("Initializing Database tables...")
    init_db()
    
    with Session(engine) as session:
        # Check if database has already been seeded
        existing_user = session.exec(select(User).where(User.email == "admin@businessos.ai")).first()
        if existing_user:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")
        
        # 1. Create Branches
        b1 = Branch(name="SME Central Hub (Mumbai)", address="101 Bandra Kurla Complex, Mumbai", phone="+91 22 5555 1234", email="mumbai@businessos.ai")
        b2 = Branch(name="East Coast Hub (Kolkata)", address="45 Park Street, Kolkata", phone="+91 33 4444 5678", email="kolkata@businessos.ai")
        b3 = Branch(name="South Coast Hub (Bengaluru)", address="12 MG Road, Bengaluru", phone="+91 80 3333 9999", email="bangalore@businessos.ai")
        
        session.add_all([b1, b2, b3])
        session.commit()
        session.refresh(b1)
        session.refresh(b2)
        session.refresh(b3)
        print(f"Created Branches: {b1.name}, {b2.name}, {b3.name}")
        
        # 2. Create Users
        # Password hashes
        h_admin = get_password_hash("admin123")
        h_owner = get_password_hash("owner123")
        h_manager = get_password_hash("manager123")
        h_employee = get_password_hash("employee123")
        h_customer = get_password_hash("customer123")
        
        u_admin = User(name="Super Admin", email="admin@businessos.ai", hashed_password=h_admin, role=UserRole.SUPER_ADMIN, status="ACTIVE")
        u_owner = User(name="Business Owner", email="owner@businessos.ai", hashed_password=h_owner, role=UserRole.BUSINESS_OWNER, status="ACTIVE")
        u_manager = User(name="Branch Manager", email="manager@businessos.ai", hashed_password=h_manager, role=UserRole.MANAGER, branch_id=b1.id, status="ACTIVE")
        u_employee = User(name="Staff Employee", email="employee@businessos.ai", hashed_password=h_employee, role=UserRole.EMPLOYEE, branch_id=b1.id, status="ACTIVE")
        u_customer = User(name="Jane Doe (Customer)", email="customer@businessos.ai", hashed_password=h_customer, role=UserRole.CUSTOMER, status="ACTIVE")
        
        session.add_all([u_admin, u_owner, u_manager, u_employee, u_customer])
        session.commit()
        session.refresh(u_manager)
        session.refresh(u_employee)
        session.refresh(u_customer)
        print("Created users.")
        
        # 3. Create Employee Profiles
        ep_manager = EmployeeProfile(user_id=u_manager.id, position="Store Manager", salary=4800.0, hire_date=date.today() - timedelta(days=365))
        ep_employee = EmployeeProfile(user_id=u_employee.id, position="Sales Associate", salary=2600.0, hire_date=date.today() - timedelta(days=120))
        
        session.add_all([ep_manager, ep_employee])
        session.commit()
        print("Created employee profiles.")

        # 4. Create Categories
        cat1 = Category(name="Electronics", description="Smartphones, laptops, and peripheral hardware")
        cat2 = Category(name="Office Supplies", description="Paper, notebooks, journals, and pens")
        cat3 = Category(name="Apparel", description="Branded clothing and store uniforms")
        
        session.add_all([cat1, cat2, cat3])
        session.commit()
        session.refresh(cat1)
        session.refresh(cat2)
        session.refresh(cat3)
        print("Created categories.")
        
        # 5. Create Suppliers
        sup1 = Supplier(name="Apex Tech Distributors", contact_name="Rajesh Kumar", phone="+91 98222 11111", email="sales@apexdistributors.com", address="MIDC Industrial Area, Pune")
        sup2 = Supplier(name="Global Fabric Corp", contact_name="Anita Sen", phone="+91 98333 22222", email="info@globalfabrics.in", address="Salt Lake, Sector V, Kolkata")
        sup3 = Supplier(name="Reliable Office Stationery", contact_name="Vikram Rao", phone="+91 98444 33333", email="support@reliablestationery.co.in", address="Chickpet, Bengaluru")
        
        session.add_all([sup1, sup2, sup3])
        session.commit()
        session.refresh(sup1)
        session.refresh(sup2)
        session.refresh(sup3)
        print("Created suppliers.")
        
        # 6. Create Products (Branch-wise catalog)
        # Branch 1 (Mumbai)
        p1 = Product(name="Wireless Ergonomic Mouse", sku="MOU-101", price=45.00, cost_price=20.00, stock_quantity=15, low_stock_threshold=5, category_id=cat1.id, supplier_id=sup1.id, branch_id=b1.id)
        p2 = Product(name="Bluetooth Mechanical Keyboard", sku="KEY-102", price=120.00, cost_price=55.00, stock_quantity=3, low_stock_threshold=5, category_id=cat1.id, supplier_id=sup1.id, branch_id=b1.id) # LOW STOCK
        p3 = Product(name="Premium Leather Journal", sku="JOU-201", price=25.00, cost_price=10.00, stock_quantity=50, low_stock_threshold=15, category_id=cat2.id, supplier_id=sup3.id, branch_id=b1.id)
        
        # Branch 2 (Kolkata)
        p4 = Product(name="Noise Cancelling Headphones", sku="HEA-103", price=199.99, cost_price=90.00, stock_quantity=8, low_stock_threshold=3, category_id=cat1.id, supplier_id=sup1.id, branch_id=b2.id)
        p5 = Product(name="Cotton Crewneck T-Shirt", sku="TSH-301", price=18.50, cost_price=7.00, stock_quantity=100, low_stock_threshold=20, category_id=cat3.id, supplier_id=sup2.id, branch_id=b2.id)
        
        # Branch 3 (Bengaluru)
        p6 = Product(name="High-Velocity Electric Fan", sku="FAN-104", price=85.00, cost_price=40.00, stock_quantity=25, low_stock_threshold=8, category_id=cat1.id, supplier_id=sup1.id, branch_id=b3.id)
        p7 = Product(name="Gel Ink Refillable Pens", sku="PEN-202", price=5.00, cost_price=1.80, stock_quantity=12, low_stock_threshold=25, category_id=cat2.id, supplier_id=sup3.id, branch_id=b3.id) # LOW STOCK
        
        products = [p1, p2, p3, p4, p5, p6, p7]
        session.add_all(products)
        session.commit()
        for p in products:
            session.refresh(p)
        print("Created products.")
        
        # 7. Create Customers
        c1 = Customer(user_id=u_customer.id, name=u_customer.name, email=u_customer.email, phone="+91 99999 88888", address="22 Marine Drive, Mumbai", loyalty_points=120)
        c2 = Customer(name="Aarav Sharma", email="aarav@yahoo.com", phone="+91 98888 77777", address="56 Salt Lake, Kolkata", loyalty_points=45)
        c3 = Customer(name="Priya Patel", email="priya@outlook.com", phone="+91 97777 66666", address="48 Indiranagar, Bengaluru", loyalty_points=85)
        
        customers = [c1, c2, c3]
        session.add_all(customers)
        session.commit()
        for c in customers:
            session.refresh(c)
        print("Created customers.")
        
        # 8. Create CRM Activities
        crm1 = CRMActivity(customer_id=c1.id, activity_type="CALL", notes="Called customer regarding loyalty benefits. Customer is very pleased.", staff_name=u_manager.name)
        crm2 = CRMActivity(customer_id=c2.id, activity_type="EMAIL", notes="Sent wholesale catalog. Waiting for feedback on price list.", staff_name=u_employee.name)
        crm3 = CRMActivity(customer_id=c3.id, activity_type="NOTE", notes="Customer prefers credit card payments and requests delivery alerts.", staff_name=u_manager.name)
        
        session.add_all([crm1, crm2, crm3])
        session.commit()
        print("Created CRM activities.")
        
        # 9. Create 30 Days of Orders for Sales Analytics Forecasting
        # We will loop backward for 30 days and create 1-3 orders per day.
        # This gives a nice volume of data for charts and AI algorithms.
        start_date = datetime.utcnow() - timedelta(days=30)
        order_counter = 1
        
        print("Generating historical orders data for the last 30 days (takes a few seconds)...")
        for day in range(31):
            current_day = start_date + timedelta(days=day)
            num_orders = random.randint(1, 3)
            
            for _ in range(num_orders):
                # Pick random customer, branch
                cust = random.choice(customers)
                br = random.choice([b1, b2, b3])
                
                # Filter products in this branch
                branch_products = [p for p in products if p.branch_id == br.id]
                if not branch_products:
                    branch_products = products # fallback
                    
                # Pick 1-3 items
                num_items = random.randint(1, 3)
                selected_products = random.sample(branch_products, min(num_items, len(branch_products)))
                
                total_amount = 0.0
                items_data = []
                for sp in selected_products:
                    qty = random.randint(1, 4)
                    item_price = sp.price
                    line_total = item_price * qty
                    total_amount += line_total
                    items_data.append((sp.id, qty, item_price))
                    
                # Create Order
                pay_method = random.choice(["CASH", "CARD", "UPI", "RAZORPAY"])
                status = random.choice([OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.CANCELLED])
                p_status = PaymentStatus.PAID if status == OrderStatus.DELIVERED else PaymentStatus.PENDING
                
                order = Order(
                    customer_id=cust.id,
                    branch_id=br.id,
                    date=current_day,
                    total_amount=total_amount,
                    status=status,
                    payment_status=p_status,
                    payment_method=pay_method,
                    created_by_id=u_employee.id,
                    created_at=current_day
                )
                session.add(order)
                session.commit()
                session.refresh(order)
                
                # OrderItems
                for p_id, qty, price in items_data:
                    oi = OrderItem(order_id=order.id, product_id=p_id, quantity=qty, price=price)
                    session.add(oi)
                    
                # Generate Invoice
                gst_rate = 18.0
                subtotal = total_amount / (1.0 + (gst_rate / 100.0))
                gst_amount = total_amount - subtotal
                
                invoice = Invoice(
                    order_id=order.id,
                    invoice_number=f"INV-{current_day.strftime('%Y%m%d')}-{order_counter:04d}",
                    date=current_day,
                    subtotal=round(subtotal, 2),
                    gst_rate=gst_rate,
                    gst_amount=round(gst_amount, 2),
                    total_amount=round(total_amount, 2),
                    payment_status=p_status.value
                )
                session.add(invoice)
                
                order_counter += 1
                
        session.commit()
        print(f"Generated {order_counter - 1} historical orders and invoices.")
        
        # 10. Seed Attendance
        # Add check-ins for the last 5 days
        for i in range(5):
            day_date = date.today() - timedelta(days=i)
            # Manager present
            att_m = Attendance(
                user_id=u_manager.id,
                date=day_date,
                check_in=datetime.combine(day_date, datetime.min.time()) + timedelta(hours=9, minutes=random.randint(0, 15)),
                check_out=datetime.combine(day_date, datetime.min.time()) + timedelta(hours=18, minutes=random.randint(0, 30)),
                status="PRESENT"
            )
            # Employee present or late
            att_e = Attendance(
                user_id=u_employee.id,
                date=day_date,
                check_in=datetime.combine(day_date, datetime.min.time()) + timedelta(hours=9, minutes=random.randint(10, 45)),
                check_out=datetime.combine(day_date, datetime.min.time()) + timedelta(hours=18, minutes=random.randint(0, 15)),
                status="LATE" if random.choice([True, False]) else "PRESENT"
            )
            session.add_all([att_m, att_e])
            
        # 11. Seed Leave Requests
        lv1 = LeaveRequest(
            user_id=u_employee.id,
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=12),
            leave_type="CASUAL",
            reason="Family gathering back home",
            status="PENDING"
        )
        lv2 = LeaveRequest(
            user_id=u_manager.id,
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() - timedelta(days=14),
            leave_type="SICK",
            reason="Fever and dentist appointment",
            status="APPROVED"
        )
        session.add_all([lv1, lv2])
        session.commit()
        print("Created attendance and leave requests.")
        
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
