-- Create test tables in the customer database
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `role` VARCHAR(50) DEFAULT 'user',
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Seed initial data
INSERT INTO `users` (`name`, `email`, `role`, `status`) VALUES
('Alice Smith', 'alice@example.com', 'admin', 'active'),
('Bob Johnson', 'bob@example.com', 'member', 'active'),
('Charlie Brown', 'charlie@example.com', 'member', 'suspended'),
('David Miller', 'david@example.com', 'member', 'active'),
('Emma Wilson', 'emma@example.com', 'member', 'active');

INSERT INTO `products` (`sku`, `name`, `price`, `stock`, `category`) VALUES
('PROD-001', 'Premium Wireless Headphones', 129.99, 45, 'Electronics'),
('PROD-002', 'Ergonomic Office Chair', 249.50, 12, 'Furniture'),
('PROD-003', 'Mechanical Keyboard', 89.00, 30, 'Electronics'),
('PROD-004', 'Stainless Steel Water Bottle', 24.99, 150, 'Kitchenware'),
('PROD-005', 'Yoga Mat Ultra', 39.95, 75, 'Fitness');

INSERT INTO `orders` (`user_id`, `total_amount`, `status`) VALUES
(1, 129.99, 'completed'),
(2, 338.50, 'completed'),
(3, 24.99, 'cancelled'),
(4, 89.00, 'pending'),
(5, 154.94, 'completed');
