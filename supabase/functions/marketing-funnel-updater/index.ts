import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-funnel-updater: Starting funnel update");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if automation is enabled
    const { data: settings } = await supabase
      .from("marketing_automation_settings")
      .select("*")
      .single();

    if (!settings?.is_enabled || !settings?.auto_funnel_enabled) {
      console.log("marketing-funnel-updater: Funnel automation disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Funnel automation disabled", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get funnel stages with auto-advance rules
    const { data: stages, error: stagesError } = await supabase
      .from("marketing_funnel_stages")
      .select("*")
      .not("auto_advance_after_days", "is", null)
      .not("auto_advance_to_stage_id", "is", null)
      .eq("is_active", true);

    if (stagesError) throw stagesError;

    if (!stages || stages.length === 0) {
      console.log("marketing-funnel-updater: No auto-advance rules configured");
      return new Response(
        JSON.stringify({ success: true, message: "No auto-advance rules", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalUpdated = 0;

    for (const stage of stages) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - stage.auto_advance_after_days);

      // Find leads in this stage that haven't interacted
      let query = supabase
        .from("marketing_leads")
        .select("id, business_name, last_interaction_at, email_opens_count")
        .eq("funnel_stage_id", stage.id);

      // Apply condition-specific filters
      if (stage.auto_advance_condition === 'no_response') {
        query = query.eq("email_opens_count", 0);
      }

      const { data: leadsToAdvance, error: leadsError } = await query;

      if (leadsError) {
        console.error(`marketing-funnel-updater: Error fetching leads for stage ${stage.name}:`, leadsError);
        continue;
      }

      // Filter leads that should advance based on time
      const leadsToUpdate = (leadsToAdvance || []).filter(lead => {
        const lastInteraction = lead.last_interaction_at ? new Date(lead.last_interaction_at) : null;
        // If no interaction, use a very old date
        const checkDate = lastInteraction || new Date(0);
        return checkDate < cutoffDate;
      });

      if (leadsToUpdate.length === 0) continue;

      console.log(`marketing-funnel-updater: Moving ${leadsToUpdate.length} leads from "${stage.name}" to next stage`);

      // Update leads
      const leadIds = leadsToUpdate.map(l => l.id);
      
      const { error: updateError } = await supabase
        .from("marketing_leads")
        .update({ 
          funnel_stage_id: stage.auto_advance_to_stage_id,
          updated_at: new Date().toISOString()
        })
        .in("id", leadIds);

      if (updateError) {
        console.error(`marketing-funnel-updater: Error updating leads:`, updateError);
        continue;
      }

      totalUpdated += leadsToUpdate.length;

      // Log the updates
      for (const lead of leadsToUpdate) {
        await supabase
          .from("marketing_automation_logs")
          .insert({
            log_type: 'funnel',
            message: `Lead "${lead.business_name}" spostato automaticamente da "${stage.name}" (${stage.auto_advance_condition})`,
            details: { 
              lead_id: lead.id, 
              from_stage: stage.id, 
              to_stage: stage.auto_advance_to_stage_id,
              condition: stage.auto_advance_condition,
              days_inactive: stage.auto_advance_after_days
            },
            lead_id: lead.id,
          });
      }
    }

    // Also check for leads that should be marked as "won" (converted)
    // This would typically be done manually or via integration with actual signups

    // Check for stale "new" leads (>30 days without any activity)
    const { data: staleNewLeads } = await supabase
      .from("marketing_leads")
      .select("id, business_name")
      .eq("status", "new")
      .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .is("contacted_at", null);

    if (staleNewLeads && staleNewLeads.length > 0) {
      console.log(`marketing-funnel-updater: Found ${staleNewLeads.length} stale new leads`);
      
      // Log warning for stale leads
      await supabase
        .from("marketing_automation_logs")
        .insert({
          log_type: 'info',
          message: `${staleNewLeads.length} lead nuovi non contattati da più di 30 giorni`,
          details: { 
            count: staleNewLeads.length, 
            lead_ids: staleNewLeads.map(l => l.id) 
          },
        });
    }

    console.log(`marketing-funnel-updater: Completed. Updated ${totalUpdated} leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: totalUpdated,
        staleLeads: staleNewLeads?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("marketing-funnel-updater: Error:", error);
    
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'error',
        message: `Errore generale funnel updater: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) },
      });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
