/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 * 
 * Edge function para gerenciamento administrativo de usuários
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function countActiveAdmins(adminClient: any): Promise<number> {
  const { data: adminRoles } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

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

        // Managers cannot create admins
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

        // Wait for trigger handle_new_user to create profile, then upsert
        const userId = newUser.user.id;
        let profileReady = false;
        for (let i = 0; i < 5; i++) {
          const { data: existing } = await adminClient
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (existing) {
            profileReady = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        // Upsert profile data (phone, etc.) — handles both trigger-created and missing profiles
        const profileData: any = {
          id: userId,
          full_name,
          email,
        };
        if (phone) profileData.phone = phone;

        await adminClient
          .from("profiles")
          .upsert(profileData, { onConflict: "id" });

        // Assign role
        if (role) {
          await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role });
        }

        result = { success: true, user_id: userId };
        break;
      }

      case "update_user": {
        const { user_id, full_name, phone, avatar_url, is_active, roles: newRoles } = payload;

        // --- Last admin protection for role changes ---
        if (newRoles !== undefined) {
          // Check if target user currently has admin role
          const { data: currentRoles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user_id);

          const currentRoleList = (currentRoles || []).map((r: any) => r.role);
          const hadAdmin = currentRoleList.includes("admin");
          const willHaveAdmin = newRoles.includes("admin");

          // Manager cannot assign or remove admin role
          if (!callerIsAdmin && (hadAdmin || willHaveAdmin)) {
            return jsonResponse({ error: "Apenas administradores podem modificar a role de admin" }, 403);
          }

          // Prevent removing admin from last active admin
          if (hadAdmin && !willHaveAdmin) {
            const activeAdminCount = await countActiveAdmins(adminClient);
            if (activeAdminCount <= 1) {
              return jsonResponse({ error: "Não é possível remover a role admin do último administrador ativo" }, 400);
            }
          }
        }

        // --- Last admin protection for is_active ---
        if (is_active === false) {
          const { data: targetRoles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user_id);

          if ((targetRoles || []).some((r: any) => r.role === "admin")) {
            const activeAdminCount = await countActiveAdmins(adminClient);
            if (activeAdminCount <= 1) {
              return jsonResponse({ error: "Não é possível desativar o último administrador ativo" }, 400);
            }
          }
        }

        // Update profile
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

        // Sync auth ban status with is_active
        if (is_active !== undefined) {
          if (is_active === false) {
            await adminClient.auth.admin.updateUserById(user_id, {
              ban_duration: "876600h",
            });
          } else {
            await adminClient.auth.admin.updateUserById(user_id, {
              ban_duration: "none",
            });
          }
        }

        // Update roles if provided
        if (newRoles !== undefined) {
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", user_id);

          if (newRoles.length > 0) {
            const roleInserts = newRoles.map((role: string) => ({
              user_id,
              role,
            }));
            await adminClient.from("user_roles").insert(roleInserts);
          }
        }

        result = { success: true };
        break;
      }

      case "deactivate_user": {
        const { user_id } = payload;

        // Last admin protection
        const { data: targetRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);

        if ((targetRoles || []).some((r: any) => r.role === "admin")) {
          const activeAdminCount = await countActiveAdmins(adminClient);
          if (activeAdminCount <= 1) {
            return jsonResponse({ error: "Não é possível desativar o último administrador ativo" }, 400);
          }
        }

        await adminClient
          .from("profiles")
          .update({ is_active: false })
          .eq("id", user_id);

        await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876600h",
        });

        result = { success: true };
        break;
      }

      case "activate_user": {
        const { user_id } = payload;

        await adminClient
          .from("profiles")
          .update({ is_active: true })
          .eq("id", user_id);

        await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });

        result = { success: true };
        break;
      }

      case "reset_password_email": {
        const { email } = payload;

        // generateLink generates a recovery link but does NOT send email automatically
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });

        if (error) {
          return jsonResponse({ error: error.message }, 400);
        }

        // Return the link explicitly for administrative use
        const actionLink = data?.properties?.action_link || null;

        result = {
          success: true,
          recovery_link: actionLink,
          note: "Link de recuperação gerado. O email NÃO foi enviado automaticamente. Copie o link e envie manualmente ao usuário.",
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
        // Get all profiles
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        // Get all auth users to detect inconsistencies
        const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const authUserIds = new Set((authUsersData?.users || []).map((u: any) => u.id));

        const { data: allRoles } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const rolesMap: Record<string, string[]> = {};
        (allRoles || []).forEach((r: any) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });

        const users = (profiles || []).map((p: any) => ({
          ...p,
          roles: rolesMap[p.id] || [],
        }));

        // Detect auth users without profile (orphaned)
        const profileIds = new Set((profiles || []).map((p: any) => p.id));
        const orphanedAuthUsers = (authUsersData?.users || [])
          .filter((u: any) => !profileIds.has(u.id))
          .map((u: any) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
          }));

        result = { users, orphaned_auth_users: orphanedAuthUsers };
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
          .eq("user_id", user_id);

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
          .in("role", ["bench_technician", "field_technician"]);

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
    return jsonResponse({ error: err.message }, 500);
  }
});
