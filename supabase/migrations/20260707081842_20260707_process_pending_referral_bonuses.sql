/*
# Process pending referral bonus

This migration processes any pending referrals when referral_require_payment is disabled.
It grants the bonus days to the referrer and updates the referral status.
*/

-- Process pending referral for Xeifjer (referrer) from Adson (referred)
-- Check if referral_require_payment is false
DO $$
DECLARE
  pending_ref RECORD;
  bonus_days_val INTEGER;
  referrer_license RECORD;
  new_expiry DATE;
  new_days INTEGER;
BEGIN
  -- Get bonus days from settings
  SELECT referral_bonus_days INTO bonus_days_val FROM app_settings LIMIT 1;
  
  -- Process each pending referral (if require_payment is false)
  FOR pending_ref IN 
    SELECT r.id, r.referred_by_user_id, r.referred_user_id
    FROM referrals r
    CROSS JOIN app_settings s
    WHERE r.status = 'pending' AND s.referral_require_payment = false
  LOOP
    -- Get referrer's current license
    SELECT * INTO referrer_license
    FROM licenses WHERE user_id = pending_ref.referred_by_user_id;
    
    IF referrer_license IS NOT NULL THEN
      -- Add days to existing license
      IF referrer_license.expires_at >= CURRENT_DATE THEN
        -- License still valid, add to remaining
        new_expiry := referrer_license.expires_at + bonus_days_val;
        new_days := referrer_license.days + bonus_days_val;
      ELSE
        -- License expired, start from today
        new_expiry := CURRENT_DATE + bonus_days_val;
        new_days := bonus_days_val;
      END IF;
      
      UPDATE licenses 
      SET expires_at = new_expiry, days = new_days
      WHERE user_id = pending_ref.referred_by_user_id;
    ELSE
      -- Create new license for referrer
      new_expiry := CURRENT_DATE + bonus_days_val;
      INSERT INTO licenses (user_id, days, is_free_trial, expires_at)
      VALUES (pending_ref.referred_by_user_id, bonus_days_val, false, new_expiry);
    END IF;
    
    -- Mark referral as bonified
    UPDATE referrals 
    SET status = 'bonified', bonified_at = now()
    WHERE id = pending_ref.id;
    
    -- Create audit record
    INSERT INTO referral_bonuses 
      (referrer_user_id, referred_user_id, referral_id, days_granted, reason, trigger_type, status)
    VALUES 
      (pending_ref.referred_by_user_id, pending_ref.referred_user_id, pending_ref.id, 
       bonus_days_val, 'Indicação - cadastro imediato', 'immediate', 'granted');
  END LOOP;
END $$;