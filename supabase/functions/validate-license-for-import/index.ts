import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const body = await req.json();
    const { userId, fingerprint } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required", valid: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Get trial days from settings for dynamic messaging
    const { data: settings } = await supabase
      .from("app_settings")
      .select("trial_days")
      .maybeSingle();
    const trialDays = settings?.trial_days ?? 30;

    // Check license from database
    const { data: license, error: licenseError } = await supabase
      .from("licenses")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (licenseError) {
      console.error("Error checking license:", licenseError);
      return new Response(JSON.stringify({ error: "Database error", valid: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If license exists and is not expired, allow import
    if (license) {
      const isExpired = license.expires_at < today;

      if (!isExpired) {
        // License is active - allow import
        return new Response(
          JSON.stringify({
            valid: true,
            reason: "license_active",
            expiresAt: license.expires_at,
            isFreeTrial: license.is_free_trial,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No active license - check fingerprint
    const fpToCheck = fingerprint || body.fingerprint;

    if (fpToCheck) {
      const { data: fingerprintRecord, error: fpError } = await supabase
        .from("device_fingerprints")
        .select("*")
        .eq("fingerprint", fpToCheck)
        .maybeSingle();

      if (fpError) {
        console.error("Error checking fingerprint:", fpError);
        return new Response(JSON.stringify({ error: "Database error", valid: false }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (fingerprintRecord) {
        // Fingerprint found
        if (fingerprintRecord.trial_used) {
          // Trial was used - check if expired
          if (fingerprintRecord.trial_expires_at) {
            const trialExpired = fingerprintRecord.trial_expires_at < today;

            if (trialExpired) {
              // Trial expired - block import
              return new Response(
                JSON.stringify({
                  valid: false,
                  reason: "trial_expired",
                  message: `Seu período gratuito de ${trialDays} dias expirou. Realize o pagamento para continuar.`,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              // Trial still active - allow import
              return new Response(
                JSON.stringify({
                  valid: true,
                  reason: "trial_active",
                  expiresAt: fingerprintRecord.trial_expires_at,
                  isFreeTrial: true,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
      }
    }

    // No license and no fingerprint trial - check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_admin) {
      // Admin always has access
      return new Response(
        JSON.stringify({
          valid: true,
          reason: "admin",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No valid license, no active trial, not admin - block import
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "no_license",
        message: "Você não possui uma licença ativa. Realize o pagamento para utilizar o sistema.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-license-for-import:", error);
    return new Response(JSON.stringify({ error: "Internal server error", valid: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
