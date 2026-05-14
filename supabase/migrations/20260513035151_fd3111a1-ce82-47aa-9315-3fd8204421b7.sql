
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'staff');
CREATE TYPE public.metal_type AS ENUM ('gold', 'silver', 'other');
CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'adjust');
CREATE TYPE public.party_type AS ENUM ('customer', 'supplier');
CREATE TYPE public.cash_direction AS ENUM ('in', 'out');

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','staff'));
$$;

-- Auto create profile + assign 'owner' to the very first user, 'staff' otherwise
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';
  IF owner_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile / role policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner views all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner views all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owner manages roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ============ SHOP SETTINGS (single row) ============
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL DEFAULT 'My Jewellery Shop',
  address TEXT,
  phone TEXT,
  email TEXT,
  pan_vat TEXT,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 13.00,
  currency TEXT NOT NULL DEFAULT 'NPR',
  logo_url TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  bill_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER shop_settings_updated BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.shop_settings (shop_name) VALUES ('My Jewellery Shop');
CREATE POLICY "Staff/owner read shop" ON public.shop_settings FOR SELECT USING (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Owner updates shop" ON public.shop_settings FOR UPDATE USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owner inserts shop" ON public.shop_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metal public.metal_type NOT NULL DEFAULT 'gold',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

INSERT INTO public.categories (name, metal) VALUES
  ('Ring','gold'),('Necklace','gold'),('Bangle','gold'),('Earring','gold'),
  ('Chain','gold'),('Pendant','gold'),('Silver Coin','silver'),('Silver Chain','silver');

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  metal public.metal_type NOT NULL DEFAULT 'gold',
  purity TEXT,                         -- e.g. '24K', '22K', '999'
  weight_gram NUMERIC(12,3) NOT NULL DEFAULT 0,
  making_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 1,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff manage products" ON public.products FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ STOCK MOVEMENTS ============
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.movement_type NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  weight_gram NUMERIC(12,3) NOT NULL DEFAULT 0,
  ref_table TEXT,
  ref_id UUID,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage stock movements" ON public.stock_movements FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ CUSTOMERS / SUPPLIERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  pan TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  pan TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff manage suppliers" ON public.suppliers FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ METAL PRICES ============
CREATE TABLE public.metal_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metal public.metal_type NOT NULL,
  price_per_gram NUMERIC(14,4) NOT NULL,
  price_per_tola NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NPR',
  source TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_metal_prices_metal_time ON public.metal_prices(metal, fetched_at DESC);
ALTER TABLE public.metal_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read metal prices" ON public.metal_prices FOR SELECT
  USING (public.is_staff_or_owner(auth.uid()));
CREATE POLICY "Staff insert metal prices" ON public.metal_prices FOR INSERT
  WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ SALES ============
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.bill_seq START 1001;

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.invoice_seq')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  making_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  due NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff manage sales" ON public.sales FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metal public.metal_type NOT NULL DEFAULT 'gold',
  purity TEXT,
  qty INT NOT NULL DEFAULT 1,
  weight_gram NUMERIC(12,3) NOT NULL DEFAULT 0,
  rate_per_gram NUMERIC(14,2) NOT NULL DEFAULT 0,
  making_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sale items" ON public.sale_items FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ PURCHASES ============
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no TEXT NOT NULL UNIQUE DEFAULT ('PB-' || nextval('public.bill_seq')),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  due NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER purchases_updated BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff manage purchases" ON public.purchases FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metal public.metal_type NOT NULL DEFAULT 'gold',
  purity TEXT,
  qty INT NOT NULL DEFAULT 1,
  weight_gram NUMERIC(12,3) NOT NULL DEFAULT 0,
  rate_per_gram NUMERIC(14,2) NOT NULL DEFAULT 0,
  making_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage purchase items" ON public.purchase_items FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ CREDITS LEDGER ============
CREATE TABLE public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type public.party_type NOT NULL,
  party_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ref_table TEXT,
  ref_id UUID,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credits_party ON public.credits(party_type, party_id);
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage credits" ON public.credits FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));

-- ============ CASHBOOK ============
CREATE TABLE public.cashbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  direction public.cash_direction NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  party_type public.party_type,
  party_id UUID,
  ref_table TEXT,
  ref_id UUID,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cashbook_date ON public.cashbook(entry_date DESC);
ALTER TABLE public.cashbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage cashbook" ON public.cashbook FOR ALL
  USING (public.is_staff_or_owner(auth.uid())) WITH CHECK (public.is_staff_or_owner(auth.uid()));
