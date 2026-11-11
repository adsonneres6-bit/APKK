/*
# Database Cleanup - Preserve Admin Only

This migration cleans all data from tables while preserving:
- Admin user (auth.users and profiles)
- Admin's license, devices, referral code
- Global settings (app_settings, pix_settings)
- Table structure, triggers, functions, indexes

Tables to clean:
- active_sessions
- device_fingerprints
- import_history
- licenses (except admin's)
- payments
- referral_bonuses
- referral_codes (except admin's)
- referrals
- trigger_logs
- user_devices (except admin's)
- profiles (except admin's)
*/

-- ============================================================
-- Step 1: Delete dependent records first (respecting FK constraints)
-- ============================================================

-- Delete referral_bonuses (FK to referrals)
DELETE FROM referral_bonuses;

-- Delete referrals
DELETE FROM referrals;

-- Delete referral_codes except admin's
DELETE FROM referral_codes WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete active_sessions for non-admin users
DELETE FROM active_sessions WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete user_devices for non-admin users
DELETE FROM user_devices WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete import_history for non-admin users
DELETE FROM import_history WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete payments for non-admin users
DELETE FROM payments WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete licenses for non-admin users
DELETE FROM licenses WHERE user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete device_fingerprints for non-admin users
DELETE FROM device_fingerprints WHERE user_id IS NOT NULL AND user_id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete orphaned device_fingerprints (no user_id)
DELETE FROM device_fingerprints WHERE user_id IS NULL;

-- Delete profiles for non-admin users
DELETE FROM profiles WHERE id != '0334bd20-9ab6-4153-ad95-00e820e23310';

-- Delete trigger_logs
DELETE FROM trigger_logs;