-- Track whether user has seen welcome and info modals
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_modal_shown BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS info_modal_shown BOOLEAN DEFAULT false;