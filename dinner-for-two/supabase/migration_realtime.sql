-- Enable Realtime for dishes and ingredients tables
-- This allows WebSocket subscriptions to receive real-time updates

-- Enable Realtime for dishes table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS dishes;

-- Enable Realtime for ingredients table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS ingredients;

-- Note: If the tables are already in the publication, this will not error
-- You can verify by checking: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

