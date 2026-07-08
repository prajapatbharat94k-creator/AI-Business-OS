from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_
from typing import List, Optional
from pydantic import BaseModel

from backend.database import get_session
from backend.models import Product, Category, Supplier, Branch, User, UserRole
from backend.auth_utils import get_current_user, RoleChecker

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Schemas
class ProductCreate(BaseModel):
    name: str
    sku: str
    price: float
    cost_price: float
    stock_quantity: int
    low_stock_threshold: int = 10
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    branch_id: Optional[int] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

# ----------------- CATEGORIES -----------------
@router.get("/categories", response_model=List[Category])
def list_categories(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Category)).all()

@router.post("/categories", response_model=Category)
def create_category(
    category_in: CategoryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    category = Category(**category_in.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

# ----------------- SUPPLIERS -----------------
@router.get("/suppliers", response_model=List[Supplier])
def list_suppliers(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Supplier)).all()

@router.post("/suppliers", response_model=Supplier)
def create_supplier(
    supplier_in: SupplierCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    supplier = Supplier(**supplier_in.model_dump())
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return supplier

# ----------------- PRODUCTS -----------------
@router.get("/products")
def list_products(
    category_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    low_stock: Optional[bool] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Product)
    filters = []
    
    if category_id:
        filters.append(Product.category_id == category_id)
    if branch_id:
        filters.append(Product.branch_id == branch_id)
    if low_stock:
        filters.append(Product.stock_quantity <= Product.low_stock_threshold)
    if search:
        filters.append(or_(
            Product.name.like(f"%{search}%"),
            Product.sku.like(f"%{search}%")
        ))
        
    if filters:
        statement = statement.where(*filters)
        
    products = session.exec(statement).all()
    
    # Enriched output with details
    results = []
    for p in products:
        category = session.get(Category, p.category_id) if p.category_id else None
        branch = session.get(Branch, p.branch_id) if p.branch_id else None
        supplier = session.get(Supplier, p.supplier_id) if p.supplier_id else None
        results.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": p.price,
            "cost_price": p.cost_price,
            "stock_quantity": p.stock_quantity,
            "low_stock_threshold": p.low_stock_threshold,
            "category_id": p.category_id,
            "category_name": category.name if category else "Uncategorized",
            "branch_id": p.branch_id,
            "branch_name": branch.name if branch else "Central Storage",
            "supplier_id": p.supplier_id,
            "supplier_name": supplier.name if supplier else "None",
            "created_at": p.created_at
        })
        
    return results

@router.post("/products")
def create_product(
    product_in: ProductCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    # Check if SKU already exists
    existing = session.exec(select(Product).where(Product.sku == product_in.sku)).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
        
    product = Product(**product_in.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.get("/products/{product_id}")
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    p = session.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
        
    category = session.get(Category, p.category_id) if p.category_id else None
    branch = session.get(Branch, p.branch_id) if p.branch_id else None
    supplier = session.get(Supplier, p.supplier_id) if p.supplier_id else None
    
    return {
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "price": p.price,
        "cost_price": p.cost_price,
        "stock_quantity": p.stock_quantity,
        "low_stock_threshold": p.low_stock_threshold,
        "category_id": p.category_id,
        "category_name": category.name if category else "Uncategorized",
        "branch_id": p.branch_id,
        "branch_name": branch.name if branch else "Central Storage",
        "supplier_id": p.supplier_id,
        "supplier_name": supplier.name if supplier else "None",
        "created_at": p.created_at
    }

@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    product_in: ProductCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check SKU collision if changed
    if product.sku != product_in.sku:
        existing = session.exec(select(Product).where(Product.sku == product_in.sku)).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
            
    for key, val in product_in.model_dump().items():
        setattr(product, key, val)
        
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(RoleChecker([UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER, UserRole.MANAGER]))
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    session.delete(product)
    session.commit()
    return {"detail": "Product deleted successfully"}
