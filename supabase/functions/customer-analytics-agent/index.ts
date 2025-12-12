import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerAnalytics {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  created_at: string;
  repairCount: number;
  totalSpent: number;
  lastVisit: string | null;
  avgInterval: number | null;
  predictedReturn: string | null;
  daysOverdue: number | null;
  score: number;
  scoreBreakdown: {
    lifetimeValue: number;
    frequency: number;
    recency: number;
    loyalty: number;
    engagement: number;
  };
}

// Calculate customer score (0-100)
function calculateScore(
  totalSpent: number,
  repairCount: number,
  daysSinceLastVisit: number | null,
  hasAccount: boolean,
  maxSpent: number
): { score: number; breakdown: CustomerAnalytics["scoreBreakdown"] } {
  // Lifetime Value (30%) - normalized against max spender
  const lifetimeValue = maxSpent > 0 ? Math.min((totalSpent / maxSpent) * 100, 100) : 0;

  // Frequency (25%) - repairs per year, max at 12
  const frequency = Math.min((repairCount / 12) * 100, 100);

  // Recency (20%) - penalty for days since last visit
  let recency = 100;
  if (daysSinceLastVisit !== null) {
    if (daysSinceLastVisit > 365) recency = 0;
    else if (daysSinceLastVisit > 180) recency = 20;
    else if (daysSinceLastVisit > 90) recency = 50;
    else if (daysSinceLastVisit > 30) recency = 80;
  }

  // Loyalty (15%) - assumes 100% if only this centro (simplified)
  const loyalty = 100;

  // Engagement (10%) - has webapp account
  const engagement = hasAccount ? 100 : 30;

  const score = Math.round(
    lifetimeValue * 0.3 +
    frequency * 0.25 +
    recency * 0.2 +
    loyalty * 0.15 +
    engagement * 0.1
  );

  return {
    score: Math.min(Math.max(score, 0), 100),
    breakdown: {
      lifetimeValue: Math.round(lifetimeValue),
      frequency: Math.round(frequency),
      recency: Math.round(recency),
      loyalty: Math.round(loyalty),
      engagement: Math.round(engagement),
    },
  };
}

// Calculate return prediction based on visit intervals
function calculateReturnPrediction(visitDates: Date[]): {
  avgInterval: number | null;
  predictedReturn: Date | null;
  confidence: number;
} {
  if (visitDates.length < 2) {
    return { avgInterval: null, predictedReturn: null, confidence: 0 };
  }

  // Sort dates descending
  const sorted = visitDates.sort((a, b) => b.getTime() - a.getTime());

  // Calculate intervals between visits
  const intervals: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (sorted[i].getTime() - sorted[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }

  // Average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Standard deviation for confidence
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Confidence: lower stdDev = higher confidence
  const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avgInterval) * 50));

  // Predicted next visit
  const lastVisit = sorted[0];
  const predictedReturn = new Date(lastVisit.getTime() + avgInterval * 24 * 60 * 60 * 1000);

  return { avgInterval: Math.round(avgInterval), predictedReturn, confidence };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, centroId, question } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all customers for this centro with their repair history
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select(`
        id, name, email, phone, created_at,
        devices (
          id,
          repairs (
            id, final_cost, estimated_cost, created_at, completed_at
          )
        )
      `)
      .eq("centro_id", centroId);

    if (customersError) throw customersError;

    // Get repair_requests too
    const { data: repairRequests } = await supabase
      .from("repair_requests")
      .select("customer_id, estimated_cost, created_at")
      .eq("assigned_provider_id", centroId);

    // Check which customers have webapp accounts
    const customerEmails = customers?.filter(c => c.email).map(c => c.email) || [];
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailsWithAccounts = new Set(
      authUsers?.users?.map(u => u.email?.toLowerCase()) || []
    );

    // Calculate max spent for normalization
    let maxSpent = 0;
    const customerData: CustomerAnalytics[] = [];

    // First pass: calculate all spending
    for (const customer of customers || []) {
      const repairs = customer.devices?.flatMap(d => d.repairs || []) || [];
      const requests = repairRequests?.filter(r => r.customer_id === customer.id) || [];
      
      const totalSpent = repairs.reduce((sum, r) => sum + (r.final_cost || r.estimated_cost || 0), 0) +
        requests.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);
      
      if (totalSpent > maxSpent) maxSpent = totalSpent;
    }

    // Second pass: build analytics
    for (const customer of customers || []) {
      const repairs = customer.devices?.flatMap(d => d.repairs || []) || [];
      const requests = repairRequests?.filter(r => r.customer_id === customer.id) || [];
      
      const repairCount = repairs.length + requests.length;
      const totalSpent = repairs.reduce((sum, r) => sum + (r.final_cost || r.estimated_cost || 0), 0) +
        requests.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);

      // Collect all visit dates
      const visitDates: Date[] = [
        ...repairs.map(r => new Date(r.created_at)),
        ...requests.map(r => new Date(r.created_at)),
      ];

      // Sort and get last visit
      visitDates.sort((a, b) => b.getTime() - a.getTime());
      const lastVisit = visitDates[0] || null;
      const daysSinceLastVisit = lastVisit
        ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Return prediction
      const prediction = calculateReturnPrediction(visitDates);

      // Days overdue
      let daysOverdue: number | null = null;
      if (prediction.predictedReturn) {
        const diff = Date.now() - prediction.predictedReturn.getTime();
        if (diff > 0) {
          daysOverdue = Math.floor(diff / (1000 * 60 * 60 * 24));
        }
      }

      // Check if has account
      const hasAccount = customer.email
        ? emailsWithAccounts.has(customer.email.toLowerCase())
        : false;

      // Calculate score
      const { score, breakdown } = calculateScore(
        totalSpent,
        repairCount,
        daysSinceLastVisit,
        hasAccount,
        maxSpent
      );

      customerData.push({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        created_at: customer.created_at,
        repairCount,
        totalSpent,
        lastVisit: lastVisit?.toISOString() || null,
        avgInterval: prediction.avgInterval,
        predictedReturn: prediction.predictedReturn?.toISOString() || null,
        daysOverdue,
        score,
        scoreBreakdown: breakdown,
      });
    }

    // Handle different actions
    if (action === "getAnalytics") {
      return new Response(JSON.stringify({ customers: customerData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chat" && question) {
      // Use Lovable AI for natural language queries
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      // Prepare summary stats for AI context
      const totalCustomers = customerData.length;
      const goldCustomers = customerData.filter(c => c.score >= 80).length;
      const atRiskCustomers = customerData.filter(c => c.score < 50).length;
      const overdueCustomers = customerData.filter(c => c.daysOverdue && c.daysOverdue > 0);
      const topSpenders = [...customerData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
      const shouldReturnThisWeek = customerData.filter(c => {
        if (!c.predictedReturn) return false;
        const pred = new Date(c.predictedReturn);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return pred >= now && pred <= weekFromNow;
      });

      const systemPrompt = `Sei un assistente AI esperto in analisi clienti per un centro riparazioni smartphone.
Hai accesso ai seguenti dati sui clienti:

STATISTICHE GENERALI:
- Totale clienti: ${totalCustomers}
- Clienti Gold (score >= 80): ${goldCustomers}
- Clienti a Rischio (score < 50): ${atRiskCustomers}
- Clienti in ritardo sul ritorno: ${overdueCustomers.length}
- Clienti che dovrebbero tornare questa settimana: ${shouldReturnThisWeek.length}

TOP 5 SPENDITORI:
${topSpenders.map((c, i) => `${i + 1}. ${c.name}: €${c.totalSpent.toFixed(0)} (${c.repairCount} riparazioni, score: ${c.score})`).join("\n")}

CLIENTI IN RITARDO:
${overdueCustomers.slice(0, 10).map(c => `- ${c.name}: in ritardo di ${c.daysOverdue} giorni (ultima visita: ${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("it-IT") : "N/A"})`).join("\n") || "Nessuno"}

CLIENTI CHE DOVREBBERO TORNARE QUESTA SETTIMANA:
${shouldReturnThisWeek.slice(0, 10).map(c => `- ${c.name}: ritorno previsto ${new Date(c.predictedReturn!).toLocaleDateString("it-IT")}`).join("\n") || "Nessuno"}

DATI COMPLETI CLIENTI (primi 50):
${JSON.stringify(customerData.slice(0, 50).map(c => ({
  nome: c.name,
  score: c.score,
  spesaTotale: c.totalSpent,
  riparazioni: c.repairCount,
  ultimaVisita: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("it-IT") : null,
  ritornoPrevistp: c.predictedReturn ? new Date(c.predictedReturn).toLocaleDateString("it-IT") : null,
  giorniRitardo: c.daysOverdue,
})), null, 2)}

Rispondi in italiano, in modo conciso e pratico. Usa emoji per rendere la risposta più leggibile. Fornisci insight actionable.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI error:", response.status, errText);
        throw new Error("AI service error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
