// Fetches live gold/silver prices in NPR (per gram + per tola).
// Source: goldprice.org public JSON. No API key needed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOLA = 11.6638;
const OZ_TO_G = 31.1034768;

const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://goldprice.org/",
  Origin: "https://goldprice.org",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return await response.json();
}

async function getUsdToNpr() {
  const providers = [
    async () => {
      const fx = await fetchJson("https://open.er-api.com/v6/latest/USD", {
        headers: { Accept: "application/json" },
      });
      return Number(fx.rates?.NPR);
    },
    async () => {
      const fx = await fetchJson("https://latest.currency-api.pages.dev/v1/currencies/usd.json", {
        headers: { Accept: "application/json" },
      });
      return Number(fx.usd?.npr);
    },
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const rate = await provider();
      if (Number.isFinite(rate) && rate > 0) return rate;
      errors.push("missing NPR rate");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`FX fallback failed: ${errors.join("; ")}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    let goldPerTola_NPR: number;
    let silverPerTola_NPR: number;
    let source = "fenegosida.org";

    // Primary: scrape FENEGOSIDA (official Nepal gold/silver rate, Fine Gold 9999 = 24K)
    try {
      const r = await fetch("https://www.fenegosida.org/", {
        headers: { "User-Agent": browserHeaders["User-Agent"], Accept: "text/html" },
      });
      if (!r.ok) throw new Error(`fenegosida ${r.status}`);
      const html = await r.text();
      const goldMatch = html.match(/FINE GOLD[^<]*<[^>]*>[\s\S]*?<b>\s*(\d[\d,]*)\s*<\/b>/i);
      const silverMatch = html.match(
        /SILVER[^<]*<[^>]*>[\s\S]*?per 1 tola[\s\S]*?<b>\s*(\d[\d,]*)\s*<\/b>/i,
      );
      const gold = goldMatch ? Number(goldMatch[1].replace(/,/g, "")) : NaN;
      const silver = silverMatch ? Number(silverMatch[1].replace(/,/g, "")) : NaN;
      if (!Number.isFinite(gold) || gold <= 0) throw new Error("no gold rate");
      if (!Number.isFinite(silver) || silver <= 0) throw new Error("no silver rate");
      goldPerTola_NPR = gold;
      silverPerTola_NPR = silver;
    } catch (primaryErr) {
      console.warn("Primary failed, using fallback:", (primaryErr as Error).message);
      // Fallback: international spot (gold-api.com) + USD->NPR FX. Spot rate ≈ 24K pure.
      source = "gold-api.com+open-er-api";
      const [gold, silver, usdToNpr] = await Promise.all([
        fetchJson("https://api.gold-api.com/price/XAU", {
          headers: { Accept: "application/json" },
        }),
        fetchJson("https://api.gold-api.com/price/XAG", {
          headers: { Accept: "application/json" },
        }),
        getUsdToNpr(),
      ]);
      goldPerTola_NPR = (Number(gold.price) / OZ_TO_G) * usdToNpr * TOLA;
      silverPerTola_NPR = (Number(silver.price) / OZ_TO_G) * usdToNpr * TOLA;
    }

    const goldPerG_NPR = goldPerTola_NPR / TOLA;
    const silverPerG_NPR = silverPerTola_NPR / TOLA;

    const now = new Date().toISOString();
    const rows = [
      {
        metal: "gold",
        price_per_gram: Number(goldPerG_NPR.toFixed(4)),
        price_per_tola: Number((goldPerG_NPR * TOLA).toFixed(2)),
        currency: "NPR",
        source,
        fetched_at: now,
      },
      {
        metal: "silver",
        price_per_gram: Number(silverPerG_NPR.toFixed(4)),
        price_per_tola: Number((silverPerG_NPR * TOLA).toFixed(2)),
        currency: "NPR",
        source,
        fetched_at: now,
      },
    ];

    const { error } = await supabase.from("metal_prices").insert(rows);
    if (error) console.error("Insert error:", error);

    return jsonResponse({ ok: true, fallback: source !== "goldprice.org", prices: rows, source });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("fetch-metal-prices error:", msg);
    return jsonResponse({ ok: false, fallback: true, error: msg, prices: [] });
  }
});
