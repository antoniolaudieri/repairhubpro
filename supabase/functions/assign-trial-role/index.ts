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
  role_type?: string; // 'centro' or 'corner' - explicit role from URL
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
    const { user_id, lead_id, user_email, role_type }: AssignRoleRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`assign-trial-role: Assigning role for user ${user_id}, lead_id: ${lead_id}, email: ${user_email}, role_type: ${role_type}`);

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

    // Determine role - priority: explicit role_type > lead's business_type > default
    let role = "centro_admin"; // Default role
    
    if (role_type === 'corner') {
      role = "corner_admin";
      console.log(`assign-trial-role: Using explicit role_type from URL: corner_admin`);
    } else if (role_type === 'centro') {
      role = "centro_admin";
      console.log(`assign-trial-role: Using explicit role_type from URL: centro_admin`);
    } else if (lead) {
      console.log(`assign-trial-role: Lead found with business_type: ${lead.business_type}`);
      if (lead.business_type === "corner") {
        role = "corner_admin";
      } else {
        role = "centro_admin";
      }
    } else {
      console.log("assign-trial-role: No explicit role_type or lead found, assigning default centro_admin role");
    }
    
    console.log(`assign-trial-role: Assigning role '${role}' to user ${user_id}`);

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

    // Create the centro or corner record
    if (role === "centro_admin") {
      // Create centro_assistenza record with basic info
      const centroData = {
        owner_user_id: user_id,
        business_name: lead?.business_name || "Nuovo Centro",
        email: lead?.email || user_email || "",
        phone: "",
        address: "",
        status: "pending", // Will need to complete profile
      };
      
      const { error: centroError } = await supabase
        .from("centri_assistenza")
        .insert(centroData);
      
      if (centroError) {
        console.error("assign-trial-role: Error creating centro:", centroError);
        // Don't fail the whole operation, just log
      } else {
        console.log(`assign-trial-role: Created centro for user ${user_id}`);
      }
    } else if (role === "corner_admin") {
      // Create corner record with basic info
      const cornerData = {
        user_id: user_id,
        business_name: lead?.business_name || "Nuovo Corner",
        email: lead?.email || user_email || "",
        phone: "",
        address: "",
        status: "pending", // Will need to complete profile
      };
      
      const { error: cornerError } = await supabase
        .from("corners")
        .insert(cornerData);
      
      if (cornerError) {
        console.error("assign-trial-role: Error creating corner:", cornerError);
        // Don't fail the whole operation, just log
      } else {
        console.log(`assign-trial-role: Created corner for user ${user_id}`);
      }
    }

    // Update lead status to converted (only if we have a lead)
    if (actualLeadId) {
      await supabase
        .from("marketing_leads")
        .update({
          status: 'converted',
          conversion_date: new Date().toISOString(),
          converted_entity_id: user_id,
          converted_entity_type: role === "corner_admin" ? 'corner' : 'centro',
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
