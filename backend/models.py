import datetime as dt
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    BUSINESS_OWNER = "BUSINESS_OWNER"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"
    CUSTOMER = "CUSTOMER"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.EMPLOYEE)
    branch_id: Optional[int] = Field(default=None, foreign_key="branch.id")
    status: str = Field(default="ACTIVE") # ACTIVE, INACTIVE
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    branch: Optional["Branch"] = Relationship(back_populates="users")
    employee_profile: Optional["EmployeeProfile"] = Relationship(back_populates="user")
    attendance_records: List["Attendance"] = Relationship(back_populates="user")
    leave_requests: List["LeaveRequest"] = Relationship(back_populates="user")

class Branch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    address: str
    phone: str
    email: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    users: List[User] = Relationship(back_populates="branch")
    products: List["Product"] = Relationship(back_populates="branch")
    orders: List["Order"] = Relationship(back_populates="branch")

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None

    # Relationships
    products: List["Product"] = Relationship(back_populates="category")

class Supplier(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    # Relationships
    products: List["Product"] = Relationship(back_populates="supplier")

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    sku: str = Field(index=True, unique=True) # Barcode / Stock Keeping Unit
    price: float
    cost_price: float
    stock_quantity: int
    low_stock_threshold: int = Field(default=10)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    supplier_id: Optional[int] = Field(default=None, foreign_key="supplier.id")
    branch_id: Optional[int] = Field(default=None, foreign_key="branch.id")
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    category: Optional[Category] = Relationship(back_populates="products")
    supplier: Optional[Supplier] = Relationship(back_populates="products")
    branch: Optional[Branch] = Relationship(back_populates="products")
    order_items: List["OrderItem"] = Relationship(back_populates="product")

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    name: str
    email: str = Field(index=True, unique=True)
    phone: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int = Field(default=0)
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    crm_activities: List["CRMActivity"] = Relationship(back_populates="customer")
    orders: List["Order"] = Relationship(back_populates="customer")

class CRMActivity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id")
    date: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    activity_type: str  # CALL, EMAIL, MEETING, NOTE, TRANSACTION
    notes: str
    staff_name: str

    # Relationships
    customer: Customer = Relationship(back_populates="crm_activities")

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    REFUNDED = "REFUNDED"

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: Optional[int] = Field(default=None, foreign_key="customer.id", nullable=True)
    branch_id: int = Field(foreign_key="branch.id")
    date: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    total_amount: float
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    payment_method: str = Field(default="CASH") # CASH, CARD, UPI, RAZORPAY
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    branch: Branch = Relationship(back_populates="orders")
    customer: Optional[Customer] = Relationship(back_populates="orders")
    items: List["OrderItem"] = Relationship(back_populates="order")
    invoice: Optional["Invoice"] = Relationship(back_populates="order")

class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int
    price: float # Sales price at point of purchase

    # Relationships
    order: Order = Relationship(back_populates="items")
    product: Product = Relationship(back_populates="order_items")

class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", unique=True)
    invoice_number: str = Field(index=True, unique=True)
    date: dt.datetime = Field(default_factory=dt.datetime.utcnow)
    subtotal: float
    gst_rate: float = Field(default=18.0) # GST percentage (e.g. 18%)
    gst_amount: float
    total_amount: float
    payment_status: str = Field(default="PENDING")
    pdf_path: Optional[str] = None

    # Relationships
    order: Order = Relationship(back_populates="invoice")

class EmployeeProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    position: str
    salary: float
    hire_date: dt.date = Field(default_factory=dt.date.today)
    leave_balance: int = Field(default=20)

    # Relationships
    user: User = Relationship(back_populates="employee_profile")

class Attendance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    date: dt.date = Field(default_factory=dt.date.today)
    check_in: Optional[dt.datetime] = None
    check_out: Optional[dt.datetime] = None
    status: str = Field(default="PRESENT") # PRESENT, ABSENT, LATE, LEAVE

    # Relationships
    user: User = Relationship(back_populates="attendance_records")

class LeaveRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    start_date: dt.date
    end_date: dt.date
    leave_type: str # CASUAL, SICK, ANNUAL
    reason: str
    status: str = Field(default="PENDING") # PENDING, APPROVED, REJECTED
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="leave_requests")
