CREATE DATABASE IF NOT EXISTS WarehouseDB;
USE WarehouseDB;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS inventory;

CREATE TABLE inventory (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    current_stock INT,
    safety_stock_level INT,
    forecasted_demand INT,
    lead_time_days INT,
    annual_demand INT,
    order_cost_fixed DECIMAL(10,2), -- Cost to place one order (shipping, admin)
    holding_cost_per_unit DECIMAL(10,2), -- Cost to store one unit for a year
    expiry_date DATE -- For expiry monitoring
);

-- Sales history table for sales analysis
CREATE TABLE sales_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    sale_date DATE,
    quantity_sold INT,
    revenue DECIMAL(10,2),
    FOREIGN KEY (product_id) REFERENCES inventory(product_id)
);

-- Sample Data for your Agent to analyze

INSERT INTO inventory
(product_id, product_name, current_stock, safety_stock_level, forecasted_demand, lead_time_days, annual_demand, order_cost_fixed, holding_cost_per_unit, expiry_date)
VALUES
(1, 'Warm White Wall Paint', 45, 20, 100, 5, 1200, 50.00, 3.00, '2026-08-15'),    -- Healthy
(2, 'Slate Grey External Paint', 8, 15, 60, 7, 500, 45.00, 3.00, '2026-07-20'),   -- 🔴 Critical Low
(3, 'Natural Oak Flooring', 150, 100, 300, 14, 2400, 150.00, 0.50, '2027-01-10'), -- High Order Cost
(4, 'Polished Brass Handle', 12, 25, 50, 10, 400, 25.00, 1.20, '2026-09-05'),     -- 🔴 Critical Low
(5, 'Smart Light Switch', 18, 15, 40, 3, 300, 30.00, 2.00, '2027-03-12'),         -- 🟡 Medium Warning
(6, 'Copper Extension Wire', 60, 20, 100, 4, 800, 40.00, 4.50, '2026-11-30'),     -- Healthy
(7, 'Eco-Friendly Primer', 22, 20, 50, 5, 600, 40.00, 2.50, '2026-06-25'),        -- 🟡 Medium Warning
(8, 'Zinc Screws (500pk)', 15, 40, 500, 2, 5000, 10.00, 0.10, '2027-05-18'),      -- 🔴 Critical / High Demand
(9, 'Luxury Vinyl Tiles', 500, 100, 200, 21, 1800, 150.00, 0.40, '2027-12-01'),   -- Overstocked
(10, 'Stainless Steel Hinge', 35, 30, 80, 6, 1200, 20.00, 0.80, '2026-10-14');    -- 🟡 Medium Warning

-- Sample sales history data
INSERT INTO sales_history (product_id, sale_date, quantity_sold, revenue) VALUES
(1, '2026-01-01', 10, 150.00),
(1, '2026-01-02', 5, 75.00),
(2, '2026-01-01', 3, 45.00),
(3, '2026-01-01', 20, 300.00),
(4, '2026-01-01', 2, 30.00),
(5, '2026-01-01', 8, 120.00),
(6, '2026-01-01', 15, 225.00),
(7, '2026-01-01', 7, 105.00),
(8, '2026-01-01', 50, 750.00),
(9, '2026-01-01', 25, 375.00),
(10, '2026-01-01', 12, 180.00),
-- Add more sample data for analysis
(1, '2026-02-01', 12, 180.00),
(2, '2026-02-01', 4, 60.00),
(3, '2026-02-01', 18, 270.00),
(4, '2026-02-01', 3, 45.00),
(5, '2026-02-01', 6, 90.00),
(6, '2026-02-01', 14, 210.00),
(7, '2026-02-01', 9, 135.00),
(8, '2026-02-01', 45, 675.00),
(9, '2026-02-01', 22, 330.00),
(10, '2026-02-01', 10, 150.00);

ALTER TABLE inventory
MODIFY product_id INT AUTO_INCREMENT;

ALTER TABLE sales_history
DROP FOREIGN KEY sales_history_ibfk_1;

ALTER TABLE inventory
MODIFY product_id INT NOT NULL AUTO_INCREMENT;

ALTER TABLE inventory
ADD PRIMARY KEY (product_id);

ALTER TABLE sales_history
ADD CONSTRAINT sales_history_ibfk_1
FOREIGN KEY (product_id)
REFERENCES inventory(product_id)
ON DELETE CASCADE;

select * from inventory;



