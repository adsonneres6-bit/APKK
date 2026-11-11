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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with their fingerprints
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, is_admin, active, created_at")
      .eq("is_admin", false);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all licenses
    const { data: licenses, error: licensesError } = await supabase
      .from("licenses")
      .select("*");

    if (licensesError) {
      console.error("Error fetching licenses:", licensesError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all device fingerprints
    const { data: fingerprints, error: fpsError } = await supabase
      .from("device_fingerprints")
      .select("*");

    if (fpsError) {
      console.error("Error fetching fingerprints:", fpsError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const licenseMap = new Map(licenses?.map((l) => [l.user_id, l]) || []);
    const fingerprintMap = new Map(
      fingerprints?.filter((fp) => fp.user_id).map((fp) => [fp.user_id, fp]) || []
    );

    const today = new Date().toISOString().split("T")[0];

    interface UserStatus {
      id: string;
      name: string;
      active: boolean;
      created_at: string;
      license: {
        days: number;
        is_free_trial: boolean;
        expires_at: string;
      } | null;
      fingerprint_trial_used: boolean;
      fingerprint_trial_expired: boolean;
      status: "active" | "trial" | "expired" | "no_license";
      days_remaining: number;
    }

    const usersStatus: UserStatus[] = (profiles || []).map((p) => {
      const license = licenseMap.get(p.id);
      const fingerprint = fingerprintMap.get(p.id);

      const fingerTrialUsed = fingerprint?.trial_used === true;
      const fingerTrialExpired = fingerprint?.trial_expires_at
        ? fingerprint.trial_expires_at < today
        : false;

      let daysRemaining = 0;
      let status: "active" | "trial" | "expired" | "no_license" = "no_license";

      if (license) {
        daysRemaining = Math.ceil(
          (new Date(license.expires_at + "T00:00:00").getTime() - Date.now()) / 86400000
        );

        if (daysRemaining > 0) {
          status = license.is_free_trial ? "trial" : "active";
        } else {
          status = "expired";
        }
      } else if (fingerTrialUsed && !fingerTrialExpired) {
        // Has fingerprint trial but no license record - check fingerprint expiry
        if (fingerprint?.trial_expires_at) {
          daysRemaining = Math.ceil(
            (new Date(fingerprint.trial_expires_at + "T00:00:00").getTime() - Date.now()) / 86400000
          );
          status = daysRemaining > 0 ? "trial" : "expired";
        }
      } else if (fingerTrialUsed && fingerTrialExpired) {
        status = "expired";
        daysRemaining = 0;
      }

      return {
        id: p.id,
        name: p.name,
        active: p.active,
        created_at: p.created_at,
        license: license
          ? {
              days: license.days,
              is_free_trial: license.is_free_trial,
              expires_at: license.expires_at,
            }
          : null,
        fingerprint_trial_used: fingerTrialUsed,
        fingerprint_trial_expired: fingerTrialExpired,
        status,
        days_remaining: daysRemaining,
      };
    });

    return new Response(JSON.stringify({ users: usersStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-user-fingerprint-status:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
