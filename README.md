# AI Business OS – Enterprise SME Suite

An enterprise-grade, role-based full-stack Business Operating System built with a **FastAPI (Python) backend**, a **Next.js (React/TypeScript) frontend**, and **relational database SQLite persistence** (via SQLModel). The application is designed to help small and medium enterprises (SMEs) digitize their operations, manage multiple branches, handle GST invoicing, log employee attendance, adjust salary payrolls, track CRM logs, and review AI-driven insights from a single dashboard.

---

## 🚀 Quick Start (Demo Credentials)

For rapid review, the sandbox database is pre-seeded. You can click the quick-login buttons on the login screen or type the following credentials:

*   **Super Admin**: `admin@businessos.ai` | Password: `admin123`
*   **Business Owner**: `owner@businessos.ai` | Password: `owner123`
*   **Store Manager**: `manager@businessos.ai` | Password: `manager123` *(assigned to Mumbai Branch)*
*   **Store Employee**: `employee@businessos.ai` | Password: `employee123` *(assigned to Mumbai Branch)*
*   **Jane Doe (Customer)**: `customer@businessos.ai` | Password: `customer123`

---

## ⚙️ Project Architecture

```
AI Business OS/
├── backend/
│   ├── models.py             # SQLModel DB Schema representing tables & relationships
│   ├── database.py           # SQLite engine configuration & Session provider
│   ├── config.py             # Environment configurations (JWT key, expirations)
│   ├── auth_utils.py         # Password hashing & JWT token validation dependencies
│   ├── seed.py               # Generates branches, employees, CRM logs, and 30-day sales history
│   ├── main.py               # FastAPI startup, CORS policies, router inclusions
│   ├── services/
│   │   ├── ai_service.py     # Linear regression forecasting, demand prediction, & NLP assistant
│   │   ├── pdf_service.py     # Dynamic PDF Invoice creation via ReportLab
│   │   └── excel_service.py   # Spreadsheet exports via openpyxl
│   └── routers/              # Modular API controller routers
│       ├── auth.py, branches.py, inventory.py, customers.py, employees.py, orders.py, billing.py, ai.py, dashboard.py
├── frontend/
│   ├── app/
│   │   ├── context/          # auth-context.tsx managing tokens and apiCall wraps
│   │   ├── components/       # sidebar.tsx, header.tsx, theme-provider.tsx (Dark/Light mode)
│   │   │   └── ui/           # index.tsx: Premium custom form fields, cards, modals
│   │   ├── login/, register/, portal/
│   │   ├── dashboard/        # Layout & routes for administrative features
│   │   │   ├── branches/, inventory/, orders/, billing/, customers/, employees/, ai/
│   │   └── globals.css       # Tailwind CSS v4 custom theme variables (Vercel design language)
└── database.db               # Local SQLite database holding all relational records
```

---

## 🛠️ Tech Stack & Key Features

### Backend (FastAPI + SQLModel + SQLite)
1.  **JWT Authentication & RBAC**: Proper token encoding with role-based restriction guards (e.g. only owners/admins can edit employee salaries or create branches).
2.  **Relational Database**: Deep relational tables modeling users, branches, categories, products, suppliers, customers, orders, items, invoices, payroll profiles, leaves, and attendance.
3.  **Dynamic PDF Invoices**: Renders styled GST-compliant PDF invoice sheets on the fly using `ReportLab` and pipes them as streams to the client browser.
4.  **Excel Reports**: Streams custom sales, inventory auditing, CRM profiles, and employee data worksheets generated via `openpyxl`.
5.  **Built-in Data Science Engine**:
    *   *Sales Forecasting*: Calculates slope and intercept from historical checkouts using simple linear regression (OLS) to predict daily revenue for the next 7 days, complete with R-squared confidence ratings.
    *   *Safety Stock Depletion*: Calculates sales velocities (units sold per day) to predict stockout dates and recommend specific restock volumes.
    *   *Conversational NLP bot*: Queries active tables to answer natural language questions ("what is our total revenue?").

### Frontend (Next.js + TypeScript + Tailwind CSS v4 + Recharts)
1.  **Vercel-inspired Theme**: Glowing dark UI accents, dark/light mode switches, glassmorphic panels, and smooth transition animations.
2.  **Point of Sale (POS) Checkout**: Custom cart checkout system that assigns customer profiles, subtracts catalog items, computes GST amounts, awards customer loyalty points, and generates billing receipts in real-time.
3.  **Staff Attendance & Leaves**: Lets staff check-in/out in the header to log working hours, submit leave requests, and lets managers approve/reject requests.
4.  **Customer Portal**: Secure client interface allowing portal registration, browsing catalog items, checkout using simulated credit cards, tracking order shipping status, logging support tickets, and downloading PDF invoices.
5.  **Interactive Recharts**: Renders visual graphs of historical and forecasted sales, branch margins, and inventory velocities.

---

## 📦 Installation & Local Run

### Prerequisites
*   Node.js (v18+ recommended)
*   Python (3.10+ recommended)

### 1. Run Backend Server
Open a terminal and navigate to the project directory:

```bash
# Move to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Seed the database (Creates tables & populates mock history)
python -m backend.seed

# Start FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
The API Swagger documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Run Frontend Server
Open a second terminal and navigate to the project directory:

```bash
# Move to frontend folder
cd frontend

# Install dependencies
npm install

# Run next build to compile
npm run build

# Start Next.js development server
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.
