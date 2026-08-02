-- Vevntas — esquema recuperado del proyecto Supabase keivwlssgyelmvjgqayq.
-- No contiene datos operativos ni credenciales.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  currency_primary text not null default 'USD' check (currency_primary = 'USD'),
  currency_secondary text not null default 'VES' check (currency_secondary = 'VES'),
  exchange_rate_source text not null default 'BCV',
  allow_negative_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  role text not null check (role in ('admin','cashier','stock')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 1 and 60),
  barcode text check (barcode is null or char_length(trim(barcode)) > 0),
  name text not null check (char_length(trim(name)) between 2 and 180),
  category text,
  unit text not null default 'UNIDAD' check (char_length(trim(unit)) between 1 and 30),
  sale_price_usd numeric(18,2) not null check (sale_price_usd >= 0),
  stock_quantity numeric(18,3) not null default 0,
  minimum_stock numeric(18,3) not null default 0 check (minimum_stock >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_store_code_unique unique (store_id, code),
  constraint products_store_barcode_unique unique (store_id, barcode)
);

create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  purchase_price_usd numeric(18,2) not null default 0 check (purchase_price_usd >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  base_currency text not null default 'USD' check (base_currency = 'USD'),
  quote_currency text not null default 'VES' check (quote_currency = 'VES'),
  rate numeric(18,6) not null check (rate > 0),
  source text not null,
  reference_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  is_manual boolean not null default false,
  created_by uuid references auth.users(id) on delete set null
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number bigint generated always as identity,
  store_id uuid not null references public.stores(id) on delete restrict,
  status text not null default 'completed' check (status in ('completed','cancelled')),
  exchange_rate numeric(18,6) not null check (exchange_rate > 0),
  total_usd numeric(18,2) not null default 0 check (total_usd >= 0),
  total_ves numeric(18,2) not null default 0 check (total_ves >= 0),
  notes text,
  sold_by uuid not null references auth.users(id) on delete restrict,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_code text not null,
  product_name text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit_price_usd numeric(18,2) not null check (unit_price_usd >= 0),
  unit_price_ves numeric(18,2) not null check (unit_price_ves >= 0),
  line_total_usd numeric(18,2) not null check (line_total_usd >= 0),
  line_total_ves numeric(18,2) not null check (line_total_ves >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  method text not null check (method in ('cash','mobile_payment','transfer','card','other')),
  currency text not null check (currency in ('USD','VES')),
  amount numeric(18,2) not null check (amount > 0),
  amount_usd numeric(18,2) not null check (amount_usd > 0),
  reference text,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('initial','sale','sale_cancel','entry','adjustment')),
  quantity_delta numeric(18,3) not null check (quantity_delta <> 0),
  balance_before numeric(18,3) not null,
  balance_after numeric(18,3) not null,
  reason text not null check (char_length(trim(reason)) between 2 and 300),
  sale_id uuid references public.sales(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  file_name text not null,
  status text not null check (status in ('processing','completed','failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  update_stock boolean not null default false,
  imported_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.import_errors (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  field_name text,
  message text not null,
  raw_data jsonb not null default '{}'::jsonb
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_store_idx on public.profiles(store_id);
create index products_store_active_idx on public.products(store_id, active);
create index products_store_name_trgm_idx on public.products using gin(name extensions.gin_trgm_ops);
create index products_created_by_idx on public.products(created_by);
create index products_updated_by_idx on public.products(updated_by);
create index product_costs_store_idx on public.product_costs(store_id);
create index product_costs_updated_by_idx on public.product_costs(updated_by);
create index exchange_rates_latest_idx on public.exchange_rates(store_id, reference_at desc, fetched_at desc);
create index exchange_rates_created_by_idx on public.exchange_rates(created_by);
create index sales_store_created_idx on public.sales(store_id, created_at desc);
create index sales_sold_by_idx on public.sales(sold_by);
create index sales_cancelled_by_idx on public.sales(cancelled_by);
create index sale_items_sale_idx on public.sale_items(sale_id);
create index sale_items_store_idx on public.sale_items(store_id);
create index sale_items_product_idx on public.sale_items(product_id);
create index payments_sale_idx on public.payments(sale_id);
create index payments_store_idx on public.payments(store_id);
create index stock_movements_store_created_idx on public.stock_movements(store_id, created_at desc);
create index stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);
create index stock_movements_sale_idx on public.stock_movements(sale_id);
create index stock_movements_created_by_idx on public.stock_movements(created_by);
create index import_batches_store_idx on public.import_batches(store_id);
create index import_batches_imported_by_idx on public.import_batches(imported_by);
create index import_errors_batch_idx on public.import_errors(batch_id);
create index import_errors_store_idx on public.import_errors(store_id);
create index audit_logs_store_idx on public.audit_logs(store_id);
create index audit_logs_user_idx on public.audit_logs(user_id);

create or replace view public.current_exchange_rates
with (security_invoker = true)
as
select distinct on (store_id)
  id, store_id, base_currency, quote_currency, rate, source,
  reference_at, fetched_at, is_manual
from public.exchange_rates
order by store_id, reference_at desc, fetched_at desc;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.has_store_role(p_store_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.store_id = p_store_id
      and p.active
      and (p_roles is null or p.role = any(p_roles))
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_store_id uuid;
  target_role text;
  target_name text;
  target_store_name text;
begin
  target_store_id := nullif(new.raw_app_meta_data ->> 'store_id', '')::uuid;
  target_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'admin');
  target_name := coalesce(
    nullif(new.raw_app_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, 'Usuario'), '@', 1)
  );
  target_store_name := coalesce(
    nullif(new.raw_app_meta_data ->> 'store_name', ''),
    nullif(new.raw_user_meta_data ->> 'store_name', ''),
    'Mi tienda'
  );

  if target_store_id is null then
    insert into public.stores(name) values (target_store_name)
    returning id into target_store_id;
    target_role := 'admin';
  end if;

  if target_role not in ('admin','cashier','stock') then
    raise exception 'Invalid application role';
  end if;

  insert into public.profiles(id, store_id, full_name, role)
  values (new.id, target_store_id, target_name, target_role);
  return new;
end;
$$;

create trigger stores_set_updated_at before update on public.stores
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();
create trigger product_costs_set_updated_at before update on public.product_costs
for each row execute function private.set_updated_at();
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.upsert_product(
  p_store_id uuid,
  p_code text,
  p_name text,
  p_sale_price_usd numeric,
  p_purchase_price_usd numeric,
  p_barcode text default null,
  p_category text default null,
  p_unit text default 'UNIDAD',
  p_minimum_stock numeric default 0,
  p_stock_quantity numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_record public.products%rowtype;
  previous_stock numeric(18,3);
  target_product_id uuid;
begin
  if (select auth.uid()) is null or not private.has_store_role(p_store_id, array['admin','stock']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if trim(coalesce(p_code,'')) = '' or trim(coalesce(p_name,'')) = '' then
    raise exception 'Code and name are required' using errcode = '22023';
  end if;
  if p_sale_price_usd < 0 or p_purchase_price_usd < 0 or p_minimum_stock < 0 then
    raise exception 'Prices and minimum stock cannot be negative' using errcode = '22023';
  end if;
  if p_stock_quantity is not null and p_stock_quantity < 0 then
    raise exception 'Stock cannot be negative' using errcode = '22023';
  end if;

  select * into product_record from public.products
  where store_id = p_store_id and code = trim(p_code) for update;

  if found then
    previous_stock := product_record.stock_quantity;
    update public.products set
      name = trim(p_name),
      barcode = nullif(trim(coalesce(p_barcode,'')),''),
      category = nullif(trim(coalesce(p_category,'')),''),
      unit = upper(trim(coalesce(p_unit,'UNIDAD'))),
      sale_price_usd = p_sale_price_usd,
      minimum_stock = p_minimum_stock,
      stock_quantity = coalesce(p_stock_quantity, stock_quantity),
      updated_by = (select auth.uid())
    where id = product_record.id returning id into target_product_id;
  else
    previous_stock := 0;
    insert into public.products(
      store_id,code,barcode,name,category,unit,sale_price_usd,
      stock_quantity,minimum_stock,created_by,updated_by
    ) values (
      p_store_id,trim(p_code),nullif(trim(coalesce(p_barcode,'')),''),trim(p_name),
      nullif(trim(coalesce(p_category,'')),''),upper(trim(coalesce(p_unit,'UNIDAD'))),
      p_sale_price_usd,coalesce(p_stock_quantity,0),p_minimum_stock,
      (select auth.uid()),(select auth.uid())
    ) returning id into target_product_id;
  end if;

  insert into public.product_costs(product_id,store_id,purchase_price_usd,updated_by)
  values (target_product_id,p_store_id,p_purchase_price_usd,(select auth.uid()))
  on conflict (product_id) do update set
    purchase_price_usd = excluded.purchase_price_usd,
    updated_by = excluded.updated_by,
    updated_at = now();

  if p_stock_quantity is not null and p_stock_quantity <> previous_stock then
    insert into public.stock_movements(
      store_id,product_id,movement_type,quantity_delta,balance_before,
      balance_after,reason,created_by
    ) values (
      p_store_id,target_product_id,
      case when product_record.id is null then 'initial' else 'adjustment' end,
      p_stock_quantity - previous_stock,previous_stock,p_stock_quantity,
      case when product_record.id is null then 'Saldo inicial del producto' else 'Actualización de existencia' end,
      (select auth.uid())
    );
  end if;

  insert into public.audit_logs(store_id,user_id,action,entity_type,entity_id)
  values (p_store_id,(select auth.uid()),'product_upserted','product',target_product_id::text);
  return target_product_id;
end;
$$;

create or replace function public.adjust_stock(
  p_store_id uuid,
  p_product_id uuid,
  p_quantity_delta numeric,
  p_reason text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_stock numeric(18,3);
  new_stock numeric(18,3);
  allow_negative boolean;
begin
  if (select auth.uid()) is null or not private.has_store_role(p_store_id,array['admin','stock']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_quantity_delta = 0 or char_length(trim(coalesce(p_reason,''))) < 2 then
    raise exception 'Quantity and reason are required' using errcode = '22023';
  end if;

  select stock_quantity into current_stock from public.products
  where id = p_product_id and store_id = p_store_id and active for update;
  if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;

  select allow_negative_stock into allow_negative from public.stores where id = p_store_id;
  new_stock := current_stock + p_quantity_delta;
  if new_stock < 0 and not allow_negative then
    raise exception 'Insufficient stock' using errcode = '23514';
  end if;

  update public.products set stock_quantity = new_stock, updated_by = (select auth.uid())
  where id = p_product_id;
  insert into public.stock_movements(
    store_id,product_id,movement_type,quantity_delta,balance_before,balance_after,reason,created_by
  ) values (
    p_store_id,p_product_id,case when p_quantity_delta > 0 then 'entry' else 'adjustment' end,
    p_quantity_delta,current_stock,new_stock,trim(p_reason),(select auth.uid())
  );
  return new_stock;
end;
$$;

create or replace function public.register_sale(
  p_store_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale_id uuid;
  rate_value numeric(18,6);
  total_usd_value numeric(18,2) := 0;
  total_ves_value numeric(18,2) := 0;
  paid_usd_value numeric(18,2) := 0;
  item jsonb;
  payment jsonb;
  product_record public.products%rowtype;
  quantity_value numeric(18,3);
  line_usd numeric(18,2);
  line_ves numeric(18,2);
  payment_amount numeric(18,2);
  payment_usd numeric(18,2);
begin
  if (select auth.uid()) is null or not private.has_store_role(p_store_id,array['admin','cashier']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale requires at least one item' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception 'Sale requires at least one payment' using errcode = '22023';
  end if;

  select rate into rate_value from public.exchange_rates
  where store_id = p_store_id order by reference_at desc,fetched_at desc limit 1;
  if rate_value is null then raise exception 'No exchange rate configured' using errcode = 'P0002'; end if;

  insert into public.sales(store_id,exchange_rate,notes,sold_by)
  values (p_store_id,rate_value,nullif(trim(coalesce(p_notes,'')),''),(select auth.uid()))
  returning id into sale_id;

  for item in select value from jsonb_array_elements(p_items) loop
    quantity_value := (item ->> 'quantity')::numeric;
    if quantity_value is null or quantity_value <= 0 then
      raise exception 'Invalid item quantity' using errcode = '22023';
    end if;

    select * into product_record from public.products
    where id = (item ->> 'product_id')::uuid and store_id = p_store_id and active for update;
    if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;
    if product_record.stock_quantity < quantity_value then
      raise exception 'Insufficient stock for product %', product_record.code using errcode = '23514';
    end if;

    line_usd := round(product_record.sale_price_usd * quantity_value,2);
    line_ves := round(line_usd * rate_value,2);
    total_usd_value := total_usd_value + line_usd;
    total_ves_value := total_ves_value + line_ves;

    insert into public.sale_items(
      sale_id,store_id,product_id,product_code,product_name,quantity,
      unit_price_usd,unit_price_ves,line_total_usd,line_total_ves
    ) values (
      sale_id,p_store_id,product_record.id,product_record.code,product_record.name,quantity_value,
      product_record.sale_price_usd,round(product_record.sale_price_usd * rate_value,2),line_usd,line_ves
    );

    update public.products set stock_quantity = stock_quantity - quantity_value,
      updated_by = (select auth.uid()) where id = product_record.id;
    insert into public.stock_movements(
      store_id,product_id,movement_type,quantity_delta,balance_before,
      balance_after,reason,sale_id,created_by
    ) values (
      p_store_id,product_record.id,'sale',-quantity_value,
      product_record.stock_quantity,product_record.stock_quantity - quantity_value,
      'Salida por venta',sale_id,(select auth.uid())
    );
  end loop;

  for payment in select value from jsonb_array_elements(p_payments) loop
    payment_amount := (payment ->> 'amount')::numeric;
    if payment_amount is null or payment_amount <= 0 then
      raise exception 'Invalid payment amount' using errcode = '22023';
    end if;
    if payment ->> 'currency' = 'USD' then
      payment_usd := payment_amount;
    elsif payment ->> 'currency' = 'VES' then
      payment_usd := round(payment_amount / rate_value,2);
    else
      raise exception 'Invalid payment currency' using errcode = '22023';
    end if;
    if (payment ->> 'method') not in ('cash','mobile_payment','transfer','card','other') then
      raise exception 'Invalid payment method' using errcode = '22023';
    end if;

    paid_usd_value := paid_usd_value + payment_usd;
    insert into public.payments(sale_id,store_id,method,currency,amount,amount_usd,reference)
    values (sale_id,p_store_id,payment ->> 'method',payment ->> 'currency',payment_amount,payment_usd,
      nullif(trim(coalesce(payment ->> 'reference','')),''));
  end loop;

  if abs(paid_usd_value - total_usd_value) > 0.02 then
    raise exception 'Payment total does not match sale total' using errcode = '23514';
  end if;

  update public.sales set total_usd = total_usd_value,total_ves = total_ves_value where id = sale_id;
  insert into public.audit_logs(store_id,user_id,action,entity_type,entity_id,details)
  values (p_store_id,(select auth.uid()),'sale_registered','sale',sale_id::text,
    jsonb_build_object('total_usd',total_usd_value,'total_ves',total_ves_value));
  return sale_id;
end;
$$;

create or replace function public.cancel_sale(p_store_id uuid,p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale_record public.sales%rowtype;
  item_record record;
  current_stock numeric(18,3);
begin
  if (select auth.uid()) is null or not private.has_store_role(p_store_id,array['admin']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into sale_record from public.sales
  where id = p_sale_id and store_id = p_store_id for update;
  if not found then raise exception 'Sale not found' using errcode = 'P0002'; end if;
  if sale_record.status = 'cancelled' then raise exception 'Sale already cancelled' using errcode = '23514'; end if;

  for item_record in select product_id,quantity from public.sale_items where sale_id = p_sale_id loop
    select stock_quantity into current_stock from public.products where id = item_record.product_id for update;
    update public.products set stock_quantity = stock_quantity + item_record.quantity,
      updated_by = (select auth.uid()) where id = item_record.product_id;
    insert into public.stock_movements(
      store_id,product_id,movement_type,quantity_delta,balance_before,
      balance_after,reason,sale_id,created_by
    ) values (
      p_store_id,item_record.product_id,'sale_cancel',item_record.quantity,
      current_stock,current_stock + item_record.quantity,'Devolución por anulación de venta',
      p_sale_id,(select auth.uid())
    );
  end loop;

  update public.sales set status = 'cancelled',cancelled_by = (select auth.uid()),cancelled_at = now()
  where id = p_sale_id;
  insert into public.audit_logs(store_id,user_id,action,entity_type,entity_id)
  values (p_store_id,(select auth.uid()),'sale_cancelled','sale',p_sale_id::text);
end;
$$;

create or replace function public.import_products(
  p_store_id uuid,
  p_file_name text,
  p_rows jsonb,
  p_update_stock boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_id uuid;
  row_data jsonb;
  row_count integer;
  product_exists boolean;
  stock_value numeric;
begin
  if (select auth.uid()) is null or not private.has_store_role(p_store_id,array['admin','stock']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Import requires at least one row' using errcode = '22023';
  end if;
  row_count := jsonb_array_length(p_rows);
  if row_count > 5000 then raise exception 'Import exceeds 5000 rows' using errcode = '22023'; end if;

  insert into public.import_batches(store_id,file_name,status,total_rows,update_stock,imported_by)
  values (p_store_id,trim(p_file_name),'processing',row_count,p_update_stock,(select auth.uid()))
  returning id into batch_id;

  for row_data in select value from jsonb_array_elements(p_rows) loop
    select exists(select 1 from public.products
      where store_id = p_store_id and code = trim(row_data ->> 'code')) into product_exists;
    stock_value := case
      when p_update_stock or not product_exists then nullif(row_data ->> 'stock_quantity','')::numeric
      else null
    end;
    perform public.upsert_product(
      p_store_id,row_data ->> 'code',row_data ->> 'name',
      (row_data ->> 'sale_price_usd')::numeric,(row_data ->> 'purchase_price_usd')::numeric,
      row_data ->> 'barcode',row_data ->> 'category',
      coalesce(nullif(row_data ->> 'unit',''),'UNIDAD'),
      coalesce(nullif(row_data ->> 'minimum_stock','')::numeric,0),stock_value
    );
  end loop;

  update public.import_batches set status='completed',imported_rows=row_count,completed_at=now()
  where id=batch_id;
  insert into public.audit_logs(store_id,user_id,action,entity_type,entity_id,details)
  values (p_store_id,(select auth.uid()),'products_imported','import_batch',batch_id::text,
    jsonb_build_object('rows',row_count,'update_stock',p_update_stock));
  return batch_id;
end;
$$;

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;
alter table public.audit_logs enable row level security;

create policy stores_select_member on public.stores for select to authenticated
using (private.has_store_role(id,null));
create policy stores_update_admin on public.stores for update to authenticated
using (private.has_store_role(id,array['admin']))
with check (private.has_store_role(id,array['admin']));

create policy profiles_select_member on public.profiles for select to authenticated
using (private.has_store_role(store_id,null));
create policy profiles_update_admin on public.profiles for update to authenticated
using (private.has_store_role(store_id,array['admin']))
with check (private.has_store_role(store_id,array['admin']));

create policy products_select_member on public.products for select to authenticated
using (private.has_store_role(store_id,null));
create policy products_insert_stock on public.products for insert to authenticated
with check (private.has_store_role(store_id,array['admin','stock']));
create policy products_update_stock on public.products for update to authenticated
using (private.has_store_role(store_id,array['admin','stock']))
with check (private.has_store_role(store_id,array['admin','stock']));

create policy product_costs_select_privileged on public.product_costs for select to authenticated
using (private.has_store_role(store_id,array['admin','stock']));
create policy product_costs_insert_privileged on public.product_costs for insert to authenticated
with check (private.has_store_role(store_id,array['admin','stock']));
create policy product_costs_update_privileged on public.product_costs for update to authenticated
using (private.has_store_role(store_id,array['admin','stock']))
with check (private.has_store_role(store_id,array['admin','stock']));

create policy rates_select_member on public.exchange_rates for select to authenticated
using (private.has_store_role(store_id,null));
create policy rates_insert_admin on public.exchange_rates for insert to authenticated
with check (private.has_store_role(store_id,array['admin']));

create policy sales_select_member on public.sales for select to authenticated
using (private.has_store_role(store_id,null));
create policy sale_items_select_member on public.sale_items for select to authenticated
using (private.has_store_role(store_id,null));
create policy payments_select_privileged on public.payments for select to authenticated
using (private.has_store_role(store_id,array['admin','cashier']));
create policy stock_movements_select_member on public.stock_movements for select to authenticated
using (private.has_store_role(store_id,null));
create policy import_batches_select_privileged on public.import_batches for select to authenticated
using (private.has_store_role(store_id,array['admin','stock']));
create policy import_errors_select_privileged on public.import_errors for select to authenticated
using (private.has_store_role(store_id,array['admin','stock']));
create policy audit_logs_select_admin on public.audit_logs for select to authenticated
using (private.has_store_role(store_id,array['admin']));

revoke all on schema private from public;
grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant select,update on public.stores to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update on public.products to authenticated;
grant select,insert,update on public.product_costs to authenticated;
grant select,insert on public.exchange_rates to authenticated;
grant select on public.current_exchange_rates to authenticated;
grant select on public.sales,public.sale_items,public.payments,public.stock_movements,
  public.import_batches,public.import_errors,public.audit_logs to authenticated;
grant execute on function public.upsert_product(uuid,text,text,numeric,numeric,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.adjust_stock(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.register_sale(uuid,jsonb,jsonb,text) to authenticated;
grant execute on function public.cancel_sale(uuid,uuid) to authenticated;
grant execute on function public.import_products(uuid,text,jsonb,boolean) to authenticated;
