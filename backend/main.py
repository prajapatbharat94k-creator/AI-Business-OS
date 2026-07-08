from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import PROJECT_NAME, API_V1_STR
from backend.database import init_db
from backend.routers import auth, branches, inventory, customers, employees, orders, billing, ai, dashboard

app = FastAPI(title=PROJECT_NAME, openapi_url=f"{API_V1_STR}/openapi.json")

# CORS middleware config to allow local Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. Change to specific domain in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Include Routers
app.include_router(auth.router, prefix=API_V1_STR)
app.include_router(branches.router, prefix=API_V1_STR)
app.include_router(inventory.router, prefix=API_V1_STR)
app.include_router(customers.router, prefix=API_V1_STR)
app.include_router(employees.router, prefix=API_V1_STR)
app.include_router(orders.router, prefix=API_V1_STR)
app.include_router(billing.router, prefix=API_V1_STR)
app.include_router(ai.router, prefix=API_V1_STR)
app.include_router(dashboard.router, prefix=API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Business OS API. Swagger UI available at /docs"}
