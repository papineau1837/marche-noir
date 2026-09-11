-- Exécuter ce fichier dans Supabase > SQL Editor.
-- Le backend Render doit utiliser SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.order_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    order_type TEXT NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.order_book(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    order_type TEXT NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
    price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    total NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS order_book_asset_id_idx ON public.order_book(asset_id);

ALTER TABLE public.order_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'order_book' AND policyname = 'Users can read their orders'
    ) THEN
        CREATE POLICY "Users can read their orders"
            ON public.order_book FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'holdings' AND policyname = 'Users can read their holdings'
    ) THEN
        CREATE POLICY "Users can read their holdings"
            ON public.holdings FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Users can read their transactions'
    ) THEN
        CREATE POLICY "Users can read their transactions"
            ON public.transactions FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.execute_order(
    p_user_id UUID,
    p_asset_id UUID,
    p_order_type TEXT,
    p_price NUMERIC,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance NUMERIC(12, 2);
    current_holding BIGINT := 0;
    market_price NUMERIC(12, 2);
    total NUMERIC(14, 2);
    new_balance NUMERIC(12, 2);
    new_holding BIGINT;
    order_id UUID;
BEGIN
    IF p_order_type NOT IN ('BUY', 'SELL') THEN
        RAISE EXCEPTION 'Type d''ordre invalide';
    END IF;

    IF p_price <= 0 OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Prix et quantité doivent être positifs';
    END IF;

    SELECT current_price INTO market_price
    FROM public.assets
    WHERE id = p_asset_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Actif introuvable';
    END IF;

    SELECT wallet_balance INTO current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil utilisateur introuvable';
    END IF;

    total := round(p_price * p_quantity, 2);

    IF p_order_type = 'BUY' THEN
        IF current_balance < total THEN
            RAISE EXCEPTION 'Fonds insuffisants';
        END IF;

        new_balance := current_balance - total;
        UPDATE public.profiles
        SET wallet_balance = new_balance
        WHERE id = p_user_id;

        INSERT INTO public.holdings (user_id, asset_id, quantity)
        VALUES (p_user_id, p_asset_id, p_quantity)
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET
            quantity = public.holdings.quantity + EXCLUDED.quantity,
            updated_at = timezone('utc'::text, now());

        SELECT quantity INTO new_holding
        FROM public.holdings
        WHERE user_id = p_user_id AND asset_id = p_asset_id;

        UPDATE public.assets
        SET current_price = round(greatest(0.01, market_price * 1.01), 2)
        WHERE id = p_asset_id;
    ELSE
        SELECT quantity INTO current_holding
        FROM public.holdings
        WHERE user_id = p_user_id AND asset_id = p_asset_id
        FOR UPDATE;

        IF current_holding IS NULL OR current_holding < p_quantity THEN
            RAISE EXCEPTION 'Position insuffisante pour cette vente';
        END IF;

        new_holding := current_holding - p_quantity;
        UPDATE public.holdings
        SET quantity = new_holding,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = p_user_id AND asset_id = p_asset_id;

        new_balance := current_balance + total;
        UPDATE public.profiles
        SET wallet_balance = new_balance
        WHERE id = p_user_id;

        UPDATE public.assets
        SET current_price = round(greatest(0.01, market_price * 0.99), 2)
        WHERE id = p_asset_id;
    END IF;

    INSERT INTO public.order_book (user_id, asset_id, order_type, price, quantity, status)
    VALUES (p_user_id, p_asset_id, p_order_type, p_price, p_quantity, 'FILLED')
    RETURNING id INTO order_id;

    INSERT INTO public.transactions (order_id, user_id, asset_id, order_type, price, quantity, total)
    VALUES (order_id, p_user_id, p_asset_id, p_order_type, p_price, p_quantity, total);

    RETURN jsonb_build_object(
        'id', order_id,
        'user_id', p_user_id,
        'asset_id', p_asset_id,
        'order_type', p_order_type,
        'price', p_price,
        'quantity', p_quantity,
        'total', total,
        'wallet_balance', new_balance,
        'holding_quantity', COALESCE(new_holding, 0),
        'status', 'FILLED'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_order(UUID, UUID, TEXT, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_order(UUID, UUID, TEXT, NUMERIC, INTEGER) TO service_role;
