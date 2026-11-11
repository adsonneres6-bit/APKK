import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { referredUserId, trigger } = await req.json();

    if (!referredUserId || typeof referredUserId !== "string") {
      return new Response(JSON.stringify({ error: "Missing referredUserId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerType = trigger === "first_purchase" ? "first_purchase" : "immediate";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Find the referral record for this user
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();

    if (referralError) {
      return new Response(JSON.stringify({ error: referralError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No referral exists — user signed up without a code
    if (!referral) {
      return new Response(JSON.stringify({ success: true, message: "No referral found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already bonified — never double-grant
    if (referral.status === "bonified") {
      return new Response(JSON.stringify({ success: true, message: "Already bonified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Read referral settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("referral_bonus_days, referral_require_payment")
      .maybeSingle();

    const bonusDays = settings?.referral_bonus_days ?? 7;
    const requirePayment = settings?.referral_require_payment ?? false;

    // 3. Determine if we should grant the bonus now
    let shouldGrant = false;
    let reason = "";

    if (triggerType === "immediate") {
      // Called right after registration
      if (!requirePayment) {
        shouldGrant = true;
        reason = "Indicação - cadastro imediato";
      }
      // If requirePayment is true, we wait for first purchase — do nothing now
    } else if (triggerType === "first_purchase") {
      // Called after first payment confirmation
      shouldGrant = true;
      reason = "Indicação - primeira compra";
    }

    if (!shouldGrant) {
      return new Response(JSON.stringify({ success: true, message: "Bonus deferred" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Grant bonus days to the REFERRER (the person who shared the code)
    const referrerId = referral.referred_by_user_id;

    // Get referrer's current license
    const { data: license } = await supabase
      .from("licenses")
      .select("*")
      .eq("user_id", referrerId)
      .maybeSingle();

    if (license) {
      // Add days to existing license
      const currentExpiry = new Date(license.expires_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If license already expired, start from today; otherwise add to remaining
      const baseDate = currentExpiry > today ? currentExpiry : today;
      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + bonusDays);
      const newExpiryISO = newExpiry.toISOString().slice(0, 10);
      const newTotalDays = license.days + bonusDays;

      await supabase
        .from("licenses")
        .update({
          days: newTotalDays,
          expires_at: newExpiryISO,
        })
        .eq("user_id", referrerId);
    } else {
      // Referrer has no license — create one with the bonus days
      const expiry = new Date();
      expiry.setHours(0, 0, 0, 0);
      expiry.setDate(expiry.getDate() + bonusDays);
      const expiryISO = expiry.toISOString().slice(0, 10);

      await supabase
        .from("licenses")
        .insert({
          user_id: referrerId,
          days: bonusDays,
          is_free_trial: false,
          expires_at: expiryISO,
        });
    }

    // 5. Mark referral as bonified
    await supabase
      .from("referrals")
      .update({
        status: "bonified",
        bonified_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    // 6. Create audit record in referral_bonuses
    await supabase
      .from("referral_bonuses")
      .insert({
        referrer_user_id: referrerId,
        referred_user_id: referredUserId,
        referral_id: referral.id,
        days_granted: bonusDays,
        reason,
        trigger_type: triggerType,
        status: "granted",
      });

    return new Response(JSON.stringify({ success: true, bonusDays, referrerId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
