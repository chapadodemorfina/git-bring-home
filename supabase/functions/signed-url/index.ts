import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { bucket, path } = await req.json();
    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "bucket and path are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Admin client for role checks and signed URL generation
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user roles
    const { data: roles } = await adminClient.rpc("get_user_roles", {
      _user_id: userId,
    });
    const userRoles: string[] = roles || [];

    const privilegedRoles = [
      "admin",
      "manager",
      "front_desk",
      "bench_technician",
      "field_technician",
    ];
    const hasPrivilegedAccess = userRoles.some((r) =>
      privilegedRoles.includes(r)
    );

    if (!hasPrivilegedAccess) {
      // Validate access based on bucket and path
      const pathSegments = path.split("/");
      const entityId = pathSegments[0]; // deviceId or serviceOrderId

      if (bucket === "device-photos") {
        // Customer: must own the device
        if (userRoles.includes("customer")) {
          const { data: device } = await adminClient
            .from("devices")
            .select("customer_id, customers!inner(email)")
            .eq("id", entityId)
            .single();

          const { data: authUser } = await adminClient.auth.admin.getUserById(
            userId
          );
          if (
            !device ||
            (device as any).customers?.email !== authUser?.user?.email
          ) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (bucket === "service-order-attachments") {
        // For logistics paths like "logistics/{id}/file", skip entity check for privileged
        const soId =
          pathSegments[0] === "logistics" ? null : pathSegments[0];

        if (soId) {
          if (userRoles.includes("customer")) {
            const { data: so } = await adminClient
              .from("service_orders")
              .select("customer_id, customers!inner(email)")
              .eq("id", soId)
              .single();

            const { data: authUser } =
              await adminClient.auth.admin.getUserById(userId);
            if (
              !so ||
              (so as any).customers?.email !== authUser?.user?.email
            ) {
              return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              });
            }
          } else if (userRoles.includes("collection_point_operator")) {
            const { data: so } = await adminClient
              .from("service_orders")
              .select("collection_point_id")
              .eq("id", soId)
              .single();

            if (so?.collection_point_id) {
              const { data: cpLink } = await adminClient
                .from("collection_point_users")
                .select("id")
                .eq("collection_point_id", so.collection_point_id)
                .eq("user_id", userId)
                .eq("is_active", true)
                .maybeSingle();

              if (!cpLink) {
                return new Response(JSON.stringify({ error: "Forbidden" }), {
                  status: 403,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                });
              }
            } else {
              return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              });
            }
          } else if (userRoles.includes("finance")) {
            // finance can view attachments
          } else {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else {
        return new Response(JSON.stringify({ error: "Invalid bucket" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate signed URL (60 min expiry)
    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signedError) {
      console.error("Signed URL error:", signedError);
      return new Response(
        JSON.stringify({ error: "Failed to generate signed URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("signed-url error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
