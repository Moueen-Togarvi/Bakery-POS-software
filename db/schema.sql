create table if not exists categories (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  category_id integer not null references categories(id) on delete restrict,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sales_orders (
  id serial primary key,
  order_no text not null unique,
  customer_name text not null default 'Walk-in Customer',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_order_items (
  id serial primary key,
  order_id integer not null references sales_orders(id) on delete cascade,
  product_id integer not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) not null check (line_total >= 0)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_sales_orders_updated_at on sales_orders;
create trigger set_sales_orders_updated_at
before update on sales_orders
for each row execute function set_updated_at();
