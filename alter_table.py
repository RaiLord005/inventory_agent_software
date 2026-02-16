import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='Railord@2005', database='WarehouseDB')
cursor = conn.cursor()
cursor.execute('ALTER TABLE sales_history ADD COLUMN profit DECIMAL(10,2) DEFAULT 0')
cursor.execute("ALTER TABLE sales_history ADD COLUMN type VARCHAR(10) DEFAULT 'sale'")
conn.commit()
conn.close()
print('Columns added successfully')