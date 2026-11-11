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
    const { requestingUserId } = await req.json();

    if (!requestingUserId) {
      return new Response(
        JSON.stringify({ error: "requestingUserId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the requesting user is an admin (same pattern as delete-user)
    const { data: requester } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", requestingUserId)
      .maybeSingle();

    if (!requester?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Sem permissão. Apenas administradores." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the RPC function to clear import history and active sessions
    const { data: result, error: rpcError } = await supabase
      .rpc("clear_import_history_all");

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Erro ao limpar histórico: " + rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RPC returns JSON; handle both direct-object and array-wrapped formats
    const payload = Array.isArray(result) ? (result[0]?.clear_import_history_all ?? result[0] ?? {}) : (result ?? {});
    const deletedHistory = payload?.deleted_history ?? 0;
    const deletedSessions = payload?.deleted_sessions ?? 0;

    // Also attempt to clean Storage bucket "import-files" if it exists
    let storageDeleted = 0;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some((b: { name: string }) => b.name === "import-files");
      if (hasBucket) {
        const { data: files } = await supabase.storage.from("import-files").list();
        if (files && files.length > 0) {
          const filePaths = files.map((f: { name: string }) => f.name);
          const { error: removeError } = await supabase.storage.from("import-files").remove(filePaths);
          if (!removeError) {
            storageDeleted = filePaths.length;
          }
        }
      }
    } catch (storageErr) {
      // Storage cleanup is best-effort; don't fail the operation
      console.error("Storage cleanup error (non-blocking):", storageErr);
    }

    return new Response(JSON.stringify({
      success: true,
      deletedHistory,
      deletedSessions,
      storageDeleted,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in clear-import-history:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
