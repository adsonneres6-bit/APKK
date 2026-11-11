import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  userId: string;
  currentDeviceId: string;
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
    const { userId, currentDeviceId } = body;

    console.log("=== DISCONNECT-OTHER-DEVICES START ===");
    console.log(`userId: ${userId}`);
    console.log(`currentDeviceId: ${currentDeviceId}`);

    if (!userId || !currentDeviceId) {
      console.log("ERROR: Missing userId or currentDeviceId");
      return new Response(JSON.stringify({ error: "userId and currentDeviceId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // First, list all devices before update
    const { data: devicesBefore } = await supabase
      .from("user_devices")
      .select("id, device_id, is_active")
      .eq("user_id", userId);

    console.log("Devices before disconnect:");
    if (devicesBefore && devicesBefore.length > 0) {
      devicesBefore.forEach((d: { id: string; device_id: string; is_active: boolean }) => {
        console.log(`  - id=${d.id}, device_id=${d.device_id}, is_active=${d.is_active}`);
      });
    } else {
      console.log("  (no devices found)");
    }

    // Set all devices except current one to inactive
    console.log(`Setting all devices except ${currentDeviceId} to inactive...`);
    const { error, count } = await supabase
      .from("user_devices")
      .update({ is_active: false })
      .eq("user_id", userId)
      .neq("device_id", currentDeviceId);

    if (error) {
      console.error("Error disconnecting devices:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Deactivated ${count || 0} other devices`);

    // Make sure current device is active
    console.log(`Setting current device ${currentDeviceId} to active...`);
    const { error: activateError } = await supabase
      .from("user_devices")
      .update({ is_active: true, last_access_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("device_id", currentDeviceId);

    if (activateError) {
      console.error("Error activating current device:", activateError);
    }

    // List all devices after update
    const { data: devicesAfter } = await supabase
      .from("user_devices")
      .select("id, device_id, is_active")
      .eq("user_id", userId);

    console.log("Devices after disconnect:");
    if (devicesAfter && devicesAfter.length > 0) {
      devicesAfter.forEach((d: { id: string; device_id: string; is_active: boolean }) => {
        console.log(`  - id=${d.id}, device_id=${d.device_id}, is_active=${d.is_active}`);
      });
    }

    console.log("=== DISCONNECT-OTHER-DEVICES END: SUCCESS ===");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in disconnect-other-devices:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
