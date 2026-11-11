import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeviceInfo {
  deviceId: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  language: string;
  screenResolution: string;
  timezone: string;
}

interface RequestBody {
  userId: string;
  deviceInfo: DeviceInfo;
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
    const { userId, deviceInfo } = body;

    console.log("=== VALIDATE-DEVICE START ===");
    console.log(`userId: ${userId}`);
    console.log(`incoming fingerprint: ${deviceInfo.deviceId}`);
    console.log(`device info: os=${deviceInfo.os}, browser=${deviceInfo.browser}, resolution=${deviceInfo.screenResolution}`);

    if (!userId || !deviceInfo || !deviceInfo.deviceId) {
      console.log("ERROR: Missing userId or deviceInfo");
      return new Response(JSON.stringify({ error: "userId and deviceInfo are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get max devices setting
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("max_devices_per_user")
      .maybeSingle();

    const maxDevices = settingsData?.max_devices_per_user ?? 2;
    console.log(`maxDevices: ${maxDevices}`);

    // STEP 1: Check if this exact device already exists for this user (by device_id fingerprint)
    console.log("--- STEP 1: Checking for existing device by fingerprint ---");
    const { data: existingDevice, error: selectError } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("device_id", deviceInfo.deviceId)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking device:", selectError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingDevice) {
      console.log(`FOUND EXISTING DEVICE: id=${existingDevice.id}, is_active=${existingDevice.is_active}, device_id=${existingDevice.device_id}`);
      console.log(`Decision: REUSE existing device, isReturningDevice=${!existingDevice.is_active}`);

      // Device already exists - update metadata
      const { error: updateError } = await supabase
        .from("user_devices")
        .update({
          last_access_at: new Date().toISOString(),
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          language: deviceInfo.language,
          screen_resolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
        })
        .eq("id", existingDevice.id);

      if (updateError) {
        console.error("Error updating device metadata:", updateError);
      } else {
        console.log("Device metadata updated successfully");
      }

      const { count } = await supabase
        .from("user_devices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true);

      console.log(`Active devices count: ${count}`);
      console.log("=== VALIDATE-DEVICE END: VALID (existing device) ===");

      return new Response(
        JSON.stringify({
          valid: true,
          isNewDevice: false,
          isReturningDevice: !existingDevice.is_active,
          device: {
            id: existingDevice.id,
            deviceId: existingDevice.device_id,
            os: deviceInfo.os,
            osVersion: deviceInfo.osVersion,
            browser: deviceInfo.browser,
            browserVersion: deviceInfo.browserVersion,
            language: deviceInfo.language,
            screenResolution: deviceInfo.screenResolution,
            timezone: deviceInfo.timezone,
            firstAccessAt: existingDevice.first_access_at,
            lastAccessAt: new Date().toISOString(),
            isActive: existingDevice.is_active,
          },
          activeDevicesCount: count || 0,
          maxDevices,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("No existing device found with this fingerprint");

    // STEP 2: Device not found - check TOTAL registered devices count
    console.log("--- STEP 2: Checking total device count ---");
    const { count: totalCount, data: allDevices } = await supabase
      .from("user_devices")
      .select("id, device_id, is_active", { count: "exact" })
      .eq("user_id", userId);

    console.log(`Total devices for user: ${totalCount}`);
    if (allDevices && allDevices.length > 0) {
      console.log("Existing devices:");
      allDevices.forEach((d: { id: string; device_id: string; is_active: boolean }) => {
        console.log(`  - id=${d.id}, device_id=${d.device_id}, is_active=${d.is_active}`);
      });
    }

    const currentTotalCount = totalCount || 0;

    // HARD CAP: If user already has maxDevices registered, block new device registration
    if (currentTotalCount >= maxDevices) {
      console.log(`BLOCKED: User has ${currentTotalCount} devices, max is ${maxDevices}`);
      console.log("=== VALIDATE-DEVICE END: INVALID (hard cap reached) ===");

      return new Response(
        JSON.stringify({
          valid: false,
          isNewDevice: true,
          deviceId: deviceInfo.deviceId,
          activeDevicesCount: currentTotalCount,
          maxDevices,
          error: `Limite de ${maxDevices} dispositivo(s) atingido. Entre em contato com o administrador para liberar um novo aparelho.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 3: Register completely new device
    console.log("--- STEP 3: Registering new device ---");
    console.log(`Decision: CREATE NEW device (current total: ${currentTotalCount}, max: ${maxDevices})`);

    const { count: activeCount } = await supabase
      .from("user_devices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: newDevice, error: insertError } = await supabase
      .from("user_devices")
      .insert({
        user_id: userId,
        device_id: deviceInfo.deviceId,
        os: deviceInfo.os,
        os_version: deviceInfo.osVersion,
        browser: deviceInfo.browser,
        browser_version: deviceInfo.browserVersion,
        language: deviceInfo.language,
        screen_resolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone,
        first_access_at: new Date().toISOString(),
        last_access_at: new Date().toISOString(),
        is_active: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting device:", insertError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`New device created: id=${newDevice.id}, device_id=${newDevice.device_id}`);
    console.log(`Active devices count after insert: ${activeCount || 0}`);
    console.log("=== VALIDATE-DEVICE END: VALID (new device created) ===");

    return new Response(
      JSON.stringify({
        valid: true,
        isNewDevice: true,
        isReturningDevice: false,
        device: {
          id: newDevice.id,
          deviceId: newDevice.device_id,
          os: newDevice.os,
          osVersion: newDevice.os_version,
          browser: newDevice.browser,
          browserVersion: newDevice.browser_version,
          language: newDevice.language,
          screenResolution: newDevice.screen_resolution,
          timezone: newDevice.timezone,
          firstAccessAt: newDevice.first_access_at,
          lastAccessAt: newDevice.last_access_at,
          isActive: false,
        },
        activeDevicesCount: activeCount || 0,
        maxDevices,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-device:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
