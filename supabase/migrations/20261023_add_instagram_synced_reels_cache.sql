-- ==============================================================================
-- THE BUSINESS WORK — INSTAGRAM SYNCED REELS CACHE TABLE (ADDITIVE V5 UPGRADE)
-- Stores discovered published Reels from @thebusinesswork.co
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.instagram_synced_reels (
    media_id TEXT PRIMARY KEY,
    shortcode TEXT,
    caption TEXT,
    permalink TEXT,
    thumbnail_url TEXT,
    media_url TEXT,
    timestamp TIMESTAMPTZ,
    media_type TEXT DEFAULT 'VIDEO',
    media_product_type TEXT DEFAULT 'REELS',
    comments_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup by shortcode and publication date
CREATE INDEX IF NOT EXISTS idx_instagram_synced_reels_shortcode ON public.instagram_synced_reels (shortcode);
CREATE INDEX IF NOT EXISTS idx_instagram_synced_reels_timestamp ON public.instagram_synced_reels (timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.instagram_synced_reels ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'instagram_synced_reels' 
        AND policyname = 'Allow service role full access on instagram_synced_reels'
    ) THEN
        CREATE POLICY "Allow service role full access on instagram_synced_reels"
            ON public.instagram_synced_reels
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
