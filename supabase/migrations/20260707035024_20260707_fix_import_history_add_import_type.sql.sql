/*
# Fix import_history table - Add missing import_type column

## Problem
The code attempts to insert 'import_type' field but the column doesn't exist in the database.
This causes INSERT operations to fail silently or with errors.

## Solution
Add the missing import_type column with a default value.
*/

-- Add import_type column to import_history
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS import_type TEXT NOT NULL DEFAULT 'flex';

-- Create index for import_type queries
CREATE INDEX IF NOT EXISTS idx_import_history_import_type ON import_history(import_type);

-- Add comment
COMMENT ON COLUMN import_history.import_type IS 'Type of import: flex (PDF) or frota (XLSX)';
