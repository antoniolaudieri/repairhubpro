import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneShop {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  shopType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radiusKm = 20 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for electronics shops near ${latitude}, ${longitude} within ${radiusKm}km`);

    // Overpass API query for electronics/phone/computer shops
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["shop"="mobile_phone"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="mobile_phone"](around:${radiusKm * 1000},${latitude},${longitude});
        node["shop"="electronics"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="electronics"](around:${radiusKm * 1000},${latitude},${longitude});
        node["shop"="computer"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="computer"](around:${radiusKm * 1000},${latitude},${longitude});
        node["shop"="telecommunication"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="telecommunication"](around:${radiusKm * 1000},${latitude},${longitude});
        node["shop"="hifi"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="hifi"](around:${radiusKm * 1000},${latitude},${longitude});
        node["shop"="appliance"](around:${radiusKm * 1000},${latitude},${longitude});
        way["shop"="appliance"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out body center;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data from OpenStreetMap', shops: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.elements?.length || 0} elements from Overpass`);

    // Helper function to determine shop type
    const getShopType = (tags: any): string => {
      const shop = tags?.shop || '';
      switch (shop) {
        case 'mobile_phone':
          return 'telefonia';
        case 'electronics':
          return 'elettronica';
        case 'computer':
          return 'computer';
        case 'telecommunication':
          return 'telecomunicazioni';
        case 'hifi':
          return 'hi-fi';
        case 'appliance':
          return 'elettrodomestici';
        default:
          return 'altro';
      }
    };

    // Parse and format results
    const shops: PhoneShop[] = (data.elements || [])
      .filter((el: any) => el.tags?.name) // Only include named places
      .map((el: any) => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        
        // Calculate distance using Haversine formula
        const R = 6371;
        const dLat = (lat - latitude) * Math.PI / 180;
        const dLon = (lon - longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Build address from available tags
        const addressParts = [
          el.tags['addr:street'],
          el.tags['addr:housenumber'],
          el.tags['addr:city'],
          el.tags['addr:postcode']
        ].filter(Boolean);

        return {
          id: `osm-${el.id}`,
          name: el.tags.name,
          address: addressParts.length > 0 ? addressParts.join(', ') : el.tags['addr:full'] || 'Indirizzo non disponibile',
          phone: el.tags.phone || el.tags['contact:phone'] || null,
          email: el.tags.email || el.tags['contact:email'] || null,
          website: el.tags.website || el.tags['contact:website'] || null,
          latitude: lat,
          longitude: lon,
          distance: Math.round(distance * 10) / 10,
          shopType: getShopType(el.tags)
        };
      })
      .sort((a: PhoneShop, b: PhoneShop) => (a.distance || 0) - (b.distance || 0));

    console.log(`Returning ${shops.length} electronics shops`);

    return new Response(
      JSON.stringify({ shops }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-phone-shops:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, shops: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
