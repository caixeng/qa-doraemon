import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "123456";
const AUTH_EMAIL_DOMAIN = "doraemon.edu.vn";

interface CreateStaffAccountRequest {
  phone: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client scoped to the caller's JWT — used only to verify who is calling
    // and to check their role in public.users.
    const callerClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerProfile } = await callerClient
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Chỉ Ban giám hiệu mới có quyền tạo tài khoản đăng nhập" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: CreateStaffAccountRequest = await req.json();
    const phone = (body.phone || "").trim();
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Thiếu số điện thoại" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin client — service_role key, only ever used inside the Edge Function runtime.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authEmail = `${phone}@${AUTH_EMAIL_DOMAIN}`;
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: body.password || DEFAULT_PASSWORD,
      email_confirm: true,
    });

    if (createError) {
      const message = createError.message.includes("already been registered")
        ? "Số điện thoại này đã được dùng để tạo tài khoản đăng nhập khác"
        : createError.message;
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Work around a GoTrue quirk where users created via the Admin API can end
    // up with NULL instead of '' in a few internal token columns, which then
    // makes every future login for that user fail with a 500 error.
    await adminClient.rpc("fix_auth_user_tokens", { target_user_id: created.user.id });

    return new Response(
      JSON.stringify({ success: true, userId: created.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
