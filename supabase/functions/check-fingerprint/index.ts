import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  fingerprint: string;
  userId?: string;
}

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
    const body: RequestBody = await req.json();
    const { fingerprint, userId } = body;

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: "Fingerprint is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if fingerprint exists
    const { data: existingFp, error: selectError } = await supabase
      .from("device_fingerprints")
      .select("*")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking fingerprint:", selectError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // If fingerprint doesn't exist, create a new record (eligible for trial)
    if (!existingFp) {
      const newRecord = {
        fingerprint,
        user_id: userId || null,
        trial_used: false,
        trial_started_at: null,
        trial_expires_at: null,
      };

      const { error: insertError } = await supabase
        .from("device_fingerprints")
        .insert(newRecord);

      if (insertError) {
        console.error("Error inserting fingerprint:", insertError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          eligible: true,
          fingerprint,
          trialUsed: false,
          trialExpiresAt: null,
          isNewDevice: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fingerprint exists - check if trial was used
    const isTrialUsed = existingFp.trial_used === true;
    const trialExpiresAt = existingFp.trial_expires_at;

    // Update user_id if provided and not set
    if (userId && !existingFp.user_id) {
      await supabase
        .from("device_fingerprints")
        .update({ user_id: userId })
        .eq("id", existingFp.id);
    }

    // If trial is used, check if it's expired
    if (isTrialUsed && trialExpiresAt) {
      const isExpired = trialExpiresAt < today;

      return new Response(
        JSON.stringify({
          eligible: false,
          fingerprint,
          trialUsed: true,
          trialExpiresAt,
          isExpired,
          isNewDevice: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trial was not used on this fingerprint (shouldn't happen normally, but handle it)
    return new Response(
      JSON.stringify({
        eligible: !isTrialUsed,
        fingerprint,
        trialUsed: isTrialUsed,
        trialExpiresAt,
        isNewDevice: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-fingerprint:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
