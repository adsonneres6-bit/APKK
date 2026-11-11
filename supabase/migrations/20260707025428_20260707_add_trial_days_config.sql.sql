/*
# Add trial_days to app_settings

## Purpose
Makes the trial period configurable through the Admin panel.

## Changes
- Adds `trial_days` column to `app_settings` table (default 30)
- This value will be used when creating new users

## Notes
- Default value is 30 days
- Changing this value affects only NEW users
- Existing users' trial periods are not modified
*/

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 30;

COMMENT ON COLUMN app_settings.trial_days IS 'Number of free trial days for new users';
