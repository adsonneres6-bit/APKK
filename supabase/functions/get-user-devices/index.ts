import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  userId?: string;
  getAllUsers?: boolean;
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
    const { userId, getAllUsers } = body;

    if (!userId && !getAllUsers) {
      return new Response(JSON.stringify({ error: "userId or getAllUsers is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (getAllUsers) {
      // Fetch all devices with user info for admin view
      const { data: devices, error } = await supabase
        .from("user_devices")
        .select(`
          id,
          user_id,
          device_id,
          os,
          os_version,
          browser,
          browser_version,
          language,
          screen_resolution,
          timezone,
          first_access_at,
          last_access_at,
          is_active
        `)
        .order("last_access_at", { ascending: false });

      if (error) {
        console.error("Error fetching all devices:", error);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch profile names/emails for each unique user_id
      const userIds = [...new Set((devices || []).map((d) => d.user_id))];
      const profileMap: Record<string, { name: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        // Get emails from auth.users via RPC
        for (const profile of profiles || []) {
          profileMap[profile.id] = { name: profile.name, email: "" };
        }

        // Try to get emails via admin API
        const { data: usersData } = await supabase.auth.admin.listUsers();
        for (const u of usersData?.users || []) {
          if (profileMap[u.id]) {
            profileMap[u.id].email = u.email || "";
          }
        }
      }

      const formattedDevices = (devices || []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        userName: profileMap[d.user_id]?.name || "Usuário",
        userEmail: profileMap[d.user_id]?.email || "",
        deviceId: d.device_id,
        os: d.os,
        osVersion: d.os_version,
        browser: d.browser,
        browserVersion: d.browser_version,
        language: d.language,
        screenResolution: d.screen_resolution,
        timezone: d.timezone,
        firstAccessAt: d.first_access_at,
        lastAccessAt: d.last_access_at,
        isActive: d.is_active,
      }));

      return new Response(
        JSON.stringify({ devices: formattedDevices }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch devices for a specific user
    const { data: devices, error } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", userId!)
      .order("last_access_at", { ascending: false });

    if (error) {
      console.error("Error fetching devices:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email via admin API
    let userEmail = "";
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId!);
      userEmail = userData?.user?.email || "";
    } catch {
      // Email fetch failure is non-critical
    }

    const formattedDevices = (devices || []).map((d) => ({
      id: d.id,
      userId: d.user_id,
      userEmail,
      deviceId: d.device_id,
      os: d.os,
      osVersion: d.os_version,
      browser: d.browser,
      browserVersion: d.browser_version,
      language: d.language,
      screenResolution: d.screen_resolution,
      timezone: d.timezone,
      firstAccessAt: d.first_access_at,
      lastAccessAt: d.last_access_at,
      isActive: d.is_active,
    }));

    return new Response(
      JSON.stringify({ devices: formattedDevices }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-user-devices:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
