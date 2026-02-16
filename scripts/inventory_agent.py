import mysql.connector
import pandas as pd
import math
from datetime import datetime, timedelta

from dotenv import load_dotenv
import os
# Load the variables from the .env file
load_dotenv()

class InventoryAgent:
    def __init__(self,user_id):
        self.user_id = user_id
        # Database Connection Configuration
        self.config = {
            'host': os.getenv('DB_HOST'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME')
        }

    def fetch_compressed_data(self):
        """Simulates fetching compressed data into a Dataframe for fast processing"""
        conn = mysql.connector.connect(**self.config)
        query = "SELECT * FROM inventory WHERE user_id = %s"
        df = pd.read_sql(query, conn, params=(self.user_id,))
        conn.close()
        # Calculate MRP (selling price) with 50% profit margin
        df['mrp'] = df['order_cost_fixed'].fillna(0) * 1.5
        return df

    def fetch_sales_data(self):
        """Fetch sales history data"""
        conn = mysql.connector.connect(**self.config)
        query = "SELECT * FROM sales_history WHERE user_id = %s"
        df = pd.read_sql(query, conn, params=(self.user_id,))

        conn.close()
        return df

    def optimize_stock(self):
        """The 'Reasoning' step where the agent makes decisions"""
        df = self.fetch_compressed_data()

        print("\n--- AGENT STOCK OPTIMIZATION REPORT ---")
        for index, row in df.iterrows():
            # Logic: If current stock + what we expect to sell < safety level
            # The agent triggers a reorder.

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
                min_req=row['safety_stock_level']-row['current_stock']
                action = f"ORDER {reorder_qty} units IMMEDIATELY.\nMINIMUM ORDER:{min_req}"

            elif row['current_stock'] < row['forecasted_demand']:
                status = "🟡 WARNING"
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                action = f"ORDER {reorder_qty} units for Prepare purchase order for next week."

            print(f"Product: {row['product_name']}")
            print(f"Status: {status}")
            print(f"Agent Recommendation: {action}")
            print(f"EOQ:IDEAL QANTITY: {ideal_qty}")
            print("-" * 40)

    def calculate_eoq(self, annual_demand, order_cost, holding_cost):
        """Standard EOQ formula implementation"""
        if holding_cost == 0: return 0
        eoq = math.sqrt((2 * annual_demand * order_cost) / holding_cost)
        return round(eoq)

    def update_stock(self, product_id, quantity_change, total_cost=0):
        """
        Edits the current stock in MySQL.
        Use a negative number to 'use' stock (e.g., -5).
        Use a positive number to 'add' stock (e.g., 10).
        total_cost: the total cost for the purchase, if provided, overrides calculation
        """
        print("update stock")
        if quantity_change is None:
            raise ValueError("Quantity change is required")
        if product_id is None:
            raise ValueError("Product ID is required")
        
        conn = mysql.connector.connect(**self.config)
        cursor = conn.cursor()

        # Check if product exists
        cursor.execute("SELECT COUNT(*) FROM inventory WHERE product_id = %s", (product_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            raise ValueError("Product not found")

        # SQL logic: Update the specific product
        sql = "UPDATE inventory SET current_stock = current_stock + %s WHERE product_id = %s"
        cursor.execute(sql, (quantity_change, product_id))
        
        # If adding stock (purchase), record in history
        if quantity_change > 0:
            # Get cost per unit
            df = self.fetch_compressed_data()
            product = df[df['product_id'] == product_id]
            if not product.empty:
                cost_per_unit = product['order_cost_fixed'].iloc[0]
                if total_cost > 0:
                    revenue = -total_cost
                else:
                    revenue = - (quantity_change * cost_per_unit)  # Negative for purchase
                profit = 0  # No profit on purchase
                
                history_sql = "INSERT INTO sales_history (product_id,user_id,sale_date, quantity_sold, revenue, profit, type) VALUES (%s, %s, %s, %s, %s, %s,%s)"
                cursor.execute(history_sql, (product_id,self.user_id,datetime.now().date(), quantity_change, revenue, profit, 'purchase'))

        conn.commit() # Important: This saves the change to the database
        conn.close()
        print(f"--- Stock Updated: Product {product_id} changed by {quantity_change} ---")

    def get_sales_summary(self, period='monthly'):
        """Advanced financial summary"""

        sales_df = self.fetch_sales_data()

        if sales_df.empty:
            return {
                'gross_revenue': {},
                'order_cost': {},
                'total_profit': {},
                'margin_of_revenue': {},
                'net_profit': {}
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
            'gross_revenue': {},
            'order_cost': {},
            'total_profit': {},
            'margin_of_revenue': {},
            'net_profit': {}
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

        # Group by product and sum quantities
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

        # Group by product and sum quantities
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

        expiring_soon['days_to_expiry'] = (
            expiring_soon['expiry_date'] - today
        ).dt.days

        # 🔥 Explicitly select required columns
        result = expiring_soon[[
            'product_id',
            'product_name',
            'current_stock',
            'expiry_date',
            'days_to_expiry'
        ]]

        return result.to_dict('records')

        # """Get products nearing expiry"""
        # df = self.fetch_compressed_data()
        # df['expiry_date'] = pd.to_datetime(df['expiry_date'])
        # today = pd.Timestamp.today()
        # expiry_threshold = today + timedelta(days=days_ahead)

        # expiring_soon = df[df['expiry_date'] <= expiry_threshold]
        # expiring_soon = expiring_soon.copy()
        # expiring_soon['days_to_expiry'] = (expiring_soon['expiry_date'] - today).dt.days

        # return expiring_soon.to_dict('records')

    def generate_purchase_order(self):
        """Generate draft purchase order for items needing restocking"""
        df = self.fetch_compressed_data()
        order_items = []

        for _, row in df.iterrows():
            if row['current_stock'] <= row['safety_stock_level']:
                reorder_qty = max(row['forecasted_demand'] - row['current_stock'],
                                row['safety_stock_level'] - row['current_stock'] + 10)  # Add buffer
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
        # Get product MRP and cost
        df = self.fetch_compressed_data()
        product = df[df['product_id'] == product_id]
        if product.empty:
            raise ValueError(f"Product {product_id} not found")
        
        mrp = product['mrp'].iloc[0]
        cost_per_unit = product['order_cost_fixed'].iloc[0]
        
        revenue = quantity_sold * mrp
        profit = quantity_sold * (mrp - cost_per_unit)
        
        conn = mysql.connector.connect(**self.config)
        cursor = conn.cursor()

        sql = "INSERT INTO sales_history (product_id, sale_date, quantity_sold, revenue, profit, type,user_id) VALUES (%s, %s, %s, %s, %s, %s,%s)"
        cursor.execute(sql, (product_id, datetime.now().date(), quantity_sold, revenue, profit, 'sale',self.user_id))

        # Update inventory stock
        update_sql = "UPDATE inventory SET current_stock = current_stock - %s WHERE product_id = %s and user_id=%s"
        cursor.execute(update_sql, (quantity_sold, product_id,self.user_id))

        conn.commit()
        conn.close()
        print(f"--- Sale Recorded: Product {product_id}, Quantity: {quantity_sold}, Revenue: Rs.{revenue:.2f}, Profit: Rs.{profit:.2f} ---")

    def add_product(self, product_name, current_stock, safety_stock_level,
                    forecasted_demand, lead_time_days, annual_demand,
                    order_cost_fixed, holding_cost_per_unit, expiry_date):
        """Add a new product to inventory"""

        conn = mysql.connector.connect(**self.config)
        cursor = conn.cursor()

        sql = """
        INSERT INTO inventory
        (product_name, current_stock, safety_stock_level,
        forecasted_demand, lead_time_days, annual_demand,
        order_cost_fixed, holding_cost_per_unit, expiry_date,user_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        cursor.execute(sql, (
            product_name,
            current_stock,
            safety_stock_level,
            forecasted_demand,
            lead_time_days,
            annual_demand,
            order_cost_fixed,
            holding_cost_per_unit,
            expiry_date,
            self.user_id
        ))

        conn.commit()
        conn.close()

        print(f"--- Product Added: {product_name} ---")

    def delete_product(self, product_id):
        """Delete a product from inventory"""

        conn = mysql.connector.connect(**self.config)
        cursor = conn.cursor()

        # Check if product exists
        cursor.execute("SELECT COUNT(*) FROM inventory WHERE product_id = %s and user_id=%s", (product_id,self.user_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            raise ValueError("Product not found")

        # Delete related sales history first (important!)
        cursor.execute("DELETE FROM sales_history WHERE product_id = %s and user_id=%s", (product_id,self.user_id))

        # Then delete from inventory
        cursor.execute("DELETE FROM inventory WHERE product_id = %s and user_id=%s", (product_id,self.user_id))

        conn.commit()
        conn.close()

        print(f"--- Product Deleted: {product_id} ---")


if __name__ == "__main__":
    agent = InventoryAgent()
    agent.optimize_stock()




# def get_sales_summary(self, period='monthly'):
#         """Get sales summary for the specified period"""
#         sales_df = self.fetch_sales_data()
#         if sales_df.empty:
#             return {'quantity_sold': {}, 'revenue': {}}

#         sales_df['sale_date'] = pd.to_datetime(sales_df['sale_date'])

#         try:
#             if period == 'daily':
#                 grouped = sales_df.groupby(sales_df['sale_date'].dt.date).agg({
#                     'quantity_sold': 'sum',
#                     'revenue': 'sum'
#                 })
#             elif period == 'weekly':
#                 # Use strftime for weekly grouping to avoid to_period issues
#                 sales_df['week'] = sales_df['sale_date'].dt.strftime('%Y-%U')
#                 grouped = sales_df.groupby('week').agg({
#                     'quantity_sold': 'sum',
#                     'revenue': 'sum'
#                 })
#             else:  # monthly
#                 # Use strftime for monthly grouping to avoid to_period issues
#                 sales_df['month'] = sales_df['sale_date'].dt.strftime('%Y-%m')
#                 grouped = sales_df.groupby('month').agg({
#                     'quantity_sold': 'sum',
#                     'revenue': 'sum'
#                 })

#             # Convert to simple dict format for JSON serialization
#             result = {
#                 'quantity_sold': grouped['quantity_sold'].to_dict(),
#                 'revenue': grouped['revenue'].to_dict()
#             }
#             return result
#         except Exception as e:
#             print(f"Error in get_sales_summary: {e}")
#             # Return empty data on error
#             return {'quantity_sold': {}, 'revenue': {}}