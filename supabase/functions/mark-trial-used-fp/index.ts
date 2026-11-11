import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  fingerprint: string;
  userId: string;
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

    if (!fingerprint || !userId) {
      return new Response(JSON.stringify({ error: "Fingerprint and userId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate trial expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtStr = expiresAt.toISOString().split("T")[0];

    // Update or create fingerprint record
    const { data: existingFp } = await supabase
      .from("device_fingerprints")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (existingFp) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("device_fingerprints")
        .update({
          user_id: userId,
          trial_used: true,
          trial_started_at: new Date().toISOString(),
          trial_expires_at: expiresAtStr,
        })
        .eq("id", existingFp.id);

      if (updateError) {
        console.error("Error updating fingerprint:", updateError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from("device_fingerprints")
        .insert({
          fingerprint,
          user_id: userId,
          trial_used: true,
          trial_started_at: new Date().toISOString(),
          trial_expires_at: expiresAtStr,
        });

      if (insertError) {
        console.error("Error inserting fingerprint:", insertError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trialExpiresAt: expiresAtStr,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in mark-trial-used-fp:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
