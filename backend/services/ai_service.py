from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlmodel import Session, select, func
from backend.models import Order, OrderItem, Product, Branch, User, Customer, UserRole
import math

class AIService:
    @staticmethod
    def forecast_sales(session: Session, days: int = 7) -> Dict[str, Any]:
        """
        Forecast sales for the next N days using simple linear regression based on the last 30 days of sales history.
        """
        # Get historical sales grouped by day for the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        orders = session.exec(
            select(
                func.date(Order.date).label("order_date"),
                func.sum(Order.total_amount).label("daily_total")
            )
            .where(Order.date >= thirty_days_ago)
            .group_by(func.date(Order.date))
            .order_by(func.date(Order.date))
        ).all()
        
        # Format historical data
        history = []
        for row in orders:
            # orders might return tuples or Row objects
            o_date = row[0] if isinstance(row, tuple) else getattr(row, "order_date", None)
            o_total = row[1] if isinstance(row, tuple) else getattr(row, "daily_total", 0.0)
            if o_date:
                history.append({"date": str(o_date), "amount": float(o_total or 0.0)})
                
        # If not enough history, generate default fallback linear forecast
        if len(history) < 2:
            base_date = datetime.utcnow()
            forecast = []
            for i in range(1, days + 1):
                f_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
                forecast.append({"date": f_date, "amount": 150.0 + i * 10.0}) # linear default
            return {
                "history": history if history else [{"date": base_date.strftime("%Y-%m-%d"), "amount": 150.0}],
                "forecast": forecast,
                "confidence_score": 0.60,
                "trend": "INCREASING (Fallback Mode)"
            }

        # Perform Simple Linear Regression (Y = a + bX)
        # Let X be 0 to N-1 representing days
        n = len(history)
        x = list(range(n))
        y = [h["amount"] for h in history]
        
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        
        num = 0.0
        den = 0.0
        for i in range(n):
            num += (x[i] - mean_x) * (y[i] - mean_y)
            den += (x[i] - mean_x) ** 2
            
        b = num / den if den != 0 else 0
        a = mean_y - b * mean_x
        
        # Generate future dates
        forecast = []
        last_date_str = history[-1]["date"]
        try:
            last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
        except ValueError:
            last_date = datetime.utcnow()
            
        for i in range(1, days + 1):
            f_date = (last_date + timedelta(days=i)).strftime("%Y-%m-%d")
            # Calculate forecasted value
            val = a + b * (n + i - 1)
            forecast.append({"date": f_date, "amount": round(max(0.0, val), 2)})
            
        trend = "INCREASING" if b > 0 else ("DECREASING" if b < 0 else "STABLE")
        
        # Calculate a basic R-squared score as confidence metric
        ss_tot = sum((val - mean_y) ** 2 for val in y)
        ss_res = 0.0
        for i in range(n):
            fit_val = a + b * x[i]
            ss_res += (y[i] - fit_val) ** 2
        r_sq = 1.0 - (ss_res / ss_tot) if ss_tot != 0 else 0.5
        confidence = round(max(0.1, min(0.99, r_sq)), 2)
        
        return {
            "history": history,
            "forecast": forecast,
            "confidence_score": confidence,
            "trend": trend
        }

    @staticmethod
    def predict_inventory_demand(session: Session) -> List[Dict[str, Any]]:
        """
        Analyze products and estimate how long they will last based on historical order demand (sales velocity).
        """
        # Fetch all products
        products = session.exec(select(Product)).all()
        
        # Fetch last 30 days items sold to compute sales velocity
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        items = session.exec(
            select(
                OrderItem.product_id,
                func.sum(OrderItem.quantity).label("total_sold")
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.date >= thirty_days_ago)
            .group_by(OrderItem.product_id)
        ).all()
        
        # Map product_id to daily velocity (units sold / 30)
        velocities = {}
        for row in items:
            p_id = row[0] if isinstance(row, tuple) else getattr(row, "product_id")
            total_sold = row[1] if isinstance(row, tuple) else getattr(row, "total_sold", 0)
            velocities[p_id] = total_sold / 30.0
            
        predictions = []
        for p in products:
            daily_velocity = velocities.get(p.id, 0.1) # default base sales if no sales in last 30d
            if daily_velocity == 0:
                daily_velocity = 0.1
                
            qty_remaining = p.stock_quantity
            days_to_depletion = qty_remaining / daily_velocity
            
            # Predict status
            if days_to_depletion <= 3:
                urgency = "CRITICAL"
            elif days_to_depletion <= 10:
                urgency = "HIGH"
            elif days_to_depletion <= 20:
                urgency = "MEDIUM"
            else:
                urgency = "LOW"
                
            # Reorder recommendation
            # Reorder Quantity = (Lead Time Demand) + Safety Stock
            # Assume Lead Time = 5 days, Safety Stock = low_stock_threshold
            lead_time_days = 5
            safety_stock = p.low_stock_threshold
            reorder_point = (daily_velocity * lead_time_days) + safety_stock
            
            reorder_status = "RESTOCK_NOW" if qty_remaining <= reorder_point else "OK"
            recommended_reorder_qty = max(0, math.ceil((daily_velocity * 30) + safety_stock - qty_remaining))
            
            predictions.append({
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "current_stock": qty_remaining,
                "daily_velocity": round(daily_velocity, 2),
                "days_remaining": round(days_to_depletion, 1) if days_to_depletion < 999 else 999,
                "urgency_level": urgency,
                "reorder_status": reorder_status,
                "recommended_qty": recommended_reorder_qty if reorder_status == "RESTOCK_NOW" else 0
            })
            
        return predictions

    @staticmethod
    def get_performance_insights(session: Session) -> List[Dict[str, Any]]:
        """
        Generate dynamic text insights about the business.
        """
        insights = []
        
        # 1. Total revenue & orders count
        orders = session.exec(select(Order)).all()
        total_rev = sum(o.total_amount for o in orders)
        avg_order = total_rev / len(orders) if orders else 0.0
        
        insights.append({
            "type": "REVENUE",
            "title": "Average Order Value (AOV)",
            "description": f"Across all operations, customers spend an average of ${avg_order:.2f} per order. Total accumulated revenue is ${total_rev:.2f}.",
            "impact": "NEUTRAL"
        })
        
        # 2. Branch performance
        branches = session.exec(select(Branch)).all()
        best_branch = None
        max_branch_rev = -1.0
        for b in branches:
            branch_orders = session.exec(select(Order).where(Order.branch_id == b.id)).all()
            b_rev = sum(o.total_amount for o in branch_orders)
            if b_rev > max_branch_rev:
                max_branch_rev = b_rev
                best_branch = b
                
        if best_branch:
            insights.append({
                "type": "BRANCH",
                "title": f"Top Performing Branch: {best_branch.name}",
                "description": f"Branch '{best_branch.name}' is leading sales with a total turnover of ${max_branch_rev:.2f}, representing the highest regional distribution.",
                "impact": "POSITIVE"
            })
            
        # 3. Stock warning
        low_stock_p = session.exec(select(Product).where(Product.stock_quantity <= Product.low_stock_threshold)).all()
        if low_stock_p:
            insights.append({
                "type": "INVENTORY",
                "title": "Low Stock Alert",
                "description": f"There are {len(low_stock_p)} products currently falling below their safety thresholds. These require immediate replenishment to prevent stockouts.",
                "impact": "NEGATIVE"
            })
        else:
            insights.append({
                "type": "INVENTORY",
                "title": "Inventory Health Stable",
                "description": "All tracked product lines are currently above low-stock thresholds. Safety margins are fully maintained.",
                "impact": "POSITIVE"
            })
            
        # 4. CRM / Customer insight
        customers = session.exec(select(Customer)).all()
        if customers:
            top_loyal = sorted(customers, key=lambda c: c.loyalty_points, reverse=True)[:3]
            names = ", ".join(c.name for c in top_loyal)
            insights.append({
                "type": "CRM",
                "title": "Loyalty Program Leaders",
                "description": f"Top loyalty point holders are: {names}. They present excellent targets for VIP customer-appreciation discount campaigns.",
                "impact": "POSITIVE"
            })
            
        return insights

    @staticmethod
    def answer_query(session: Session, user_query: str) -> str:
        """
        Main NLP AI Chat assistant function. Responds dynamically by querying the database.
        """
        query = user_query.lower().strip()
        
        # 1. Total revenue/sales
        if "revenue" in query or "total sales" in query or "total sales amount" in query or "how much money" in query:
            orders = session.exec(select(Order)).all()
            total_rev = sum(o.total_amount for o in orders)
            return f"The business has generated a total revenue of **${total_rev:,.2f}** from **{len(orders)}** completed transactions."

        # 2. Inventory / Low stock items
        elif "low stock" in query or "out of stock" in query or "inventory status" in query or "replenish" in query:
            low_stock = session.exec(select(Product).where(Product.stock_quantity <= Product.low_stock_threshold)).all()
            if not low_stock:
                return "All products are currently well-stocked! No products are below their safety stock levels."
            
            p_list = "\n".join([f"- **{p.name}** (SKU: `{p.sku}`): Only **{p.stock_quantity}** units remaining (Threshold: {p.low_stock_threshold})" for p in low_stock])
            return f"There are **{len(low_stock)}** products below safety stock levels:\n\n{p_list}\n\nI recommend placing a restock order with suppliers soon."

        # 3. Top selling product
        elif "top product" in query or "best seller" in query or "most popular" in query or "selling product" in query:
            order_items = session.exec(select(OrderItem)).all()
            if not order_items:
                return "We don't have any order history yet, so I cannot determine the top product."
            
            quantities = {}
            for item in order_items:
                quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
                
            if not quantities:
                return "No items sold yet."
                
            top_p_id = max(quantities, key=quantities.get)
            top_p = session.exec(select(Product).where(Product.id == top_p_id)).first()
            if top_p:
                return f"Our top selling product is **{top_p.name}** (SKU: `{top_p.sku}`) with a total of **{quantities[top_p_id]}** units sold."
            return "Unable to determine the top product."

        # 4. Best branch
        elif "best branch" in query or "top branch" in query or "perform best" in query or "branch performance" in query:
            branches = session.exec(select(Branch)).all()
            if not branches:
                return "There are no branches registered in the system."
            
            b_sales = {}
            for b in branches:
                orders = session.exec(select(Order).where(Order.branch_id == b.id)).all()
                b_sales[b.name] = sum(o.total_amount for o in orders)
                
            best = max(b_sales, key=b_sales.get)
            return f"The best performing branch is **{best}** with total sales of **${b_sales[best]:,.2f}**."

        # 5. Employees count
        elif "employee" in query or "staff" in query or "salary" in query:
            employees = session.exec(select(User).where(User.role != UserRole.CUSTOMER)).all()
            total_salary = session.exec(select(func.sum(Product.price))).first() # dummy for check, actually query EmployeeProfile
            from backend.models import EmployeeProfile
            salaries = session.exec(select(func.sum(EmployeeProfile.salary))).one() or 0.0
            
            return f"We currently employ **{len(employees)}** team members (including managers and admins). The total monthly salary payroll is **${salaries:,.2f}**."
            
        # 6. Customers / loyalty points
        elif "customer" in query or "crm" in query or "loyalty" in query:
            cust_count = session.exec(select(func.count(Customer.id))).one()
            top_cust = session.exec(select(Customer).order_by(Customer.loyalty_points.desc())).first()
            msg = f"The CRM database has **{cust_count}** registered customers."
            if top_cust:
                msg += f" Our most loyal customer is **{top_cust.name}** with **{top_cust.loyalty_points}** loyalty points."
            return msg

        # 7. Dynamic Greeting/Fallback
        else:
            return (
                "Hello! I am your AI Business OS Assistant. I can help analyze your operations in real-time.\n\n"
                "Try asking me questions like:\n"
                "- *What is our total revenue?*\n"
                "- *Which is our best performing branch?*\n"
                "- *Do we have any low stock items?*\n"
                "- *How many staff members do we have?*\n"
                "- *Who is our top customer?*"
            )
