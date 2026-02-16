CREATE DATABASE IF NOT EXISTS WarehouseDB_2;
USE WarehouseDB_2;

CREATE TABLE users (
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);
-- drop table users;

CREATE TABLE inventory (
    product_id INT auto_increment PRIMARY KEY,
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

ALTER TABLE inventory
ADD COLUMN user_id INT NOT NULL;

ALTER TABLE inventory
ADD CONSTRAINT fk_inventory_user
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

CREATE TABLE sales_history (
    product_id INT AUTO_INCREMENT,
    user_id INT NOT NULL,
    sale_date DATE,
    quantity_sold INT,
    revenue DECIMAL(10,2),
    profit DECIMAL(10,2),
    type VARCHAR(20),
    FOREIGN KEY (product_id) REFERENCES inventory(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ALTER TABLE sales_history
-- ADD COLUMN user_id INT NOT NULL unique;

-- ALTER TABLE sales_history
-- ADD CONSTRAINT fk_sales_user
-- FOREIGN KEY (user_id)
-- REFERENCES users(user_id)
-- ON DELETE CASCADE;

select * from users;
select * from inventory;
select * from sales_history;
-- DESCRIBE sales_history;
-- ALTER TABLE sales_history
-- ADD COLUMN profit DECIMAL(10,2) DEFAULT 0;

-- drop table sales_history;


-- ALTER TABLE inventory DROP INDEX user_id;

-- drop database warehousedb_2;




