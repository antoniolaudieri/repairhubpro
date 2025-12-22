import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const centroId = url.searchParams.get('centro_id');
    
    if (!centroId) {
      // Return default manifest
      const defaultManifest = {
        name: "Diagnostica Dispositivo",
        short_name: "Diagnostica",
        description: "App per diagnostica e monitoraggio salute dispositivo",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        orientation: "portrait",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };
      
      return new Response(
        JSON.stringify(defaultManifest, null, 2),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=3600'
          } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch centro info
    const { data: centro, error } = await supabase
      .from('centri_assistenza')
      .select('id, business_name, logo_url')
      .eq('id', centroId)
      .single();

    if (error || !centro) {
      console.error('Centro not found:', centroId, error);
      return new Response(
        JSON.stringify({ error: 'Centro not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build icons array
    const icons = [];
    
    if (centro.logo_url) {
      // Use centro logo as icon
      icons.push({
        src: centro.logo_url,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      });
      icons.push({
        src: centro.logo_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      });
    }
    
    // Always include fallback icons
    icons.push({
      src: "/pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable"
    });
    icons.push({
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    });

    // Short name - max 12 characters
    const shortName = centro.business_name.length > 12 
      ? centro.business_name.substring(0, 12).trim()
      : centro.business_name;

    const manifest = {
      name: `${centro.business_name} - Diagnostica`,
      short_name: shortName,
      description: `App per diagnostica dispositivo presso ${centro.business_name}`,
      start_url: `/install/${centroId}`,
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#000000",
      orientation: "portrait",
      categories: ["utilities", "productivity"],
      icons,
      screenshots: [],
      shortcuts: [
        {
          name: "Nuova Diagnosi",
          short_name: "Diagnosi",
          description: "Avvia una nuova diagnostica del dispositivo",
          url: "/device-health",
          icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
        }
      ],
      related_applications: [],
      prefer_related_applications: false
    };

    console.log(`Generated manifest for centro: ${centro.business_name} (${centroId})`);

    return new Response(
      JSON.stringify(manifest, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=3600'
        } 
      }
    );
  } catch (error) {
    console.error('Error generating manifest:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
