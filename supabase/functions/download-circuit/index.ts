import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DROPBOX_URL =
  "https://www.dropbox.com/scl/fi/f3w0izj8fvjrtz8t0f7g9/Circuit.apk?rlkey=q1la7vl9g4qybdqvq7hjhwoj6&st=n72owzn7&dl=1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(DROPBOX_URL, {
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch file" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blob = await response.blob();

    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="Circuit.apk"',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
