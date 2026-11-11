-- Add tutorial and APK URL fields to app_settings
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS tutorial_interface_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tutorial_flex_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tutorial_frota_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS apk_circuit_url TEXT DEFAULT 'https://github.com/adsonneres6-bit/adsonteste_download/releases/latest/download/Circuit.apk';

-- Update existing records with default APK URL if empty
UPDATE app_settings
SET apk_circuit_url = 'https://github.com/adsonneres6-bit/adsonteste_download/releases/latest/download/Circuit.apk'
WHERE apk_circuit_url IS NULL OR apk_circuit_url = '';

-- Keep old tutorial_url column for backwards compatibility during migration
-- (it already exists from previous migration)