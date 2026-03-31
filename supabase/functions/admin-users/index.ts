import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify calling user is super_admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès réservé au Super Admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's company_id
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", caller.id)
      .single();

    const callerCompanyId = callerProfile?.company_id;

    const { action, ...params } = await req.json();

    switch (action) {
      case "create_user": {
        const { email, password, full_name, phone, role, company_id } = params;

        // Use caller's company if not specified
        const targetCompanyId = company_id || callerCompanyId;

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create profile with company_id
        await adminClient.from("profiles").insert({
          id: newUser.user.id,
          full_name,
          phone: phone || "",
          status: "active",
          must_change_password: true,
          company_id: targetCompanyId,
        });

        // Assign role
        await adminClient.from("user_roles").insert({
          user_id: newUser.user.id,
          role: role || "seller",
        });

        return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_status": {
        const { user_id, status } = params;
        const { error } = await adminClient.from("profiles").update({ status }).eq("id", user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = params;
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) throw error;

        await adminClient.from("profiles").update({ must_change_password: true }).eq("id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_users": {
        // Only list users from the same company
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*, user_roles(role)")
          .eq("company_id", callerCompanyId)
          .order("created_at", { ascending: false });

        // Get emails from auth
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();
        const emailMap = new Map(authUsers?.map((u: any) => [u.id, u.email]) || []);

        const enriched = (profiles || []).map((p: any) => ({
          ...p,
          email: emailMap.get(p.id) || "",
          role: p.user_roles?.[0]?.role || "seller",
        }));

        return new Response(JSON.stringify({ users: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = params;
        // Verify user belongs to same company before deleting
        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("company_id")
          .eq("id", user_id)
          .single();

        if (targetProfile?.company_id !== callerCompanyId) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Action inconnue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
