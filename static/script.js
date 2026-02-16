// Interactive Inventory Management Dashboard
class InventoryDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.currentView = 'overview';
        this.charts = {};
        this.init();
    }

    init() {
        this.loadSavedTheme();
        this.bindEvents();
        this.checkServerConnection();
        this.loadTab('overview');
        // this.startRealTimeUpdates(); // Disabled to prevent interference with manual logic
    }

    async checkServerConnection() {
        try {
            await this.fetchData('/api/inventory');
            console.log('✅ Server connection successful');
        } catch (error) {
            console.error('❌ Server connection failed:', error);
            const content = document.getElementById('tab-content');
            content.innerHTML = `
                <div class="alert alert-warning">
                    <h4>🔌 Server Connection Issue</h4>
                    <p>Unable to connect to the inventory server. Please ensure the Flask app is running.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
                </div>
            `;
        }
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Modal close
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModal());
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update charts if they exist
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });
    }

    switchTab(tabName, scrollTarget = null) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.currentTab = tabName;
        this.currentView = tabName;
        this.loadTab(tabName).then(() => {
            if (scrollTarget) {
                setTimeout(() => {
                    const element = document.querySelector(scrollTarget);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100); // Small delay to ensure DOM is updated
            }
        });
    }

    async loadTab(tabName) {
        const content = document.getElementById('tab-content');
        content.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

        try {
            switch(tabName) {
                case 'overview':
                    await this.loadOverview();
                    break;
                case 'inventory':
                    await this.loadInventory();
                    break;
                case 'sales':
                    await this.loadSalesAnalysis();
                    break;
                case 'alerts':
                    await this.loadAlerts();
                    break;
                case 'orders':
                    await this.loadPurchaseOrders();
                    break;
                case 'actions':
                    await this.loadActions();
                    break;
            }
        } catch (error) {
            console.error('Error loading tab:', tabName, error);
            content.innerHTML = `
                <div class="alert alert-danger">
                    <h4>⚠️ Unable to load ${tabName} data</h4>
                    <p>Please check that the server is running and try refreshing the page.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="btn btn-primary" onclick="dashboard.loadTab('${tabName}')">Retry</button>
                </div>
            `;
        }
    }

    async loadActions() {
        const content = document.getElementById('tab-content');

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">Record Sale</div>
                        <div class="card-body">
                            <form id="saleForm">
                                <div class="form-group">
                                    <label>Product ID:</label>
                                    <input type="number" id="saleProductId" required>
                                    <div id="saleProductName" class="product-name-display" style="margin-top: 5px; font-weight: bold; color: var(--text-primary);"></div>
                                </div>
                                <div class="form-group">
                                    <label>Quantity Sold:</label>
                                    <input type="number" id="saleQuantity" required min="1">
                                </div>
                                <div class="form-group">
                                    <label>MRP (Rs.):</label>
                                    <input type="text" id="saleMrp" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Revenue (Rs.):</label>
                                    <input type="text" id="saleRevenue" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Profit (Rs.):</label>
                                    <input type="text" id="saleProfit" readonly>
                                </div>
                                <div id="saleResult"></div>
                                <button type="submit" class="btn btn-success">Record Sale</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">Update Stock</div>
                        <div class="card-body">
                            <form id="stockForm">
                                <div class="form-group">
                                    <label>Product ID:</label>
                                    <input type="number" id="stockProductId" required>
                                    <div id="stockProductName" class="product-name-display" style="margin-top: 5px; font-weight: bold; color: var(--text-primary);"></div>
                                </div>
                                <div class="form-group">
                                    <label>Quantity to Add:</label>
                                    <input type="number" id="stockChange" required min="1">
                                </div>
                                <div class="form-group">
                                    <label>Order Cost (Rs.):</label>
                                    <input type="number" id="stockCost" step="0.01" required min="0">
                                </div>
                                <button type="submit" class="btn btn-primary">Update Stock</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">Product Management</div>
                        <div class="card-body">
                            <button class="btn btn-success" onclick="dashboard.showAddProductModal()">Add New Product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind form submissions
        this.bindActionForms();
    }

    async loadOverview() {
        const content = document.getElementById('tab-content');

        // Get all data
        const [inventory, advice, fastMoving, expiryAlerts, slowMoving] = await Promise.all([
            this.fetchData('/api/inventory'),
            this.fetchData('/api/advise'),
            this.fetchData('/api/fast-moving'),
            this.fetchData('/api/expiry-alerts'),
            this.fetchData('/api/slow-moving').catch(() => [])
        ]);

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Quick Actions</div>
                        <div class="card-body">
                            <div class="quick-actions-grid">
                                <button class="btn btn-success animate-bounce quick-action-btn" onclick="dashboard.switchTab('actions')">
                                    <span class="btn-icon">📝</span>
                                    <span class="btn-text">Record Sale</span>
                                </button>
                                <button class="btn btn-primary animate-bounce quick-action-btn" onclick="dashboard.switchTab('actions', '#update-stock-card')">
                                    <span class="btn-icon">📦</span>
                                    <span class="btn-text">Update Stock</span>
                                </button>
                                <button class="btn btn-warning animate-bounce quick-action-btn" onclick="dashboard.switchTab('orders')">
                                    <span class="btn-icon">🛒</span>
                                    <span class="btn-text">Generate Purchase Order</span>
                                </button>
                                <button class="btn btn-info animate-bounce quick-action-btn" onclick="dashboard.showSalesHistory()">
                                    <span class="btn-icon">📊</span>
                                    <span class="btn-text">View P/L OR HISTORY</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Critical Alerts</div>
                        <div class="card-body" id="alerts-summary">
                            ${this.renderAlertsSummary(advice, expiryAlerts)}
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Stock Status Overview</div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="stockChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Fast Moving Items</div>
                        <div class="card-body">
                            ${this.renderFastMoving(fastMoving)}
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Slow Moving Items</div>
                        <div class="card-body">
                            ${this.renderSlowMoving(slowMoving)}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card animate-fade-in">
                        <div class="card-header">Expiry Alerts Summary</div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Total Expiring Products:</span>
                                <span class="badge badge-danger">
                                    ${expiryAlerts.length}
                                </span>
                            </div>

                            <div class="d-flex justify-content-between align-items-center">
                                <span>Within 30 Days:</span>
                                <span class="badge badge-warning">
                                    ${expiryAlerts.filter(p => p.days_to_expiry <= 30).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.createStockChart(inventory);
        this.loadSalesSummary();
    }

    async loadSalesSummary() {
        const summaryElement = document.getElementById('sales-summary-content');
        if (!summaryElement) return;

        try {
            const salesData = await this.fetchData('/api/sales-summary/monthly');
            const totalQuantity = Object.values(salesData.quantity_sold || {}).reduce((a, b) => a + b, 0);
            const totalRevenue = Object.values(salesData.revenue || {}).reduce((a, b) => a + b, 0);
            summaryElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Total Sales Quantity:</span>
                    <span class="badge badge-primary">${totalQuantity} units</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Total Revenue:</span>
                    <span class="badge badge-success">Rs.${totalRevenue.toFixed(2)}</span>
                </div>
            `;
        } catch (error) {
            summaryElement.innerHTML = '<div class="text-muted">Unable to load sales summary</div>';
        }
    }

    async loadInventory() {
        const inventory = await this.fetchData('/api/inventory');
        const content = document.getElementById('tab-content');

        content.innerHTML = `
            <div class="card">
                <div class="card-header">Complete Inventory List</div>
                <div class="card-body">
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product ID</th>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>Safety Level</th>
                                    <th>Forecasted Demand</th>
                                    <th>Lead Time</th>
                                    <th>Annual Demand</th>
                                    <th>Order Cost</th>
                                    <th>Holding Cost</th>
                                    <th>MRP (1 unit)</th>
                                    <th>Expiry Date</th>
                                    <th>Status</th>
<th>Action</th>

                                </tr>
                            </thead>
                            <tbody>
                                ${inventory.map(item => `
                                    <tr>
                                        <td>${item.product_id}</td>
                                        <td>${item.product_name}</td>
                                        <td>${item.current_stock}</td>
                                        <td>${item.safety_stock_level}</td>
                                        <td>${item.forecasted_demand}</td>
                                        <td>${item.lead_time_days} days</td>
                                        <td>${item.annual_demand}</td>
                                        <td>Rs.${item.order_cost_fixed}</td>
                                        <td>Rs.${item.holding_cost_per_unit}</td>
                                        <td>Rs.${item.mrp}</td>
                                        <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                                        <td class="${this.getStatusClass(item)}">${this.getStatusText(item)}</td>
                                        <td>
                                            <button class="btn btn-danger"
                                                onclick="dashboard.deleteProduct(${item.product_id})">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                <tr>
                                    <td colspan="12" style="text-align: center; padding: 20px;">
                                        <button class="btn btn-success" onclick="dashboard.showAddProductModal()" style="font-size: 18px; padding: 10px 20px;">
                                            <span style="color: white; font-weight: bold; margin-right: 5px;">+</span> Add New Product
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSalesAnalysis() {
        const [monthlySales, fastMoving, slowMoving] = await Promise.all([
            this.fetchData('/api/sales-summary/monthly'),
            this.fetchData('/api/fast-moving'),
            this.fetchData('/api/slow-moving')
        ]);

        const content = document.getElementById('tab-content');

        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="btn btn-success" onclick="dashboard.showSalesHistory()">View Sales History</button>
            </div>
            <div class="row">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">Monthly Sales Trend</div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="salesChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">Top Performers</div>
                        <div class="card-body">
                            ${this.renderFastMoving(fastMoving)}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">Slow Moving Items</div>
                        <div class="card-body">
                            ${this.renderSlowMoving(slowMoving)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.createSalesChart(monthlySales);
    }

    async loadAlerts() {
        const [advice, expiryAlerts] = await Promise.all([
            this.fetchData('/api/advise'),
            this.fetchData('/api/expiry-alerts')
        ]);

        const content = document.getElementById('tab-content');

        // Sort alerts by danger level: critical first, then by current stock (ascending)
        const sortedAdvice = advice.sort((a, b) => {
            const aIsCritical = a.recommendation.includes('CRITICAL');
            const bIsCritical = b.recommendation.includes('CRITICAL');

            if (aIsCritical && !bIsCritical) return -1;
            if (!aIsCritical && bIsCritical) return 1;

            // If both are same type, sort by current stock (ascending - lowest stock first)
            return a.current - b.current;
        });

        content.innerHTML = `
            <div class="card">
                <div class="card-header">Stock Reorder Alerts</div>
                <div class="card-body">
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>Alert Type</th>
                                    <th>Status</th>
                                    <th>Recommendation</th>
                                    <th>Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedAdvice.map(item => {
                                    const isCritical = item.recommendation.includes('CRITICAL');
                                    const priority = isCritical ? 'HIGH' : 'MEDIUM';
                                    const alertType = isCritical ? 'Critical Low' : 'Warning';
                                    const status = isCritical ? 'Immediate Action Required' : 'Monitor & Plan';

                                    return `
                                        <tr class="${isCritical ? 'table-danger' : 'table-warning'}">
                                            <td><strong>${item.product}</strong></td>
                                            <td>${item.current}</td>
                                            <td><span class="badge badge-${isCritical ? 'danger' : 'warning'}">${alertType}</span></td>
                                            <td><span class="badge badge-${isCritical ? 'danger' : 'info'}">${status}</span></td>
                                            <td>${item.recommendation.replace(/_________/g, '<br>')}</td>
                                            <td><span class="badge badge-${priority === 'HIGH' ? 'danger' : 'warning'}">${priority}</span></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Expiry Alerts</div>
                <div class="card-body">
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Expiry Date</th>
                                    <th>Days Remaining</th>
                                    <th>Status</th>
                                    <th>Action Needed</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(expiryAlerts).map(item => {
                                    const daysLeft = item.days_to_expiry;
                                    const isUrgent = daysLeft <= 7;
                                    const isWarning = daysLeft <= 14;
                                    let status = 'Normal';
                                    let statusClass = 'success';
                                    let action = 'Monitor';

                                    if (isUrgent) {
                                        status = 'Critical';
                                        statusClass = 'danger';
                                        action = 'Clearance Sale';
                                    } else if (isWarning) {
                                        status = 'Warning';
                                        statusClass = 'warning';
                                        action = 'Plan Clearance';
                                    }

                                    return `
                                        <tr class="table-${statusClass}">
                                            <td>
                                                <strong>${item.product_name}</strong><br>
                                                <small>ID: ${item.product_id}</small>
                                            </td>
                                            <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                                            <td>${daysLeft}</td>
                                            <td><span class="badge badge-${statusClass}">${status}</span></td>
                                            <td>${action}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadPurchaseOrders() {
        const orders = await this.fetchData('/api/purchase-order');
        const content = document.getElementById('tab-content');

        content.innerHTML = `
            <div class="card">
                <div class="card-header">Draft Purchase Order</div>
                <div class="card-body">
                    <button class="btn btn-primary" onclick="dashboard.printOrder()">Print Order</button>
                    <button class="btn btn-success" onclick="dashboard.exportOrder()">Export to CSV</button>
                    <div style="overflow-x: auto; margin-top: 20px;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>Reorder Qty</th>
                                    <th>EOQ</th>
                                    <th>Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => `
                                    <tr>
                                        <td>${order.product_name}</td>
                                        <td>${order.current_stock}</td>
                                        <td>${order.reorder_quantity}</td>
                                        <td>${order.eoq}</td>
                                        <td><span class="badge badge-${order.priority.toLowerCase()}">${order.priority}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadActions() {
        const content = document.getElementById('tab-content');

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">Record New Sale</div>
                        <div class="card-body">
                            <form id="saleForm">
                                <div class="form-group">
                                    <label>Product ID:</label>
                                    <input type="number" id="saleProductId" required>
                                    <div id="saleProductName" class="product-name-display" style="margin-top: 5px; font-weight: bold; color: var(--text-primary);"></div>
                                </div>
                                <div class="form-group">
                                    <label>Quantity Sold:</label>
                                    <input type="number" id="saleQuantity" required>
                                </div>                                <div class="form-group">
                                    <label>Revenue (Rs.):</label>
                                    <input type="text" id="saleRevenue" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Profit (Rs.):</label>
                                    <input type="text" id="saleProfit" readonly>
                                </div>                                <button type="submit" class="btn btn-success">Record Sale</button>
                            </form>
                            <div id="saleResult" style="margin-top: 15px;"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card" id="update-stock-card">
                        <div class="card-header">Update Stock Levels</div>
                        <div class="card-body">
                            <form id="stockForm">
                                <div class="form-group">
                                    <label>Product ID:</label>
                                    <input type="number" id="stockProductId" required>
                                    <div id="stockProductName" class="product-name-display" style="margin-top: 5px; font-weight: bold; color: var(--text-primary);"></div>
                                </div>
                                <div class="form-group">                                    <label>Order Cost per Unit (Rs.):</label>
                                    <input type="text" id="stockCost" readonly>
                                </div>
                                <div class="form-group">                                    <label>Quantity Change (+/-):</label>
                                    <input type="number" id="stockChange" required>
                                </div>
                                <div class="form-group">
                                    <label>Total Cost (Rs.):</label>
                                    <input type="number" id="stockTotalCost" step="0.01" min="0">
                                </div>
                                <button type="submit" class="btn btn-primary">Update Stock</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindActionForms();
    }

    bindActionForms() {
        // Event listeners for dynamic calculation
        let currentMrp = 0;
        let currentCost = 0;

        document.getElementById('saleProductId').addEventListener('change', async (e) => {
            const productId = parseInt(e.target.value);
            if (productId) {
                try {
                    const inventory = await this.fetchData('/api/inventory');
                    const product = inventory.find(p => p.product_id === productId);
                    if (product) {
                        currentMrp = product.mrp;
                        currentCost = product.order_cost_fixed;
                        const mrpEl = document.getElementById('saleMrp'); if (mrpEl) mrpEl.value = (currentMrp||0).toFixed ? (currentMrp).toFixed(2) : currentMrp;
                        // Calculate if quantity is already entered
                        const quantity = parseInt(document.getElementById('saleQuantity').value) || 0;
                        if (quantity > 0) {
                            this.updateSaleCalculations(quantity, currentMrp, currentCost);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching product:', error);
                }
            } else {
                currentMrp = 0;
                currentCost = 0;
                const mrpEl = document.getElementById('saleMrp'); if (mrpEl) mrpEl.value = '';
            }
            this.showProductName('saleProductId', 'saleProductName');
        });

        document.getElementById('saleQuantity').addEventListener('input', (e) => {
            const quantity = parseInt(e.target.value) || 0;
            if (currentMrp > 0 && quantity > 0) {
                this.updateSaleCalculations(quantity, currentMrp, currentCost);
            } else {
                document.getElementById('saleRevenue').value = '';
                document.getElementById('saleProfit').value = '';
            }
        });

        document.getElementById('stockProductId').addEventListener('change', async (e) => {
            const productId = parseInt(e.target.value);
            if (productId) {
                try {
                    const inventory = await this.fetchData('/api/inventory');
                    const product = inventory.find(p => p.product_id === productId);
                    if (product) {
                        document.getElementById('stockCost').value = product.order_cost_fixed;
                        // Calculate total cost if quantity is entered
                        const quantity = parseFloat(document.getElementById('stockChange').value) || 0;
                        const total = quantity * product.order_cost_fixed;
                        document.getElementById('stockTotalCost').value = total.toFixed(2);
                    }
                } catch (error) {
                    console.error('Error fetching product:', error);
                }
            } else {
                document.getElementById('stockCost').value = '';
                document.getElementById('stockTotalCost').value = '';
            }
            this.showProductName('stockProductId', 'stockProductName');
        });

        document.getElementById('stockChange').addEventListener('input', () => {
            const quantity = parseFloat(document.getElementById('stockChange').value) || 0;
            const cost = parseFloat(document.getElementById('stockCost').value) || 0;
            const total = quantity * cost;
            document.getElementById('stockTotalCost').value = total.toFixed(2);
        });

        document.getElementById('stockCost').addEventListener('input', () => {
            const quantity = parseFloat(document.getElementById('stockChange').value) || 0;
            const cost = parseFloat(document.getElementById('stockCost').value) || 0;
            const total = quantity * cost;
            document.getElementById('stockTotalCost').value = total.toFixed(2);
        });

        document.getElementById('saleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                product_id: parseInt(document.getElementById('saleProductId').value),
                quantity: parseInt(document.getElementById('saleQuantity').value)
            };

            try {
                const result = await this.postData('/api/record-sale', data);
                alert('Stock recorded successfully!');
                const resultDiv = document.getElementById('saleResult');
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Sale recorded successfully!</strong><br>
                        Revenue: Rs.${result.revenue}<br>
                        Profit: Rs.${result.profit}
                    </div>
                `;
                e.target.reset();
                document.getElementById('saleProductName').textContent = '';
                this.loadTab(this.currentTab); // Refresh current tab
            } catch (error) {
                const resultDiv = document.getElementById('saleResult');
                resultDiv.innerHTML = `<div class="alert alert-danger">Error recording sale: ${error.message}</div>`;
            }
        });

        document.getElementById('stockForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                product_id: parseInt(document.getElementById('stockProductId').value),
                quantity_change: parseInt(document.getElementById('stockChange').value),
                total_cost: parseFloat(document.getElementById('stockTotalCost').value) || 0
            };

            try {
                await this.postData('/api/update-stock', data);
                alert('Stock updated successfully!');
                e.target.reset();
                document.getElementById('stockProductName').textContent = '';
                document.getElementById('stockTotalCost').value = '';
                this.loadTab(this.currentTab); // Refresh current tab
            } catch (error) {
                alert('Error updating stock: ' + error.message);
            }
        });
    }

    // Helper methods
    async fetchData(url) {
        try {
            // alert("in fetch data_1")
            const response = await fetch(url);
            // alert("in fetch data_2")
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            // alert("in fetch data_3")
            return await response.json();
            
        } catch (error) {
            console.error('Fetch error for', url, ':', error);
            throw error;
        }
    }

    async postData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Post error for', url, ':', error);
            throw error;
        }
    }

    updateSaleCalculations(quantity, mrp, cost) {
        const revenue = quantity * mrp;
        const profit = quantity * (mrp - cost);
        document.getElementById('saleRevenue').value = revenue.toFixed(2);
        document.getElementById('saleProfit').value = profit.toFixed(2);
    }

    getStatusClass(item) {
        if (item.current_stock <= item.safety_stock_level) return 'status-critical';
        if (item.current_stock <= item.forecasted_demand) return 'status-warning';
        return 'status-optimal';
    }

    getStatusText(item) {
        if (item.current_stock <= item.safety_stock_level) return 'CRITICAL';
        if (item.current_stock <= item.forecasted_demand) return 'WARNING';
        return 'OPTIMAL';
    }

    renderAlertsSummary(advice, expiryAlerts) {
        const criticalCount = advice.filter(a => a.recommendation.includes('CRITICAL')).length;
        const expiryCount = Object.keys(expiryAlerts).length;

        return `
            <div class="alert alert-danger">
                <strong>${criticalCount}</strong> items need immediate reordering
            </div>
            <div class="alert alert-warning">
                <strong>${expiryCount}</strong> items expiring soon
            </div>
        `;
    }

    renderFastMoving(items) {
        return items.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${item.product_name}</span>
                <span class="badge badge-success">${item.quantity_sold} units</span>
            </div>
        `).join('');
    }

    renderSlowMoving(items) {
        return items.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${item.product_name}</span>
                <span class="badge badge-warning">${item.quantity_sold} units</span>
            </div>
        `).join('');
    }

    createStockChart(inventory) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    const labels = inventory.map(item =>
        item.product_name.length > 15
            ? item.product_name.substring(0, 15) + '...'
            : item.product_name
    );

    const data = inventory.map(item => item.current_stock);

    // 🔥 Detect dark mode
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const axisColor = isDark ? '#ffffff' : '#1a1a1a';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    // 🔥 Color bars based on stock condition
    const backgroundColors = inventory.map(item => {
        if (item.current_stock <= item.safety_stock_level) {
            return 'rgba(255, 71, 87, 0.9)';      // 🔴 Critical
        } else if (item.current_stock <= item.forecasted_demand) {
            return 'rgba(255, 170, 0, 0.9)';      // 🟠 Warning
        } else {
            return 'rgba(0, 255, 170, 0.9)';      // 🟢 Optimal
        }
    });

    const borderColors = inventory.map(item => {
        if (item.current_stock <= item.safety_stock_level * 0.5) {
            return 'rgba(255, 71, 87, 1)';
        } else if (item.current_stock <= item.safety_stock_level) {
            return 'rgba(255, 170, 0, 1)';
        } else {
            return 'rgba(0, 255, 170, 1)';
        }
    });

    if (this.charts.stock) {
        this.charts.stock.destroy();
    }

    this.charts.stock = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'OPTIMAL',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 10,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: axisColor,
                        font: { weight: '600' }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: axisColor,
                        font: { weight: '600' }
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: axisColor,
                        font: { weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
                    titleColor: isDark ? '#00ffcc' : '#000000',
                    bodyColor: isDark ? '#ffffff' : '#000000',
                    borderColor: '#00ffcc',
                    borderWidth: 1
                }
            }
        }
    });
}


    createSalesChart(salesData) {
        const ctx = document.getElementById('salesChart').getContext('2d');
        const labels = Object.keys(salesData.gross_revenue || {});

const grossRevenue = Object.values(salesData.gross_revenue || {});
const orderCost = Object.values(salesData.order_cost || {});
const totalProfit = Object.values(salesData.total_profit || {});
const marginOfRevenue = Object.values(salesData.margin_of_revenue || {});
const netProfit = Object.values(salesData.net_profit || {});

this.charts.sales = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [
            {
                label: 'Gross Revenue',
                data: grossRevenue,
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Order Cost',
                data: orderCost,
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Total Profit',
                data: totalProfit,
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Margin of Revenue',
                data: marginOfRevenue,
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Net Profit',
                data: netProfit,
                borderWidth: 4,
                tension: 0.4,
                yAxisID: 'y'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true
            }
        }
    }
});

    }

    // bindActionForms is implemented earlier (dynamic calculation version)

    async showProductName(inputId, displayId) {
        const productId = document.getElementById(inputId).value;
        const displayElement = document.getElementById(displayId);

        if (!productId) {
            displayElement.textContent = '';
            return;
        }

        try {
            const inventory = await this.fetchData('/api/inventory');
            const product = inventory.find(item => item.product_id == productId);

            if (product) {
                displayElement.textContent = `📦 ${product.product_name}`;
                displayElement.style.color = 'var(--btn-success)';
            } else {
                displayElement.textContent = '❌ Product not found';
                displayElement.style.color = 'var(--btn-danger)';
            }
        } catch (error) {
            displayElement.textContent = '⚠️ Error loading product';
            displayElement.style.color = 'var(--btn-warning)';
        }
    }

    async recordSale() {
        const productId = document.getElementById('saleProductId').value;
        const quantity = document.getElementById('saleQuantity').value;

        try {
            const response = await this.postData('/api/record-sale', {
                product_id: parseInt(productId),
                quantity_sold: parseInt(quantity)
            });

            alert('Sale recorded successfully!');
            if (this.currentView === 'history') this.showSalesHistory();
            const saleForm = document.getElementById('saleForm');
            if (saleForm) saleForm.reset();
            const saleResultDiv = document.getElementById('saleResult');
            if (saleResultDiv) saleResultDiv.innerHTML = '';
            const nameEl = document.getElementById('saleProductName'); if (nameEl) nameEl.textContent = '';
        } catch (error) {
            alert('Error recording sale: ' + error.message);
        }
    }

    async updateStock() {
        const productId = document.getElementById('stockProductId').value;
        const quantity = document.getElementById('stockChange').value;
        const orderCost = document.getElementById('stockCost').value;

        if (!productId || !quantity) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await this.postData('/api/update-stock', {
                product_id: parseInt(productId),
                quantity_added: parseInt(quantity),
                order_cost: parseFloat(orderCost)
            });

            alert('Stock updated successfully!');
            if (this.currentView === 'history') this.showSalesHistory();
            const stockForm = document.getElementById('stockForm'); if (stockForm) stockForm.reset();
            const stockNameEl = document.getElementById('stockProductName'); if (stockNameEl) stockNameEl.textContent = '';
        } catch (error) {
            alert('Error updating stock: ' + error.message);
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    printOrder() {
        window.print();
    }

    exportOrder() {
        // Simple CSV export
        const table = document.querySelector('.table');
        let csv = [];
        for (let row of table.rows) {
            let cols = [];
            for (let col of row.cells) {
                cols.push('"' + col.innerText + '"');
            }
            csv.push(cols.join(','));
        }
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'purchase_order.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    async showSalesHistory() {
        this.currentView = 'history';
        const salesHistory = await this.fetchData('/api/sales-history');
        // alert("hfhfh")
        const content = document.getElementById('tab-content');

        // Calculate summaries
        let grossRevenue = 0;
        let totalProfit = 0;
        let orderCost = 0;

        salesHistory.forEach(item => {
            if (item.type === 'sale') {
                grossRevenue += item.revenue;
                totalProfit += item.profit;
            } else if (item.type === 'purchase') {
                orderCost += Math.abs(item.revenue);
            }
        });

        const marginOfRevenue = grossRevenue - orderCost;
        const netProfit = grossRevenue - orderCost + totalProfit;

        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="btn btn-success" onclick="dashboard.loadSalesAnalysis()">Back to Sales Analysis</button>
            </div>
            <div class="row">

    <!-- Gross Revenue -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">Gross Revenue</div>
            <div class="card-body">
                <h3 class="text-success">Rs.${grossRevenue.toFixed(2)}</h3>
                <small style="color:gray;">
                    Formula: Quantity × MRP
                </small>
            </div>
        </div>
    </div>

    <!-- Total Order Cost -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">Total Order Cost</div>
            <div class="card-body">
                <h3 class="text-danger">Rs.${orderCost.toFixed(2)}</h3>
                <small style="color:gray;">
                    Formula: Σ Purchase Costs
                </small>
            </div>
        </div>
    </div>

    <!-- Total Profit -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">Total Profit</div>
            <div class="card-body">
                <h3 class="text-primary">Rs.${totalProfit.toFixed(2)}</h3>
                <small style="color:gray;">
                    Formula: Quantity × (MRP − Cost)
                </small>
            </div>
        </div>
    </div>

    <!-- Margin of Revenue (NEW) -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">Margin of Revenue</div>
            <div class="card-body">
                <h3 style="color:#ff8800;">Rs.${marginOfRevenue.toFixed(2)}</h3>
                <small style="color:gray;">
                    Formula: Gross Revenue − Order Cost
                </small>
            </div>
        </div>
    </div>

    <!-- Net Profit (RENAMED) -->
    <div class="col-md-3">
        <div class="card">
            <div class="card-header">Net Profit</div>
            <div class="card-body">
                <h3 style="color:#00aa44;">Rs.${netProfit.toFixed(2)}</h3>
                <small style="color:gray;">
                    Formula: Gross Revenue − Order Cost + Total Profit
                </small>
            </div>
        </div>
    </div>

</div>

            <div class="card">
                <div class="card-header">Transaction History</div>
                <div class="card-body">
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Quantity</th>
                                    <th>Revenue (Rs.)</th>
                                    <th>Profit (Rs.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${salesHistory.map(sale => `
                                    <tr>
                                        <td>${sale.product_name}</td>
                                        <td><span class="badge badge-${sale.type === 'sale' ? 'success' : 'info'}">${sale.type}</span></td>
                                        <td>${sale.sale_date}</td>
                                        <td>${sale.quantity_sold}</td>
                                        <td>Rs.${sale.revenue}</td>
                                        <td>Rs.${sale.profit}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    startRealTimeUpdates() {
        // Update every 30 seconds, but skip overview to prevent disruption
        setInterval(() => {
            if (this.currentTab !== 'overview') {
                this.loadTab(this.currentTab);
            }
        }, 30000);
    }

    showModal(modalType) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');

        if (modalType === 'recordSale') {
            modalBody.innerHTML = `
                <h3 style="color: var(--text-primary); margin-bottom: 12px;">Record Sale</h3>
                <form id="saleForm">
                    <div class="form-group">
                        <label>Product ID:</label>
                        <input type="number" id="saleProductId" required>
                        <div id="saleProductName" class="product-name-display" style="margin-top:6px;font-weight:600;color:var(--text-primary);"></div>
                    </div>
                    <div class="form-group">
                        <label>Quantity Sold:</label>
                        <input type="number" id="saleQuantity" required min="1">
                    </div>
                    <div class="form-group">
                        <label>MRP (Rs.):</label>
                        <input type="text" id="saleMrp" readonly>
                    </div>
                    <div class="form-group">
                        <label>Revenue (Rs.):</label>
                        <input type="text" id="saleRevenue" readonly>
                    </div>
                    <div class="form-group">
                        <label>Profit (Rs.):</label>
                        <input type="text" id="saleProfit" readonly>
                    </div>
                    <div id="saleResult"></div>
                    <div style="text-align:right;margin-top:10px;">
                        <button type="submit" class="btn btn-success">Record Sale</button>
                        <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()" style="margin-left:8px;">Cancel</button>
                    </div>
                </form>
            `;
        } else if (modalType === 'updateStock') {
            modalBody.innerHTML = `
                <h3 style="color: var(--text-primary); margin-bottom: 12px;">Update Stock</h3>
                <form id="stockForm">
                    <div class="form-group">
                        <label>Product ID:</label>
                        <input type="number" id="stockProductId" required>
                        <div id="stockProductName" class="product-name-display" style="margin-top:6px;font-weight:600;color:var(--text-primary);"></div>
                    </div>
                    <div class="form-group">
                        <label>Quantity to Add:</label>
                        <input type="number" id="stockChange" required min="1">
                    </div>
                    <div class="form-group">
                        <label>Total Cost (Rs.):</label>
                        <input type="number" id="stockTotalCost" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label>Order Cost (Rs.):</label>
                        <input type="number" id="stockCost" step="0.01" required min="0">
                    </div>
                    <div style="text-align:right;margin-top:10px;">
                        <button type="submit" class="btn btn-primary">Update Stock</button>
                        <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()" style="margin-left:8px;">Cancel</button>
                    </div>
                </form>
            `;
        } else {
            modalBody.innerHTML = `<div>Unknown modal type: ${modalType}</div>`;
        }

        modal.style.display = 'block';

        // Bind form handlers after rendering
        setTimeout(() => this.bindActionForms(), 50);
    }
    async deleteProduct(productId) {
        if (confirm(`Are you sure you want to delete product ${productId}? This action cannot be undone.`)) {
            try {
                const response = await this.postData('/api/delete-product', { product_id: productId });
                alert('Product deleted successfully!');
                this.loadTab('inventory'); // Refresh the inventory tab
            } catch (error) {
                alert('Error deleting product: ' + error.message);
            }
        }
    }

    showAddProductModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = `
            <h3 style="color: var(--text-primary); margin-bottom: 20px;">Add New Product</h3>
            <form id="addProductForm">
                <div class="form-group">
                    <label>Product Name:</label>
                    <input type="text" id="newProductName" required>
                </div>
                <div class="form-group">
                    <label>Current Stock:</label>
                    <input type="number" id="newCurrentStock" required>
                </div>
                <div class="form-group">
                    <label>Safety Stock Level:</label>
                    <input type="number" id="newSafetyStock" required>
                </div>
                <div class="form-group">
                    <label>Forecasted Demand:</label>
                    <input type="number" id="newForecastedDemand" required>
                </div>
                <div class="form-group">
                    <label>Lead Time (days):</label>
                    <input type="number" id="newLeadTime" required>
                </div>
                <div class="form-group">
                    <label>Annual Demand:</label>
                    <input type="number" id="newAnnualDemand" required>
                </div>
                <div class="form-group">
                    <label>Order Cost Fixed (Rs.):</label>
                    <input type="number" step="0.01" id="newOrderCost" required>
                </div>
                <div class="form-group">
                    <label>Holding Cost per Unit (Rs.):</label>
                    <input type="number" step="0.01" id="newHoldingCost" required>
                </div>
                <div class="form-group">
                    <label>Expiry Date:</label>
                    <input type="date" id="newExpiryDate" required>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button type="submit" class="btn btn-success" style="margin-right: 10px;">Add Product</button>
                    <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()">Cancel</button>
                </div>
            </form>
        `;
        
        modal.style.display = 'block';
        
        // Bind form submission after modal is displayed
        setTimeout(() => {
            const form = document.getElementById('addProductForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.addNewProduct();
                });
            }
        }, 100);
    }

    async addNewProduct() {
        const productData = {
            product_name: document.getElementById('newProductName').value,
            current_stock: parseInt(document.getElementById('newCurrentStock').value),
            safety_stock_level: parseInt(document.getElementById('newSafetyStock').value),
            forecasted_demand: parseInt(document.getElementById('newForecastedDemand').value),
            lead_time_days: parseInt(document.getElementById('newLeadTime').value),
            annual_demand: parseInt(document.getElementById('newAnnualDemand').value),
            order_cost_fixed: parseFloat(document.getElementById('newOrderCost').value),
            holding_cost_per_unit: parseFloat(document.getElementById('newHoldingCost').value),
            expiry_date: document.getElementById('newExpiryDate').value
        };
        
        try {
            const response = await this.postData('/api/add-product', productData);
            alert('Product added successfully!');
            this.closeModal();
            this.loadTab('inventory'); // Refresh the inventory tab
        } catch (error) {
            alert('Error adding product: ' + error.message);
        }
    }
}
    async function logoutUser() {
    try {
        await fetch('/logout', {
            method: 'GET',
            credentials: 'include'
        });

        window.location.href = "/login";
    } catch (error) {
        console.error("Logout error:", error);
    }
}
    



// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new InventoryDashboard();
});