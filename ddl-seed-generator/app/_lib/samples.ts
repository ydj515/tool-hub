import type { Dialect } from "@/lib/types";

const SAMPLE_DDL_BASIC = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  status VARCHAR(20) CHECK (status IN ('active', 'pending', 'disabled')),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_code VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_id BIGINT REFERENCES orders(id),
  parent_comment_id BIGINT REFERENCES comments(id),
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL
);`;

const SAMPLE_DDL_SCHEMA = `CREATE TABLE public."users" (
  "id" BIGINT PRIMARY KEY,
  "name" VARCHAR(80) NOT NULL,
  "email" VARCHAR(120) NOT NULL UNIQUE,
  "phone" VARCHAR(30),
  "status" VARCHAR(20) CHECK (status IN ('active', 'pending', 'disabled')),
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE public."orders" (
  "id" BIGINT PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "order_code" VARCHAR(40) NOT NULL UNIQUE,
  "amount" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE public."order_items" (
  "id" BIGINT PRIMARY KEY,
  "order_id" BIGINT NOT NULL,
  "product_name" VARCHAR(120) NOT NULL,
  "quantity" INT NOT NULL,
  "unit_price" DECIMAL(10, 2) NOT NULL
);

ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_users"
  FOREIGN KEY ("user_id")
  REFERENCES public."users"("id");

ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_orders"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders"("id");`;

const SAMPLE_DDL_ADVANCED = `CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.10,
  price_with_tax DECIMAL(10, 2) GENERATED ALWAYS AS (price * (1 + tax_rate)) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  reviewer_name VARCHAR(80) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);`;

const SAMPLE_DDL_MYSQL = `CREATE TABLE \`users\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(80) NOT NULL,
  \`email\` VARCHAR(120) NOT NULL UNIQUE,
  \`phone\` VARCHAR(30),
  \`status\` ENUM('active', 'pending', 'disabled') NOT NULL DEFAULT 'active',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE \`orders\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` BIGINT NOT NULL,
  \`order_code\` VARCHAR(40) NOT NULL UNIQUE,
  \`amount\` DECIMAL(12, 2) NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
);

CREATE TABLE \`order_items\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`order_id\` BIGINT NOT NULL,
  \`product_name\` VARCHAR(120) NOT NULL,
  \`quantity\` INT NOT NULL,
  \`unit_price\` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`)
);`;

const SAMPLE_DDL_H2 = `CREATE TABLE users (
  id IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);`;

const SAMPLE_PRESETS: Record<string, string> = {
  basic: SAMPLE_DDL_BASIC,
  schema: SAMPLE_DDL_SCHEMA,
  advanced: SAMPLE_DDL_ADVANCED,
  mysql: SAMPLE_DDL_MYSQL,
  h2: SAMPLE_DDL_H2,
};

const SAMPLE_PRESET_DIALECTS: Record<string, Dialect> = {
  basic: "postgresql",
  schema: "postgresql",
  advanced: "postgresql",
  mysql: "mysql",
  h2: "h2",
};

const DIALECT_LABELS: Record<Dialect, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  h2: "H2",
};

export {
  SAMPLE_DDL_BASIC,
  SAMPLE_PRESETS,
  SAMPLE_PRESET_DIALECTS,
  DIALECT_LABELS,
};
