-- Enable Realtime for dishes, ingredients, and manual_ingredients tables
-- This allows WebSocket subscriptions to receive real-time updates

-- Enable Realtime for dishes table
-- Note: If the table is already in the publication, this will error, but that's okay
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'dishes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE dishes;
    END IF;
END $$;

-- Enable Realtime for ingredients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ingredients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
    END IF;
END $$;

-- Enable Realtime for manual_ingredients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'manual_ingredients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE manual_ingredients;
    END IF;
END $$;

-- Verify tables are added to publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

