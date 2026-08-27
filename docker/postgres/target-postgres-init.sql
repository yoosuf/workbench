-- Create sample ecommerce schema in Postgres target
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    shipping_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);

-- Insert sample records
INSERT INTO categories (name, slug, description) VALUES
('Laptops & Computers', 'laptops-computers', 'High performance desktop and portable computing hardware'),
('Keyboards & Mice', 'keyboards-mice', 'Mechanical keyboards and precision pointing devices'),
('Monitors & Displays', 'monitors-displays', '4K UHD and ultra-wide gaming and productivity displays');

INSERT INTO customers (first_name, last_name, email, phone, is_active, metadata) VALUES
('Alex', 'Mercer', 'alex.mercer@example.com', '+1-555-0199', true, '{"tier": "gold", "pref_dark_mode": true}'),
('Elena', 'Rostova', 'elena.rostova@example.com', '+1-555-0248', true, '{"tier": "platinum", "credit_limit": 5000}'),
('Liam', 'Chen', 'liam.chen@example.com', '+1-555-0382', false, '{"tier": "standard"}');

INSERT INTO products (category_id, sku, name, description, price, stock_quantity, is_published) VALUES
(1, 'MBP-M3-MAX', 'MacBook Pro 16" M3 Max', '16-inch liquid retina XDR, 64GB RAM, 2TB SSD', 3499.00, 15, true),
(2, 'KEY-CUSTOM-01', 'Ergonomic Split Mechanical Keyboard', 'Gateron Oil King switches, hot-swappable PCB', 249.99, 45, true),
(3, 'MON-4K-OLED', '32" 4K OLED HDR Pro Monitor', '3840x2160, 240Hz, 0.03ms response time', 1199.95, 20, true);

INSERT INTO orders (customer_id, order_number, total_amount, status, shipping_address) VALUES
(1, 'ORD-2026-1001', 3748.99, 'DELIVERED', '{"city": "San Francisco", "state": "CA", "zip": "94105"}'),
(2, 'ORD-2026-1002', 1199.95, 'PROCESSING', '{"city": "Austin", "state": "TX", "zip": "78701"}');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 3499.00),
(1, 2, 1, 249.99),
(2, 3, 1, 1199.95);

INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES
(1, 1, 5, 'Exceptional build quality and battery life for heavy database workloads.'),
(2, 1, 4, 'Great tactile feel and thumb cluster ergonomic design.');
