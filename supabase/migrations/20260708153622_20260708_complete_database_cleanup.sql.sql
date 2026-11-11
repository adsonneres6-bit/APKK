-- Complete Database Cleanup - Preserve Admin and Settings Only
-- This migration removes all user data while keeping admin and system settings

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM profiles WHERE is_admin = true LIMIT 1;
    
    -- If no admin found, abort
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'No admin user found. Skipping cleanup.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Preserving admin user: %', admin_user_id;

    -- 1. Delete announcement confirmations (depends on announcements and users)
    DELETE FROM announcement_confirmations;
    RAISE NOTICE 'Cleaned announcement_confirmations';

    -- 2. Delete global announcements
    DELETE FROM global_announcements;
    RAISE NOTICE 'Cleaned global_announcements';

    -- 3. Delete user tutorial completions (non-admin only)
    DELETE FROM user_tutorial_completions WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned user_tutorial_completions';

    -- 4. Delete referral bonuses
    DELETE FROM referral_bonuses;
    RAISE NOTICE 'Cleaned referral_bonuses';

    -- 5. Delete referrals
    DELETE FROM referrals;
    RAISE NOTICE 'Cleaned referrals';

    -- 6. Delete referral codes (non-admin only)
    DELETE FROM referral_codes WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned referral_codes';

    -- 7. Delete user devices (non-admin only)
    DELETE FROM user_devices WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned user_devices';

    -- 8. Delete active sessions (all - temporary data)
    DELETE FROM active_sessions;
    RAISE NOTICE 'Cleaned active_sessions';

    -- 9. Delete device fingerprints (non-admin only)
    DELETE FROM device_fingerprints WHERE user_id IS NOT NULL AND user_id != admin_user_id;
    RAISE NOTICE 'Cleaned device_fingerprints';

    -- 10. Delete payments (non-admin only)
    DELETE FROM payments WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned payments';

    -- 11. Delete import history (non-admin only)
    DELETE FROM import_history WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned import_history';

    -- 12. Delete licenses (non-admin only)
    DELETE FROM licenses WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned licenses';

    -- 13. Delete trigger logs
    DELETE FROM trigger_logs;
    RAISE NOTICE 'Cleaned trigger_logs';

    -- 14. Get list of non-admin user IDs before deleting profiles
    CREATE TEMP TABLE IF NOT EXISTS non_admin_users AS
    SELECT id FROM profiles WHERE is_admin = false;

    -- 15. Delete non-admin profiles
    DELETE FROM profiles WHERE is_admin = false;
    RAISE NOTICE 'Cleaned non-admin profiles';

    -- 16. Delete non-admin users from auth.users
    -- Note: This requires service role privileges
    -- We'll handle this via auth API or cascade
    
    RAISE NOTICE 'Database cleanup completed successfully';
    RAISE NOTICE 'Preserved: Admin user, app_settings, pix_settings';
    
    -- Cleanup temp table
    DROP TABLE IF EXISTS non_admin_users;
END $$;

-- Reset referral code for admin if exists (keep it fresh)
UPDATE referral_codes SET code = upper(substr(md5(random()::text), 1, 8)) WHERE user_id IN (SELECT id FROM profiles WHERE is_admin = true);

-- Clear any orphaned device fingerprints (no user assigned but may have trial data)
DELETE FROM device_fingerprints WHERE user_id IS NULL;