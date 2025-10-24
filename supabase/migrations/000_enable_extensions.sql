-- Enable required extensions
-- This migration must run before any other migration

-- Enable required extensions
-- pgcrypto provides gen_random_uuid() function
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable UUID extension (backup option)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');
