/**
 * Edge function para gerenciamento administrativo de usuários
 * Secured: validates JWT via getClaims + tenant context
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function countActiveAdmins(adminClient: any, tenantId: string): Promise<number> {
  const { data: adminRoles } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .eq("tenant_id", tenantId);

  if (!adminRoles || adminRoles.length === 0) return 0;

  const adminIds = [...new Set(adminRoles.map((r: any) => r.user_id))];

  const { data: activeProfiles } = await adminClient
    .from("profiles")
    .select("id")
    .in("id", adminIds)
    .eq("is_active", true);

  return activeProfiles?.length || 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH: Validate JWT via getUser ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    const callerId = user.id;

    // --- TENANT: Read from header ---
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return jsonResponse({ error: "Tenant não especificado" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate caller belongs to this tenant
    const { data: tenantLink } = await adminClient
      .from("tenant_users")
      .select("tenant_role")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();

    if (!tenantLink) {
      return jsonResponse({ error: "Acesso negado ao tenant" }, 403);
    }

    // Check caller roles within this tenant
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("tenant_id", tenantId);

    const roles = (callerRoles || []).map((r: any) => r.role);
    const callerIsAdmin = roles.includes("admin");
    const callerIsManager = roles.includes("manager");

    if (!callerIsAdmin && !callerIsManager) {
      return jsonResponse({ error: "Permissão negada" }, 403);
    }

    const { action, ...payload } = await req.json();

    let result: any;

    switch (action) {
      case "create_user": {
        const { email, password, full_name, phone, role } = payload;

        if (!callerIsAdmin && role === "admin") {
          return jsonResponse({ error: "Apenas administradores podem criar outros administradores" }, 403);
        }

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          return jsonResponse({ error: createError.message }, 400);
        }

        const userId = newUser.user.id;
        let profileReady = false;
        for (let i = 0; i < 5; i++) {
          const { data: existing } = await adminClient
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (existing) { profileReady = true; break; }
          await new Promise((r) => setTimeout(r, 300));
        }

        const profileData: any = { id: userId, full_name, email };
        if (phone) profileData.phone = phone;

        await adminClient
          .from("profiles")
          .upsert(profileData, { onConflict: "id" });

        // Assign role WITH tenant_id
        if (role) {
          await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role, tenant_id: tenantId });
        }

        // Add user to this tenant
        await adminClient
          .from("tenant_users")
          .upsert({ tenant_id: tenantId, user_id: userId, tenant_role: "member", is_default: true, is_active: true }, { onConflict: "tenant_id,user_id" });

        // Link to collection point if provided
        if (payload.collection_point_id) {
          await adminClient
            .from("collection_point_users")
            .upsert(
              { collection_point_id: payload.collection_point_id, user_id: userId, tenant_id: tenantId, is_active: true },
              { onConflict: "collection_point_id,user_id" }
            );
          // Also set collection_point_id on profile for RLS shortcuts
          await adminClient
            .from("profiles")
            .update({ collection_point_id: payload.collection_point_id })
            .eq("id", userId);
        }

        result = { success: true, user_id: userId };
        break;
      }

      case "update_user": {
        const { user_id, full_name, phone, avatar_url, is_active, roles: newRoles } = payload;

        if (newRoles !== undefined) {
          const { data: currentRoles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user_id)
            .eq("tenant_id", tenantId);

          const currentRoleList = (currentRoles || []).map((r: any) => r.role);
          const hadAdmin = currentRoleList.includes("admin");
          const willHaveAdmin = newRoles.includes("admin");

          if (!callerIsAdmin && (hadAdmin || willHaveAdmin)) {
            return jsonResponse({ error: "Apenas administradores podem modificar a role de admin" }, 403);
          }

          if (hadAdmin && !willHaveAdmin) {
            const activeAdminCount = await countActiveAdmins(adminClient, tenantId);
            if (activeAdminCount <= 1) {
              return jsonResponse({ error: "Não é possível remover a role admin do último administrador ativo" }, 400);
            }
          }
        }

        if (is_active === false) {
          const { data: targetRoles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user_id)
            .eq("tenant_id", tenantId);

          if ((targetRoles || []).some((r: any) => r.role === "admin")) {
            const activeAdminCount = await countActiveAdmins(adminClient, tenantId);
            if (activeAdminCount <= 1) {
              return jsonResponse({ error: "Não é possível desativar o último administrador ativo" }, 400);
            }
          }
        }

        const profileUpdate: any = {};
        if (full_name !== undefined) profileUpdate.full_name = full_name;
        if (phone !== undefined) profileUpdate.phone = phone;
        if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url;
        if (is_active !== undefined) profileUpdate.is_active = is_active;

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await adminClient
            .from("profiles")
            .update(profileUpdate)
            .eq("id", user_id);

          if (profileError) {
            return jsonResponse({ error: profileError.message }, 400);
          }
        }

        if (is_active !== undefined) {
          if (is_active === false) {
            await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
          } else {
            await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
          }
        }

        // Update roles scoped to THIS tenant
        if (newRoles !== undefined) {
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", user_id)
            .eq("tenant_id", tenantId);

          if (newRoles.length > 0) {
            const roleInserts = newRoles.map((role: string) => ({
              user_id,
              role,
              tenant_id: tenantId,
            }));
            await adminClient.from("user_roles").insert(roleInserts);
          }
        }

        result = { success: true };
        break;
      }

      case "deactivate_user": {
        const { user_id } = payload;

        const { data: targetRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id)
          .eq("tenant_id", tenantId);

        if ((targetRoles || []).some((r: any) => r.role === "admin")) {
          const activeAdminCount = await countActiveAdmins(adminClient, tenantId);
          if (activeAdminCount <= 1) {
            return jsonResponse({ error: "Não é possível desativar o último administrador ativo" }, 400);
          }
        }

        await adminClient
          .from("profiles")
          .update({ is_active: false })
          .eq("id", user_id);

        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });

        result = { success: true };
        break;
      }

      case "activate_user": {
        const { user_id } = payload;

        await adminClient
          .from("profiles")
          .update({ is_active: true })
          .eq("id", user_id);

        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });

        result = { success: true };
        break;
      }

      case "reset_password_email": {
        const { email } = payload;

        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        const actionLink = data?.properties?.action_link || null;

        result = {
          success: true,
          recovery_link: actionLink,
          note: "Link de recuperação gerado. O email NÃO foi enviado automaticamente.",
        };
        break;
      }

      case "reset_password_manual": {
        const { user_id, new_password } = payload;

        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        result = { success: true };
        break;
      }

      case "list_users": {
        // Get users that belong to this tenant
        const { data: tenantUserLinks } = await adminClient
          .from("tenant_users")
          .select("user_id")
          .eq("tenant_id", tenantId)
          .eq("is_active", true);

        const tenantUserIds = (tenantUserLinks || []).map((tu: any) => tu.user_id);

        if (tenantUserIds.length === 0) {
          result = { users: [], orphaned_auth_users: [] };
          break;
        }

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*")
          .in("id", tenantUserIds)
          .order("created_at", { ascending: false });

        const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const authUsersMap = new Map<string, any>();
        (authUsersData?.users || []).forEach((u: any) => {
          authUsersMap.set(u.id, u);
        });

        const { data: allRoles } = await adminClient
          .from("user_roles")
          .select("user_id, role")
          .eq("tenant_id", tenantId);

        const rolesMap: Record<string, string[]> = {};
        (allRoles || []).forEach((r: any) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });

        const users = (profiles || []).map((p: any) => {
          const authUser = authUsersMap.get(p.id);
          return {
            ...p,
            roles: rolesMap[p.id] || [],
            last_sign_in_at: authUser?.last_sign_in_at || null,
          };
        });

        result = { users, orphaned_auth_users: [] };
        break;
      }

      case "get_user": {
        const { user_id } = payload;

        const { data: profile } = await adminClient
          .from("profiles")
          .select("*")
          .eq("id", user_id)
          .single();

        const { data: userRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id)
          .eq("tenant_id", tenantId);

        result = {
          ...profile,
          roles: (userRoles || []).map((r: any) => r.role),
        };
        break;
      }

      case "list_technicians": {
        const { data: techRoles } = await adminClient
          .from("user_roles")
          .select("user_id")
          .in("role", ["bench_technician", "field_technician"])
          .eq("tenant_id", tenantId);

        const techIds = [...new Set((techRoles || []).map((r: any) => r.user_id))];

        if (techIds.length === 0) {
          result = { technicians: [] };
          break;
        }

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, full_name, email, phone, is_active")
          .in("id", techIds)
          .eq("is_active", true);

        result = { technicians: profiles || [] };
        break;
      }

      default:
        return jsonResponse({ error: "Ação inválida" }, 400);
    }

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
