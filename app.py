from flask import Flask, render_template, jsonify, request, session, redirect
from flask_cors import CORS
import sys
import os

# Ensure Python looks in the scripts folder
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
from scripts.inventory_agent import InventoryAgent

# Import auth blueprint
from auth import auth_bp

app = Flask(__name__)
app.secret_key = "super_secret_key"
CORS(app)

# Register auth blueprint
app.register_blueprint(auth_bp)

# --------------------------
# Helper to get agent
# --------------------------

def get_agent():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return InventoryAgent(user_id)


# --------------------------
# ROUTES
# --------------------------

@app.route('/')
def home():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('index.html')

@app.route('/api/inventory')
def get_inventory():
    try:
        agent = get_agent()
        if not agent:
            return jsonify({"error": "Unauthorized"}), 401

        df = agent.fetch_compressed_data()
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/advise')
def get_advice():
    try:
        agent = get_agent()
        df = agent.fetch_compressed_data()
        recommendations = []
        for _, row in df.iterrows():
            if row['current_stock'] <= row['safety_stock_level']:
                # Running your EOQ logic
                status = "❌ CRITICAL LOW"
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                min_req=row['safety_stock_level']-row['current_stock']
                action = f"ORDER {reorder_qty} units IMMEDIATELY._______MINIMUM ORDER:{min_req}"
                eoq = agent.calculate_eoq(row['annual_demand'], row['order_cost_fixed'], row['holding_cost_per_unit'])
                recommendations.append({
                    "product": row['product_name'],
                    "current": int(row['current_stock']),
                    "recommendation": f"   {status}:   {action}:________ideal EOQ:{eoq}"
                })
            
            elif row['current_stock'] < row['forecasted_demand']:
                status = "🟡 WARNING"
                reorder_qty = row['forecasted_demand'] - row['current_stock']
                action = f"ORDER {reorder_qty} units for Prepare purchase order for next week."
                eoq = agent.calculate_eoq(row['annual_demand'], row['order_cost_fixed'], row['holding_cost_per_unit'])
                recommendations.append({
                    "product": row['product_name'],
                    "current": int(row['current_stock']),
                    "recommendation": f"   {status}:   {action}:_________ideal EOQ:{eoq}"
                })

        return jsonify(recommendations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales-summary/<period>')
def get_sales_summary(period):
    try:
        agent = get_agent()
        summary = agent.get_sales_summary(period)
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fast-moving')
def get_fast_moving():
    try:
        agent = get_agent()
        items = agent.get_fast_moving_items()
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/slow-moving')
def get_slow_moving():
    try:
        agent = get_agent()
        items = agent.get_slow_moving_items()
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/expiry-alerts')
def get_expiry_alerts():
    try:
        agent = get_agent()
        if not agent:
            return jsonify({"error": "Unauthorized"}), 401

        alerts = agent.get_expiry_alerts()
        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/purchase-order')
def get_purchase_order():
    try:
        agent=get_agent()
        order = agent.generate_purchase_order()
        return jsonify(order)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/record-sale', methods=['POST'])
def record_sale():
    try:
        agent=get_agent()
        data = request.json
        product_id = data['product_id']
        quantity = data['quantity']
        
        # Get product details for calculation
        df = agent.fetch_compressed_data()
        product = df[df['product_id'] == product_id]
        if product.empty:
            return jsonify({"error": f"Product {product_id} not found"}), 404
        
        mrp = product['mrp'].iloc[0]
        cost_per_unit = product['order_cost_fixed'].iloc[0]
        revenue = quantity * mrp
        profit = quantity * (mrp - cost_per_unit)
        
        agent.record_sale(product_id, quantity)
        return jsonify({
            "message": "Sale recorded successfully",
            "revenue": round(revenue, 2),
            "profit": round(profit, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update-stock', methods=['POST'])
def update_stock():
    try:
        agent=get_agent()
        data = request.json
        product_id = data['product_id']
        quantity_change = data['quantity_change']
        total_cost = data.get('total_cost', 0)
        agent.update_stock(product_id, quantity_change, total_cost)
        return jsonify({"message": "Stock updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales-history')
def get_sales_history():
    try:
        agent=get_agent()
        sales_df = agent.fetch_sales_data()
        inventory_df = agent.fetch_compressed_data()
        
        # Merge with inventory to get product names
        sales_df = sales_df.merge(inventory_df[['product_id', 'product_name']], on='product_id', how='left')
        
        # Sort by date descending, then by id descending (newest first)
        sales_df = sales_df.sort_values(['sale_date'], ascending=False)
        
        # Convert to dict and format dates
        sales_history = sales_df.to_dict('records')
        for sale in sales_history:
            sale['sale_date'] = sale['sale_date'].strftime('%Y-%m-%d') if hasattr(sale['sale_date'], 'strftime') else str(sale['sale_date'])
        
        return jsonify(sales_history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/add-product', methods=['POST'])
def add_product():
    try:
        agent=get_agent()
        if not agent:
            return jsonify({"error": "Unauthorized"}), 401

        data = request.json

        agent.add_product(
            product_name=data['product_name'],
            current_stock=data['current_stock'],
            safety_stock_level=data['safety_stock_level'],
            forecasted_demand=data['forecasted_demand'],
            lead_time_days=data['lead_time_days'],
            annual_demand=data['annual_demand'],
            order_cost_fixed=data['order_cost_fixed'],
            holding_cost_per_unit=data['holding_cost_per_unit'],
            expiry_date=data['expiry_date']
        )

        return jsonify({"message": "Product added successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/delete-product', methods=['POST'])
def delete_product():
    try:
        agent=get_agent()
        data = request.json
        product_id = data['product_id']
        
        agent.delete_product(product_id)

        return jsonify({"message": "Product deleted successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)