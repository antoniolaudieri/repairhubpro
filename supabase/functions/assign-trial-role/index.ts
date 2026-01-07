import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignRoleRequest {
  user_id: string;
  lead_id?: string;
  user_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { user_id, lead_id, user_email }: AssignRoleRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`assign-trial-role: Assigning role for user ${user_id}, lead_id: ${lead_id}, email: ${user_email}`);

    // Try to find lead by ID first, then by email
    let lead = null;
    let actualLeadId = lead_id;

    if (lead_id) {
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("id, business_type, business_name, email")
        .eq("id", lead_id)
        .single();
      
      if (!error && data) {
        lead = data;
      }
    }

    // If no lead found by ID, try to find by email
    if (!lead && user_email) {
      console.log(`assign-trial-role: Lead not found by ID, trying email: ${user_email}`);
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("id, business_type, business_name, email")
        .eq("email", user_email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        lead = data;
        actualLeadId = data.id;
        console.log(`assign-trial-role: Found lead by email: ${data.id}`);
      }
    }

    // If still no lead, assign default centro_admin role for trial users
    if (!lead) {
      console.log("assign-trial-role: No lead found, assigning default centro_admin role");
    }

    // All leads from marketing are businesses, assign centro_admin role
    const role = "centro_admin";

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user_id)
      .eq("role", role)
      .single();

    if (existingRole) {
      console.log(`assign-trial-role: Role '${role}' already exists for user`);
      return new Response(
        JSON.stringify({ success: true, role, message: "Role already assigned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the role using service key (bypasses RLS)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user_id,
        role: role,
      });

    if (roleError) {
      console.error("assign-trial-role: Error assigning role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to assign role", details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update lead status to converted (only if we have a lead)
    if (actualLeadId) {
      await supabase
        .from("marketing_leads")
        .update({
          status: 'converted',
          conversion_date: new Date().toISOString(),
          converted_entity_id: user_id,
          converted_entity_type: 'centro',
        })
        .eq("id", actualLeadId);

      // Move to "Converted" funnel stage
      const { data: convertedStage } = await supabase
        .from("marketing_funnel_stages")
        .select("id")
        .eq("stage_order", 5)
        .single();

      if (convertedStage) {
        await supabase
          .from("marketing_leads")
          .update({ funnel_stage_id: convertedStage.id })
          .eq("id", actualLeadId);
      }

      // Log conversion
      await supabase
        .from("marketing_automation_logs")
        .insert({
          log_type: 'conversion',
          message: `Lead convertito - registrazione completata come ${role}`,
          details: { 
            lead_id: actualLeadId, 
            email: lead?.email || user_email,
            user_id: user_id,
            role: role,
            business_name: lead?.business_name || 'N/A',
          },
          lead_id: actualLeadId,
        });

      console.log(`assign-trial-role: Successfully assigned role '${role}' to user from lead: ${lead?.business_name}`);
    } else {
      console.log(`assign-trial-role: Successfully assigned role '${role}' to user (no lead found)`);
    }

    return new Response(
      JSON.stringify({ success: true, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("assign-trial-role: Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
