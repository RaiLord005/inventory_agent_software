# AI Inventory Management Agent
# deployed to : http://52.66.205.200:5000/login
An intelligent, interactive inventory management system with AI-powered analytics and automated decision-making capabilities.

##  Features

###  Stock Monitoring
- **Continuous Tracking**: Real-time monitoring of product quantities
- **Automatic Detection**: Identifies low stock levels automatically
- **Smart Alerts**: Notifies when stock reaches minimum safety levels
- **Visual Dashboard**: Interactive charts and status indicators

###  Auto Reorder Suggestion
- **Intelligent Recommendations**: Suggests optimal reorder quantities
- **Priority-Based Alerts**: Highlights critical items needing immediate attention
- **EOQ Calculations**: Uses Economic Order Quantity formulas for cost optimization
- **Draft Purchase Orders**: Generates ready-to-use purchase order templates

###  Sales Analysis
- **Fast-Moving Items**: Identifies top-performing products
- **Slow-Moving Stock**: Highlights underperforming inventory
- **Trend Analysis**: Monthly/weekly/daily sales summaries
- **Revenue Tracking**: Comprehensive sales and revenue analytics

###  Expiry Monitoring
- **Expiration Alerts**: Detects products nearing expiry dates
- **Time-Based Warnings**: Configurable alert periods (default: 30 days)
- **Clearance Suggestions**: Recommends discount strategies for expiring stock

## 🛠️ Technical Stack

- **Backend**: Python Flask
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript
- **Charts**: Chart.js for data visualization
- **AI Logic**: Custom algorithms for inventory optimization

##  Dashboard Sections

### Overview Tab
- Real-time stock status charts
- Critical alerts summary
- Top-performing items
- Quick action buttons

### Inventory Tab
- Complete product catalog
- Detailed stock information
- Status indicators (Optimal/Warning/Critical)
- Expiry date tracking

### Sales Analysis Tab
- Monthly sales trends
- Revenue vs quantity charts
- Fast-moving items ranking
- Slow-moving items identification

### Alerts Tab
- Stock reorder recommendations
- Expiry warnings
- Priority-based organization

### Purchase Orders Tab
- Draft purchase order generation
- EOQ-based quantity suggestions
- Priority levels (High/Medium/Low)
- Export to CSV functionality

### Actions Tab
- Record new sales
- Manual stock updates
- Real-time inventory adjustments

## 🗄️ Database Schema

### Inventory Table
```sql
- product_id (Primary Key)
- product_name
- current_stock
- safety_stock_level
- forecasted_demand
- lead_time_days
- annual_demand
- order_cost_fixed
- holding_cost_per_unit
- expiry_date
```

### Sales History Table
```sql
- id (Auto Increment)
- product_id (Foreign Key)
- sale_date
- quantity_sold
- revenue
```

##  Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inventory_management_ai-agent_v3
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup MySQL Database**
   - Ensure MySQL server is running
   - Update database credentials in `scripts/inventory_agent.py` and create a .env file that have the following credentials in the inventory_agent.py
   - Run the database setup:
   ```bash
   python -c "
   import mysql.connector
   # Execute the SQL script from data/warehouse_db.sql
   "
   ```

4. **Run the Application**
   ```bash
   python app.py
   ```

5. **Access the Dashboard**
   - Open browser to `http://localhost:5000`
   - Explore the interactive dashboard

##  Usage Examples

### Recording a Sale
1. Navigate to "Actions" tab
2. Enter Product ID, Quantity Sold, and Revenue
3. Click "Record Sale"

### Generating Purchase Orders
1. Go to "Purchase Orders" tab
2. Review suggested reorder quantities
3. Export to CSV or print for suppliers

### Monitoring Expiry Dates
1. Check "Alerts" tab for expiry warnings
2. Items expiring within 30 days are highlighted
3. Plan clearance sales accordingly

##  AI Agent Features

### Economic Order Quantity (EOQ)
The system calculates optimal order quantities using the classic EOQ formula:
```
EOQ = √((2 × Annual Demand × Order Cost) / Holding Cost)
```

### Smart Reorder Logic
- **Critical**: Stock ≤ Safety Level
- **Warning**: Stock < Forecasted Demand
- **Optimal**: Stock ≥ Forecasted Demand

### Automated Recommendations
- Considers lead times and demand forecasts
- Factors in holding and order costs
- Suggests buffer quantities for safety

## 📈 Analytics & Reporting

### Sales Performance
- Track monthly revenue trends
- Identify seasonal patterns
- Monitor product performance

### Inventory Turnover
- Calculate stock turnover ratios
- Identify overstocked items
- Optimize inventory levels

### Cost Analysis
- Monitor holding costs
- Track order frequencies
- Optimize supply chain efficiency

## 🔧 API Endpoints

- `GET /api/inventory` - Get all inventory data
- `GET /api/advise` - Get reorder recommendations
- `GET /api/sales-summary/<period>` - Get sales analytics
- `GET /api/fast-moving` - Get top-selling items
- `GET /api/slow-moving` - Get slow-moving items
- `GET /api/expiry-alerts` - Get expiry warnings
- `GET /api/purchase-order` - Generate purchase order
- `POST /api/record-sale` - Record a new sale
- `POST /api/update-stock` - Update stock levels

##  Customization

### Styling
- Modify `static/style.css` for custom themes
- Update color schemes and layouts

### Business Logic
- Adjust thresholds in `scripts/inventory_agent.py`
- Modify EOQ calculations
- Customize alert parameters

### Database
- Add new product categories
- Extend sales tracking fields
- Implement additional analytics

##  Future Enhancements

- [ ] Predictive demand forecasting using ML
- [ ] Automated supplier integration
- [ ] Mobile app companion
- [ ] Multi-warehouse support
- [ ] Advanced reporting with PDF export
- [ ] Integration with popular e-commerce platforms

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your enhancements
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with dedication for efficient inventory management**
