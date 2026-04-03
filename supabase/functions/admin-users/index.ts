import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANAGED_LOGIN_DOMAIN = "users.local";
const MANAGED_LOGIN_SUFFIX = `@${MANAGED_LOGIN_DOMAIN}`;
const ALLOWED_ROLES = new Set(["super_admin", "admin"]);
const ALLOWED_STATUSES = new Set(["active", "inactive", "suspended"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);

const buildManagedLoginEmail = (username: string) => `${normalizeUsername(username)}${MANAGED_LOGIN_SUFFIX}`;

type AuthUserSummary = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type ListedProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  must_change_password: boolean;
  created_at: string;
};

const getUsernameFromAuthUser = (authUser: AuthUserSummary) => {
  const metadataUsername = authUser.user_metadata?.username;
  if (typeof metadataUsername === "string" && metadataUsername.trim()) {
    return metadataUsername;
  }

  if (authUser.email?.endsWith(MANAGED_LOGIN_SUFFIX)) {
    return authUser.email.slice(0, -MANAGED_LOGIN_SUFFIX.length);
  }

  return authUser.email ?? "";
};

const ensureTargetProfileExists = async (
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) => {
  const { data: targetProfile, error } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  if (!targetProfile) {
    return false;
  }

  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Non autorisé" }, 401);
    }

    // Verify calling user is super_admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return json({ error: "Non autorisé" }, 401);
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
      return json({ error: "Accès réservé au Super Admin" }, 403);
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "create_user": {
        const username = normalizeUsername(String(params.username ?? ""));
        const password = String(params.password ?? "");
        const fullName = String(params.full_name ?? "").trim();
        const phone = String(params.phone ?? "").trim();
        const role = ALLOWED_ROLES.has(String(params.role)) ? String(params.role) : "admin";

        if (username.length < 3) {
          return json({ error: "Le nom d'utilisateur doit contenir au moins 3 caractères." }, 400);
        }

        if (password.length < 6) {
          return json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
        }

        if (!fullName) {
          return json({ error: "Le nom complet est obligatoire." }, 400);
        }

        const loginEmail = buildManagedLoginEmail(username);

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true,
          user_metadata: {
            username,
          },
        });

        if (createError) {
          const errorMessage = createError.message.toLowerCase().includes("already")
            ? "Ce nom d'utilisateur existe déjà."
            : createError.message;
          return json({ error: errorMessage }, 400);
        }

        const createdUserId = newUser.user.id;

        // Get caller's company_id to assign to new user
        const { data: callerProfile } = await adminClient
          .from("profiles")
          .select("company_id")
          .eq("id", caller.id)
          .single();

        const { error: profileError } = await adminClient.from("profiles").insert({
          id: createdUserId,
          full_name: fullName,
          phone: phone || "",
          status: "active",
          must_change_password: false,
          company_id: callerProfile?.company_id ?? null,
          business_name: fullName,
        });

        if (profileError) {
          await adminClient.auth.admin.deleteUser(createdUserId);
          return json({ error: profileError.message }, 400);
        }

        const { error: roleError } = await adminClient.from("user_roles").insert({
          user_id: createdUserId,
          role,
        });

        if (roleError) {
          await adminClient.auth.admin.deleteUser(createdUserId);
          return json({ error: roleError.message }, 400);
        }

        return json({ success: true, user_id: createdUserId, username });
      }

      case "update_status": {
        const { user_id, status } = params;
        if (!ALLOWED_STATUSES.has(String(status))) {
          return json({ error: "Statut invalide" }, 400);
        }

        const targetExists = await ensureTargetProfileExists(adminClient, String(user_id));
        if (!targetExists) {
          return json({ error: "Utilisateur non trouvé" }, 404);
        }

        const { error } = await adminClient.from("profiles").update({ status }).eq("id", user_id);
        if (error) throw error;
        return json({ success: true });
      }

      case "reset_password": {
        const { user_id, new_password } = params;
        if (String(new_password ?? "").length < 6) {
          return json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, 400);
        }

        const targetExists = await ensureTargetProfileExists(adminClient, String(user_id));
        if (!targetExists) {
          return json({ error: "Utilisateur non trouvé" }, 404);
        }

        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) throw error;

        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user_id);

        if (profileError) {
          throw profileError;
        }

        return json({ success: true });
      }

      case "list_users": {
        const { data: profiles, error: profilesError } = await adminClient
          .from("profiles")
          .select("id, full_name, phone, status, must_change_password, created_at")
          .order("created_at", { ascending: false });

        if (profilesError) {
          throw profilesError;
        }

        const profileIds = (profiles ?? []).map((profile) => profile.id);

        const { data: roleRows, error: rolesError } = profileIds.length === 0
          ? { data: [], error: null }
          : await adminClient
              .from("user_roles")
              .select("user_id, role")
              .in("user_id", profileIds);

        if (rolesError) {
          throw rolesError;
        }

        const { data: authUsersData, error: authUsersError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authUsersError) {
          throw authUsersError;
        }

        const authUserMap = new Map((authUsersData.users ?? []).map((authUser: AuthUserSummary) => [authUser.id, authUser]));
        const roleMap = new Map((roleRows ?? []).map((roleRow) => [roleRow.user_id, roleRow.role]));

        const enriched = (profiles ?? []).map((profile: ListedProfile) => {
          const authUser = authUserMap.get(profile.id);

          return {
            ...profile,
            email: authUser?.email || "",
            username: authUser ? getUsernameFromAuthUser(authUser) : "",
            role: roleMap.get(profile.id) || "admin",
          };
        });

        return json({ users: enriched });
      }

      case "delete_user": {
        const { user_id } = params;
        const targetExists = await ensureTargetProfileExists(adminClient, String(user_id));
        if (!targetExists) {
          return json({ error: "Utilisateur non trouvé" }, 404);
        }

        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return json({ success: true });
      }

      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return json({ error: message }, 500);
  }
});
