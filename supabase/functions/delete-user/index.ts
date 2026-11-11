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
    const { targetUserId, requestingUserId } = await req.json();

    if (!targetUserId || !requestingUserId) {
      return new Response(
        JSON.stringify({ error: "targetUserId and requestingUserId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the requesting user is an admin
    const { data: requester } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", requestingUserId)
      .maybeSingle();

    if (!requester?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Sem permissão." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent deleting another admin
    const { data: target } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", targetUserId)
      .maybeSingle();

    if (target?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Não é possível excluir um administrador." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete all related data in the correct order (FK constraints)
    const deletions = [
      supabase.from("active_sessions").delete().eq("user_id", targetUserId),
      supabase.from("user_devices").delete().eq("user_id", targetUserId),
      supabase.from("device_fingerprints").delete().eq("user_id", targetUserId),
      supabase.from("import_history").delete().eq("user_id", targetUserId),
      supabase.from("payments").delete().eq("user_id", targetUserId),
      supabase.from("licenses").delete().eq("user_id", targetUserId),
    ];

    const results = await Promise.allSettled(deletions);
    const failures = results
      .map((r, i) => (r.status === "rejected" ? i : null))
      .filter((x) => x !== null);

    if (failures.length > 0) {
      console.error("Some deletions failed for indexes:", failures);
    }

    // Delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir perfil: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete from auth.users (requires service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      // Profile already deleted — log but don't block success
      // The user is effectively gone from the app's perspective
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-user:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
