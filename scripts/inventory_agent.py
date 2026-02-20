import pandas as pd
import math
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
# Load the variables from the .env file
load_dotenv()

class InventoryAgent:
    def __init__(self, user_id):
        self.user_id = user_id
        
        # Fetch DB credentials from .env
        db_host = os.getenv('DB_HOST')
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        db_name = os.getenv('DB_NAME')
        
        print("HOST:", db_host)
        print("USER:", db_user)
        print("PASSWORD:", db_password)
        print("DB:", db_name)

        # Create SQLAlchemy Engine (The bridge to your AWS RDS)
        connection_string = f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}"
        self.engine = create_engine(connection_string)

    def fetch_compressed_data(self):
        """Simulates fetching compressed data into a Dataframe for fast processing"""
        query = text("SELECT * FROM inventory WHERE user_id = :user_id")
        df = pd.read_sql(query, self.engine, params={"user_id": self.user_id})
        
        # Calculate MRP (selling price) with 50% profit margin
        df['mrp'] = df['order_cost_fixed'].fillna(0) * 1.5
        return df

    def fetch_sales_data(self):
        """Fetch sales history data"""
        query = text("SELECT * FROM sales_history WHERE user_id = :user_id")
        df = pd.read_sql(query, self.engine, params={"user_id": self.user_id})
        return df

    def optimize_stock(self):
        """The 'Reasoning' step where the agent makes decisions"""
        df = self.fetch_compressed_data()

        print("\n--- AGENT STOCK OPTIMIZATION REPORT ---")
        for index, row in df.iterrows():
            status = "✅ OPTIMAL"
            action = "No action needed."
            ideal_qty = self.calculate_eoq(
                    row['annual_demand'],
                    row['order_cost_fixed'],
                    row['holding_cost_per_unit']
                )

            if row['current_stock'] <= row['safety_stock_level']:
                status = "❌ CRITICAL LOW"
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                min_req = row['safety_stock_level'] - row['current_stock']
                action = f"ORDER {reorder_qty} units IMMEDIATELY.\nMINIMUM ORDER:{min_req}"

            elif row['current_stock'] < row['forecasted_demand']:
                status = "🟡 WARNING"
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                action = f"ORDER {reorder_qty} units for Prepare purchase order for next week."

            print(f"Product: {row['product_name']}")
            print(f"Status: {status}")
            print(f"Agent Recommendation: {action}")
            print(f"EOQ:IDEAL QUANTITY: {ideal_qty}")
            print("-" * 40)

    def calculate_eoq(self, annual_demand, order_cost, holding_cost):
        """Standard EOQ formula implementation"""
        if holding_cost == 0: return 0
        eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost)
        return round(eoq)

    def update_stock(self, product_id, quantity_change, total_cost=0):
        """Edits the current stock in MySQL."""
        print("update stock")
        if quantity_change is None:
            raise ValueError("Quantity change is required")
        if product_id is None:
            raise ValueError("Product ID is required")
        
        # engine.begin() auto-commits the transaction
        with self.engine.begin() as conn:
            # Check if product exists
            check_sql = text("SELECT COUNT(*) FROM inventory WHERE product_id = :pid")
            count = conn.execute(check_sql, {"pid": product_id}).scalar()
            
            if count == 0:
                raise ValueError("Product not found")

            # Update the specific product
            update_sql = text("UPDATE inventory SET current_stock = current_stock + :qc WHERE product_id = :pid")
            conn.execute(update_sql, {"qc": quantity_change, "pid": product_id})
            
            # If adding stock (purchase), record in history
            if quantity_change > 0:
                prod_sql = text("SELECT order_cost_fixed FROM inventory WHERE product_id = :pid")
                cost_per_unit = conn.execute(prod_sql, {"pid": product_id}).scalar()
                
                if total_cost > 0:
                    revenue = -total_cost
                else:
                    revenue = - (quantity_change * cost_per_unit)  # Negative for purchase
                profit = 0  # No profit on purchase
                
                history_sql = text("""
                    INSERT INTO sales_history 
                    (product_id, user_id, sale_date, quantity_sold, revenue, profit, type) 
                    VALUES (:pid, :uid, :sdate, :qs, :rev, :prof, :type)
                """)
                conn.execute(history_sql, {
                    "pid": product_id,
                    "uid": self.user_id,
                    "sdate": datetime.now().date(),
                    "qs": quantity_change,
                    "rev": revenue,
                    "prof": profit,
                    "type": 'purchase'
                })

        print(f"--- Stock Updated: Product {product_id} changed by {quantity_change} ---")

    def get_sales_summary(self, period='monthly'):
        """Advanced financial summary"""
        sales_df = self.fetch_sales_data()

        if sales_df.empty:
            return {
                'gross_revenue': {}, 'order_cost': {}, 'total_profit': {},
                'margin_of_revenue': {}, 'net_profit': {}
            }

        sales_df['sale_date'] = pd.to_datetime(sales_df['sale_date'])

        # Create period column
        if period == 'daily':
            sales_df['period'] = sales_df['sale_date'].dt.date
        elif period == 'weekly':
            sales_df['period'] = sales_df['sale_date'].dt.strftime('%Y-%U')
        else:
            sales_df['period'] = sales_df['sale_date'].dt.strftime('%Y-%m')

        results = {}

        for period_key, group in sales_df.groupby('period'):
            # Sales only
            sales_only = group[group['type'] == 'sale']
            gross_revenue = sales_only['revenue'].sum()
            total_profit = sales_only['profit'].sum()

            # Purchase only
            purchase_only = group[group['type'] == 'purchase']
            order_cost = abs(purchase_only['revenue'].sum())

            margin_of_revenue = gross_revenue - order_cost
            net_profit = gross_revenue - order_cost + total_profit

            results[period_key] = {
                'gross_revenue': gross_revenue,
                'order_cost': order_cost,
                'total_profit': total_profit,
                'margin_of_revenue': margin_of_revenue,
                'net_profit': net_profit
            }

        # Convert to structured dict
        final = {
            'gross_revenue': {}, 'order_cost': {}, 'total_profit': {},
            'margin_of_revenue': {}, 'net_profit': {}
        }

        for key, value in results.items():
            for metric in final.keys():
                final[metric][str(key)] = float(value[metric])

        return final

    def get_fast_moving_items(self, top_n=5):
        """Identify fast-moving items based on sales quantity"""
        sales_df = self.fetch_sales_data()
        inventory_df = self.fetch_compressed_data()

        if sales_df.empty:
            return []

        product_sales = sales_df.groupby('product_id')['quantity_sold'].sum().reset_index()
        product_sales = product_sales.merge(inventory_df[['product_id', 'product_name']], on='product_id')
        product_sales = product_sales.sort_values('quantity_sold', ascending=False).head(top_n)

        return product_sales.to_dict('records')

    def get_slow_moving_items(self, threshold=10):
        """Identify slow-moving items based on low sales"""
        sales_df = self.fetch_sales_data()
        inventory_df = self.fetch_compressed_data()

        if sales_df.empty:
            return []

        product_sales = sales_df.groupby('product_id')['quantity_sold'].sum().reset_index()
        slow_moving = product_sales[product_sales['quantity_sold'] <= threshold]
        slow_moving = slow_moving.merge(inventory_df[['product_id', 'product_name']], on='product_id')

        return slow_moving.to_dict('records')

    def get_expiry_alerts(self, days_ahead=30):
        """Get products nearing expiry with product name"""
        df = self.fetch_compressed_data()

        df['expiry_date'] = pd.to_datetime(df['expiry_date'])
        today = pd.Timestamp.today()
        expiry_threshold = today + timedelta(days=days_ahead)

        expiring_soon = df[df['expiry_date'] <= expiry_threshold].copy()
        expiring_soon['days_to_expiry'] = (expiring_soon['expiry_date'] - today).dt.days

        result = expiring_soon[[
            'product_id', 'product_name', 'current_stock',
            'expiry_date', 'days_to_expiry'
        ]]

        return result.to_dict('records')

    def generate_purchase_order(self):
        """Generate draft purchase order for items needing restocking"""
        df = self.fetch_compressed_data()
        order_items = []

        for _, row in df.iterrows():
            if row['current_stock'] <= row['safety_stock_level']:
                reorder_qty = max(row['forecasted_demand'] - row['current_stock'],
                                row['safety_stock_level'] - row['current_stock'] + 10)
                eoq = self.calculate_eoq(row['annual_demand'], row['order_cost_fixed'], row['holding_cost_per_unit'])
                order_items.append({
                    'product_id': row['product_id'],
                    'product_name': row['product_name'],
                    'current_stock': row['current_stock'],
                    'reorder_quantity': reorder_qty,
                    'eoq': eoq,
                    'priority': 'HIGH' if row['current_stock'] <= row['safety_stock_level'] * 0.5 else 'MEDIUM'
                })
            elif row['current_stock'] < row['forecasted_demand']:
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                eoq = self.calculate_eoq(row['annual_demand'], row['order_cost_fixed'], row['holding_cost_per_unit'])
                order_items.append({
                    'product_id': row['product_id'],
                    'product_name': row['product_name'],
                    'current_stock': row['current_stock'],
                    'reorder_quantity': reorder_qty,
                    'eoq': eoq,
                    'priority': 'LOW'
                })

        return order_items

    def record_sale(self, product_id, quantity_sold):
        """Record a new sale - automatically calculates revenue and profit"""
        df = self.fetch_compressed_data()
        product = df[df['product_id'] == product_id]
        if product.empty:
            raise ValueError(f"Product {product_id} not found")
        
        mrp = product['mrp'].iloc[0]
        cost_per_unit = product['order_cost_fixed'].iloc[0]
        
        revenue = quantity_sold * mrp
        profit = quantity_sold * (mrp - cost_per_unit)
        
        with self.engine.begin() as conn:
            sql = text("""
                INSERT INTO sales_history 
                (product_id, sale_date, quantity_sold, revenue, profit, type, user_id) 
                VALUES (:pid, :sdate, :qs, :rev, :prof, :type, :uid)
            """)
            conn.execute(sql, {
                "pid": product_id,
                "sdate": datetime.now().date(),
                "qs": quantity_sold,
                "rev": revenue,
                "prof": profit,
                "type": 'sale',
                "uid": self.user_id
            })

            update_sql = text("UPDATE inventory SET current_stock = current_stock - :qs WHERE product_id = :pid and user_id = :uid")
            conn.execute(update_sql, {
                "qs": quantity_sold,
                "pid": product_id,
                "uid": self.user_id
            })

        print(f"--- Sale Recorded: Product {product_id}, Quantity: {quantity_sold}, Revenue: Rs.{revenue:.2f}, Profit: Rs.{profit:.2f} ---")

    def add_product(self, product_name, current_stock, safety_stock_level,
                    forecasted_demand, lead_time_days, annual_demand,
                    order_cost_fixed, holding_cost_per_unit, expiry_date):
        """Add a new product to inventory"""

        with self.engine.begin() as conn:
            sql = text("""
                INSERT INTO inventory
                (product_name, current_stock, safety_stock_level,
                forecasted_demand, lead_time_days, annual_demand,
                order_cost_fixed, holding_cost_per_unit, expiry_date, user_id)
                VALUES (:pn, :cs, :ssl, :fd, :ltd, :ad, :ocf, :hcpu, :ed, :uid)
            """)

            conn.execute(sql, {
                "pn": product_name, "cs": current_stock, "ssl": safety_stock_level,
                "fd": forecasted_demand, "ltd": lead_time_days, "ad": annual_demand,
                "ocf": order_cost_fixed, "hcpu": holding_cost_per_unit, "ed": expiry_date,
                "uid": self.user_id
            })

        print(f"--- Product Added: {product_name} ---")

    def delete_product(self, product_id):
        """Delete a product from inventory"""
        with self.engine.begin() as conn:
            # Check if product exists
            check_sql = text("SELECT COUNT(*) FROM inventory WHERE product_id = :pid and user_id = :uid")
            count = conn.execute(check_sql, {"pid": product_id, "uid": self.user_id}).scalar()
            
            if count == 0:
                raise ValueError("Product not found")

            # Delete related sales history first
            del_history_sql = text("DELETE FROM sales_history WHERE product_id = :pid and user_id = :uid")
            conn.execute(del_history_sql, {"pid": product_id, "uid": self.user_id})

            # Then delete from inventory
            del_inv_sql = text("DELETE FROM inventory WHERE product_id = :pid and user_id = :uid")
            conn.execute(del_inv_sql, {"pid": product_id, "uid": self.user_id})

        print(f"--- Product Deleted: {product_id} ---")


if __name__ == "__main__":
    agent = InventoryAgent(user_id=1) # Note: Make sure to pass a test user_id if running directly
    agent.optimize_stock()
