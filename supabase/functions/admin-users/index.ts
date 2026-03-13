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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check - get calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has admin or manager role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const roles = (callerRoles || []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("manager")) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    let result: any;

    switch (action) {
      case "create_user": {
        const { email, password, full_name, phone, role } = payload;

        // Create user via admin API
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update phone in profile (trigger creates profile)
        if (phone) {
          await adminClient
            .from("profiles")
            .update({ phone })
            .eq("id", newUser.user.id);
        }

        // Assign role
        if (role) {
          await adminClient
            .from("user_roles")
            .insert({ user_id: newUser.user.id, role });
        }

        result = { success: true, user_id: newUser.user.id };
        break;
      }

      case "update_user": {
        const { user_id, full_name, phone, avatar_url, is_active, roles: newRoles } = payload;

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
            return new Response(JSON.stringify({ error: profileError.message }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Update roles if provided
        if (newRoles !== undefined) {
          // Delete existing roles
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", user_id);

          // Insert new roles
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

        await adminClient
          .from("profiles")
          .update({ is_active: false })
          .eq("id", user_id);

        // Also ban user in auth to prevent login
        await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876600h", // ~100 years
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

        const { error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = { success: true };
        break;
      }

      case "reset_password_manual": {
        const { user_id, new_password } = payload;

        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        result = { success: true };
        break;
      }

      case "list_users": {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

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

        result = { users };
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
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
