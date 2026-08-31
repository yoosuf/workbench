-- Create sample ecommerce schema in SQL Server target
IF OBJECT_ID('dbo.categories', 'U') IS NULL
CREATE TABLE dbo.categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    slug NVARCHAR(120) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.customers', 'U') IS NULL
CREATE TABLE dbo.customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    phone NVARCHAR(30),
    is_active BIT DEFAULT 1,
    metadata NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.products', 'U') IS NULL
CREATE TABLE dbo.products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NULL REFERENCES dbo.categories(id) ON DELETE SET NULL,
    sku NVARCHAR(64) NOT NULL UNIQUE,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    is_published BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.orders', 'U') IS NULL
CREATE TABLE dbo.orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES dbo.customers(id) ON DELETE CASCADE,
    order_number NVARCHAR(64) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status NVARCHAR(32) NOT NULL DEFAULT 'PENDING',
    shipping_address NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.order_items', 'U') IS NULL
CREATE TABLE dbo.order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL REFERENCES dbo.orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES dbo.products(id) ON DELETE NO ACTION,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

IF OBJECT_ID('dbo.reviews', 'U') IS NULL
CREATE TABLE dbo.reviews (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES dbo.customers(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_category_id')
CREATE INDEX idx_products_category_id ON dbo.products(category_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orders_customer_id')
CREATE INDEX idx_orders_customer_id ON dbo.orders(customer_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_order_items_order_id')
CREATE INDEX idx_order_items_order_id ON dbo.order_items(order_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_order_items_product_id')
CREATE INDEX idx_order_items_product_id ON dbo.order_items(product_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reviews_product_id')
CREATE INDEX idx_reviews_product_id ON dbo.reviews(product_id);

-- Insert sample records (idempotent: only seed on first run)
IF NOT EXISTS (SELECT 1 FROM dbo.categories)
BEGIN
    INSERT INTO dbo.categories (name, slug, description) VALUES
    (N'Laptops & Computers', N'laptops-computers', N'High performance desktop and portable computing hardware'),
    (N'Keyboards & Mice', N'keyboards-mice', N'Mechanical keyboards and precision pointing devices'),
    (N'Monitors & Displays', N'monitors-displays', N'4K UHD and ultra-wide gaming and productivity displays');

    INSERT INTO dbo.customers (first_name, last_name, email, phone, is_active, metadata) VALUES
    (N'Alex', N'Mercer', N'alex.mercer@example.com', N'+1-555-0199', 1, N'{"tier": "gold", "pref_dark_mode": true}'),
    (N'Elena', N'Rostova', N'elena.rostova@example.com', N'+1-555-0248', 1, N'{"tier": "platinum", "credit_limit": 5000}'),
    (N'Liam', N'Chen', N'liam.chen@example.com', N'+1-555-0382', 0, N'{"tier": "standard"}');

    INSERT INTO dbo.products (category_id, sku, name, description, price, stock_quantity, is_published) VALUES
    (1, N'MBP-M3-MAX', N'MacBook Pro 16" M3 Max', N'16-inch liquid retina XDR, 64GB RAM, 2TB SSD', 3499.00, 15, 1),
    (2, N'KEY-CUSTOM-01', N'Ergonomic Split Mechanical Keyboard', N'Gateron Oil King switches, hot-swappable PCB', 249.99, 45, 1),
    (3, N'MON-4K-OLED', N'32" 4K OLED HDR Pro Monitor', N'3840x2160, 240Hz, 0.03ms response time', 1199.95, 20, 1);

    INSERT INTO dbo.orders (customer_id, order_number, total_amount, status, shipping_address) VALUES
    (1, N'ORD-2026-1001', 3748.99, N'DELIVERED', N'{"city": "San Francisco", "state": "CA", "zip": "94105"}'),
    (2, N'ORD-2026-1002', 1199.95, N'PROCESSING', N'{"city": "Austin", "state": "TX", "zip": "78701"}');

    INSERT INTO dbo.order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 1, 3499.00),
    (1, 2, 1, 249.99),
    (2, 3, 1, 1199.95);

    INSERT INTO dbo.reviews (product_id, customer_id, rating, comment) VALUES
    (1, 1, 5, N'Exceptional build quality and battery life for heavy database workloads.'),
    (2, 1, 4, N'Great tactile feel and thumb cluster ergonomic design.');
END
