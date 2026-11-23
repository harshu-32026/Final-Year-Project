import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Intent Detection ──────────────────────────────────────────────────────────

const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  // Footwear
  heel: "heels", heels: "heels",
  shoe: "shoes", shoes: "shoes",
  sneaker: "sneakers", sneakers: "sneakers",
  boot: "boots", boots: "boots",
  sandal: "sandals", sandals: "sandals",
  loafer: "loafers", loafers: "loafers",
  slipper: "slippers", slippers: "slippers",
  flat: "flats", flats: "flats",
  pump: "pumps", pumps: "pumps",
  wedge: "wedges", wedges: "wedges",
  mule: "mules", mules: "mules",
  stiletto: "stiletto heels",
  // Bags
  bag: "bags", bags: "bags",
  handbag: "handbags", handbags: "handbags",
  backpack: "backpacks", backpacks: "backpacks",
  clutch: "clutches", clutches: "clutches",
  purse: "purses", purses: "purses",
  tote: "totes", totes: "totes",
  satchel: "satchels",
  // Jewelry
  bracelet: "bracelets", bracelets: "bracelets",
  necklace: "necklaces", necklaces: "necklaces",
  earring: "earrings", earrings: "earrings",
  ring: "rings", rings: "rings",
  anklet: "anklets", anklets: "anklets",
  bangle: "bangles", bangles: "bangles",
  pendant: "pendants",
  chain: "chains",
  // Watches & Accessories
  watch: "watches", watches: "watches",
  sunglass: "sunglasses", sunglasses: "sunglasses",
  goggle: "sunglasses", goggles: "sunglasses",
  belt: "belts", belts: "belts",
  scarf: "scarves", scarves: "scarves",
  hat: "hats", hats: "hats",
  cap: "caps", caps: "caps",
  // Clothing (single-item requests)
  blazer: "blazers", blazers: "blazers",
  jacket: "jackets", jackets: "jackets",
  coat: "coats", coats: "coats",
  cardigan: "cardigans",
  kurta: "kurtas", kurtas: "kurtas",
  saree: "sarees", sari: "sarees",
  dupatta: "dupattas",
  lehenga: "lehengas",
  jeans: "jeans", denim: "jeans",
  trouser: "trousers", trousers: "trousers",
  pant: "pants", pants: "pants",
  skirt: "skirts", skirts: "skirts",
  shorts: "shorts",
  dress: "dresses", dresses: "dresses",
  gown: "gowns", gowns: "gowns",
  tshirt: "t-shirts", "t-shirt": "t-shirts",
  shirt: "shirts", shirts: "shirts",
  top: "tops", tops: "tops",
  blouse: "blouses",
  hoodie: "hoodies", hoodies: "hoodies",
  sweater: "sweaters",
};

// ONLY these phrases trigger full outfit generation
const OUTFIT_TRIGGERS = [
  "create an outfit", "create a look", "create a full",
  "style me", "style an outfit",
  "complete my look", "complete my outfit",
  "build a look", "build an outfit", "build a full",
  "generate an outfit", "generate a look",
  "suggest an outfit for", "outfit for a", "outfit for my",
  "full outfit", "complete look", "complete outfit",
  "dress me", "outfit ideas",
  "what should i wear", "what to wear",
  "put together a look", "put together an outfit",
  "wedding outfit", "office outfit", "party outfit",
];

type Intent =
  | { mode: "product"; searchQuery: string; category: string }
  | { mode: "outfit" };

// ─── Context extractors for richer search queries ─────────────────────────────

const OCCASION_WORDS = [
  "wedding", "festive", "party", "office", "work", "casual", "formal",
  "date", "college", "beach", "travel", "gym", "ethnic", "traditional",
  "brunch", "cocktail", "night out", "outdoor", "summer", "winter", "monsoon",
];

const STYLE_WORDS = [
  "boho", "minimalist", "chic", "edgy", "elegant", "trendy", "classic",
  "vintage", "modern", "streetwear", "luxury", "sporty", "preppy", "glam",
  "oversized", "slim", "flowy", "structured", "embroidered", "embellished",
  "printed", "solid", "floral", "strappy", "block heel", "stiletto", "platform",
  "ankle", "knee high", "thigh high", "pointed", "round toe", "square toe",
];

const BUDGET_PATTERNS = [
  /under\s*[₹rs.]?\s*([\d,]+)/i,
  /below\s*[₹rs.]?\s*([\d,]+)/i,
  /less than\s*[₹rs.]?\s*([\d,]+)/i,
  /budget\s*[₹rs.]?\s*([\d,]+)/i,
  /[₹rs.]\s*([\d,]+)/i,
];

function buildEnrichedQuery(userText: string, category: string): string {
  const lower = userText.toLowerCase();
  const parts: string[] = [];

  // Extract color
  for (const c of COLOR_WORDS) {
    if (lower.includes(c)) { parts.push(c); break; }
  }

  // Add the core category
  parts.push(category);

  // Extract occasion context
  for (const o of OCCASION_WORDS) {
    if (lower.includes(o)) { parts.push(o); break; }
  }

  // Extract style descriptors (up to 2)
  let styleCount = 0;
  for (const s of STYLE_WORDS) {
    if (lower.includes(s) && styleCount < 2) { parts.push(s); styleCount++; }
  }

  // Extract brand if mentioned
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) { parts.push(b); break; }
  }

  // Append "India" to bias results toward Indian e-commerce
  const query = [...new Set(parts)].join(" ").trim();
  return query || category;
}

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  // 1. Explicit outfit triggers first
  for (const trigger of OUTFIT_TRIGGERS) {
    if (lower.includes(trigger)) return { mode: "outfit" };
  }
  // 2. Specific product category keyword — build a rich contextual query
  for (const [keyword, canonical] of Object.entries(PRODUCT_CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      const enrichedQuery = buildEnrichedQuery(text, canonical);
      return { mode: "product", searchQuery: enrichedQuery, category: canonical };
    }
  }
  // 3. Default: open-ended styling request → outfit
  return { mode: "outfit" };
}

// ─── Brand / Color extraction helpers ─────────────────────────────────────────

const KNOWN_BRANDS = [
  "Zara", "H&M", "Nike", "Adidas", "Puma", "Reebok", "Bata", "Mochi",
  "Steve Madden", "Metro", "Liberty", "Woodland", "Clarks", "Catwalk",
  "Aldo", "Charles & Keith", "W", "Biba", "FabIndia", "Mango",
  "Forever 21", "Roadster", "HRX", "Levis", "Arrow", "Van Heusen",
  "Peter England", "Louis Philippe", "Allen Solly", "Park Avenue",
  "United Colors", "UCB", "Marks & Spencer", "Aurelia", "Global Desi",
  "Fossil", "Titan", "Fastrack", "Casio", "Michael Kors",
];

const COLOR_WORDS = [
  "black", "white", "red", "blue", "navy", "green", "olive", "beige",
  "nude", "gold", "silver", "rose", "pink", "purple", "grey", "gray",
  "brown", "tan", "camel", "cream", "ivory", "coral", "mustard",
  "maroon", "teal", "turquoise", "orange", "yellow", "multicolor",
  "leopard", "floral", "printed", "striped", "checked", "denim",
];

function extractBrand(name: string): string {
  const lower = name.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return "";
}

function extractColor(name: string): string {
  const lower = name.toLowerCase();
  for (const c of COLOR_WORDS) {
    if (lower.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return "";
}

// Fisher-Yates shuffle — ensures variety across every response
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Product search via catalog ───────────────────────────────────────────────

async function searchProductCatalog(
  query: string,
  supabaseUrl: string,
  anonKey: string,
  exclude: string[] = [],
): Promise<string> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/search-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ query, exclude }),
    });

    if (!resp.ok) throw new Error(`search-products responded ${resp.status}`);

    const data = await resp.json();
    const allProducts: any[] = data.products || [];

    if (allProducts.length === 0) {
      return `No matching products are currently available for **${query}**.\n\nTry a different search term or browse our catalog directly.`;
    }

    // Shuffle to guarantee variety — different products every request
    const pool = shuffle(allProducts);
    const count = Math.min(12, Math.max(6, pool.length));
    const selected = pool.slice(0, count);

    let out = `Here are **${selected.length}** recommendations matched to your request:\n\n`;

    selected.forEach((p: any) => {
      const entries: any[] = Array.isArray(p.prices) && p.prices.length > 0 ? p.prices : [];
      // Pick highest-rated entry for display (adds variety vs. always cheapest)
      const entry = [...entries].sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0))[0]
        ?? { price: 0, platform: "Online", link: "" };

      const price = Math.round(entry.price || p.price || 0);
      const originalPrice = Math.round(entry.originalPrice || 0);
      const platform = entry.platform || entry.source || "Online";
      const rating = typeof entry.rating === "number" ? entry.rating : (p.rating ?? 0);
      const reviews = entry.reviews ?? p.reviews ?? 0;

      const brand = extractBrand(p.name);
      const color = extractColor(p.name);

      // Score: base 70 + up to 20 from rating + small random jitter
      const ratingBonus = rating > 0 ? Math.round((rating / 5) * 20) : 0;
      const score = Math.min(98, 70 + ratingBonus + Math.floor(Math.random() * 8));

      out += `:::product\n`;
      out += `Category: ${query}\n`;
      out += `Name: ${p.name}\n`;
      if (brand) out += `Brand: ${brand}\n`;
      if (color) out += `Color: ${color}\n`;
      out += `Price: ₹${price}\n`;
      if (originalPrice > price) out += `OriginalPrice: ₹${originalPrice}\n`;
      out += `Platform: ${platform}\n`;
      if (rating > 0) out += `Rating: ${rating.toFixed(1)}\n`;
      if (reviews > 0) out += `Reviews: ${reviews}\n`;
      out += `Score: ${score}\n`;
      if (p.image) out += `Image: ${p.image}\n`;
      if (entry.link) out += `Link: ${entry.link}\n`;
      out += `:::\n\n`;
    });

    return out;
  } catch (err) {
    console.error("searchProductCatalog failed:", err);
    return `I couldn't retrieve **${query}** from the catalog right now. Please try again shortly.`;
  }
}

// ─── Rate-limit retry helper ──────────────────────────────────────────────────

class RateLimitError extends Error {
  constructor() {
    super("rate_limit_exhausted");
  }
}

async function fetchWithRetry(
  url: string,
  body: string,
  maxRetries = 1,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (resp.status !== 429) return resp;
    const delay = 800 * (attempt + 1);
    console.warn(`Gemini 429 on attempt ${attempt + 1}; retrying in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new RateLimitError();
}

// ─── Gemini streaming for OUTFIT mode ─────────────────────────────────────────

async function streamGeminiOutfitResponse(
  messages: any[],
  wardrobe: any[],
  apiKey: string,
): Promise<ReadableStream> {
  const wardrobeSummary =
    Array.isArray(wardrobe) && wardrobe.length > 0
      ? `The user has these items in their wardrobe. Prioritise them when building outfit suggestions:\n${wardrobe
        .map(
          (w: any) =>
            `- ${[w.category, w.name, w.color && `(${w.color})`, w.brand && `by ${w.brand}`]
              .filter(Boolean)
              .join(" ")}`,
        )
        .join("\n")}`
      : "The user has no wardrobe items saved yet.";

  const systemPrompt = `You are StyleSnap AI, an expert AI Fashion Stylist and Shopping Assistant integrated with a real product catalog.

Your job is to help users discover fashion products that perfectly match their outfit, style, occasion, and preferences.

The user has explicitly requested a COMPLETE OUTFIT recommendation. Generate 2 diverse, cohesive, wearable looks.

CORE RULES:
1. Return EXACTLY 2 complete outfit suggestions, each containing 3-4 items.
   Item types allowed: Top, Bottom, Footwear, Accessory, Jacket, Dress, Bag, Watch.
2. Analyse any uploaded image: observe the colours, garments, fit, style, season and occasion.
3. If the user's wardrobe contains matching items, prioritise them (price Rs.0, platform "Own Wardrobe").
4. For new items use ONLY these real Indian e-commerce platforms: Myntra, Amazon, Ajio, Flipkart, Zara, H&M, Nykaa Fashion. Use realistic INR prices.
5. Make the two outfits DISTINCT in style (e.g. one formal + one casual; one bold + one minimalist).
6. Never invent products. Never repeat the same item across both outfits.
7. Consider: outfit colours, occasion, season, current fashion trends, gender if visible, and budget if provided.
8. Recommend different brands, different colours, different styles — maximise variety.

PRODUCT SELECTION:
- Rank items by compatibility with the user's request.
- Consider colour harmony, style consistency, occasion suitability, comfort, and current trends.
- For footwear: vary heel types, shoe styles, materials (stiletto, block heel, wedge, flat, loafer etc.)
- For accessories: vary materials, colours, and styles.

FORMAT - use EXACTLY this block for every outfit. No deviations. No markdown code fences:

:::outfit[Outfit Name Here]
- Top: Item name | Rs.Price | Platform
- Bottom: Item name | Rs.Price | Platform
- Footwear: Item name | Rs.Price | Platform
- Accessory: Item name | Rs.Price | Platform
:::

After both outfit blocks, write a "## Style Notes" section explaining:
- Why each look works
- Colour harmony and material choices
- Occasion suitability and current trend alignment
Be encouraging, expert, and friendly like a premium personal stylist.

Do NOT output :::product blocks. Do NOT use markdown code fences.

${wardrobeSummary}`;

  const contents = messages.map((m: any) => {
    const parts: any[] = [];
    if (m.content) parts.push({ text: m.content });
    if (m.imageBase64) {
      const mimeMatch = m.imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch?.[1] ?? "image/jpeg";
      parts.push({
        inlineData: {
          mimeType,
          data: m.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
  const reqBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
  });

  const geminiResp = await fetchWithRetry(geminiUrl, reqBody);

  if (!geminiResp.ok) {
    const errText = await geminiResp.text();
    throw new Error(`Gemini error ${geminiResp.status}: ${errText}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    try {
      const reader = geminiResp.body!.getReader();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const json = JSON.parse(raw);
            const chunk: string | undefined =
              json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`,
                ),
              );
            }
          } catch {
            // partial JSON — skip
          }
        }
      }
    } catch (err) {
      console.error("Gemini stream read error:", err);
    } finally {
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      writer.close();
    }
  })();

  return readable;
}

// ─── Plain-text SSE helper ────────────────────────────────────────────────────

function streamText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
        ),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ─── Local outfit fallback (no API key or rate-limited) ──────────────────────

function buildLocalOutfitFallback(lastMessage: string): string {
  const lower = lastMessage.toLowerCase();
  let occasion = "everyday styling";
  let o1 = "Weekend Casual"; let o2 = "Athleisure Comfort";
  let items1 = [
    { type: "Top", name: "Relaxed linen shirt", price: 1399, platform: "Myntra" },
    { type: "Bottom", name: "Tailored cotton chinos", price: 1599, platform: "Amazon" },
    { type: "Footwear", name: "White court sneakers", price: 2199, platform: "Flipkart" },
    { type: "Accessory", name: "Brown leather belt", price: 599, platform: "Ajio" },
  ];
  let items2 = [
    { type: "Top", name: "Soft cotton hoodie", price: 1299, platform: "Myntra" },
    { type: "Bottom", name: "Premium jogger pants", price: 999, platform: "Amazon" },
    { type: "Footwear", name: "Cushioned running shoes", price: 2599, platform: "Flipkart" },
    { type: "Accessory", name: "Classic sports cap", price: 399, platform: "Ajio" },
  ];

  if (lower.includes("wedding") || lower.includes("festive") || lower.includes("traditional")) {
    occasion = "a festive celebration"; o1 = "Festive Kurta Set"; o2 = "Semi-Formal Celebration";
    items1 = [
      { type: "Top", name: "Embroidered silk kurta", price: 2499, platform: "Myntra" },
      { type: "Bottom", name: "Slim silk pajama pants", price: 999, platform: "Amazon" },
      { type: "Footwear", name: "Traditional leather juttis", price: 1299, platform: "Ajio" },
      { type: "Accessory", name: "Contrast Nehru jacket", price: 1899, platform: "Flipkart" },
    ];
    items2 = [
      { type: "Top", name: "Sleek bandhgala shirt", price: 1499, platform: "Myntra" },
      { type: "Bottom", name: "Tailored charcoal trousers", price: 1699, platform: "Zara" },
      { type: "Footwear", name: "Tan leather monk straps", price: 2999, platform: "Flipkart" },
      { type: "Accessory", name: "Structured festive blazer", price: 3499, platform: "Amazon" },
    ];
  } else if (lower.includes("office") || lower.includes("work") || lower.includes("meeting")) {
    occasion = "office"; o1 = "Power Professional"; o2 = "Smart Casual Office";
    items1 = [
      { type: "Top", name: "Crisp cotton formal shirt", price: 1499, platform: "Myntra" },
      { type: "Bottom", name: "Streamlined office trousers", price: 1699, platform: "Zara" },
      { type: "Footwear", name: "Classic black Oxford shoes", price: 2499, platform: "Amazon" },
      { type: "Accessory", name: "Leather belt and watch set", price: 1299, platform: "Ajio" },
    ];
    items2 = [
      { type: "Top", name: "Fine-knit polo tee", price: 999, platform: "Myntra" },
      { type: "Bottom", name: "Tailored slim-fit chinos", price: 1599, platform: "Amazon" },
      { type: "Footwear", name: "Suede penny loafers", price: 2199, platform: "Flipkart" },
      { type: "Accessory", name: "Minimalist stainless watch", price: 1999, platform: "Ajio" },
    ];
  } else if (lower.includes("party") || lower.includes("club") || lower.includes("night out")) {
    occasion = "a night out"; o1 = "Night Out Edit"; o2 = "Smart Streetwear Party";
    items1 = [
      { type: "Top", name: "Satin finish resort shirt", price: 1499, platform: "Myntra" },
      { type: "Bottom", name: "Black stretch slim jeans", price: 1799, platform: "Amazon" },
      { type: "Footwear", name: "Leather zip boots", price: 2999, platform: "Flipkart" },
      { type: "Accessory", name: "Layered silver chain", price: 599, platform: "Ajio" },
    ];
    items2 = [
      { type: "Top", name: "Oversized graphic tee", price: 899, platform: "Myntra" },
      { type: "Bottom", name: "Relaxed utility cargo pants", price: 1699, platform: "Amazon" },
      { type: "Footwear", name: "Retro chunky sneakers", price: 2499, platform: "Flipkart" },
      { type: "Accessory", name: "Streetwear bucket hat", price: 499, platform: "Ajio" },
    ];
  } else if (lower.includes("date")) {
    occasion = "a date night"; o1 = "Classic Date Edit"; o2 = "Sharp Date Look";
    items1 = [
      { type: "Top", name: "Premium textured knit top", price: 1399, platform: "Myntra" },
      { type: "Bottom", name: "Dark wash slim jeans", price: 1599, platform: "Amazon" },
      { type: "Footwear", name: "Suede Chelsea boots", price: 2799, platform: "Flipkart" },
      { type: "Accessory", name: "Minimal leather bracelet", price: 499, platform: "Ajio" },
    ];
    items2 = [
      { type: "Top", name: "Relaxed linen shirt", price: 1299, platform: "Myntra" },
      { type: "Bottom", name: "Sand-colored tailored chinos", price: 1599, platform: "Amazon" },
      { type: "Footwear", name: "Leather tassel loafers", price: 2399, platform: "Flipkart" },
      { type: "Accessory", name: "Minimalist silver bar necklace", price: 699, platform: "Ajio" },
    ];
  }

  const fmt = (name: string, items: typeof items1) =>
    `:::outfit[${name}]\n${items.map((i) => `- ${i.type}: ${i.name} | ₹${i.price.toLocaleString()} | ${i.platform}`).join("\n")}\n:::`;

  return `Here are outfit suggestions for ${occasion}:\n\n${fmt(o1, items1)}\n\n${fmt(o2, items2)}\n\n## Style Notes\nBoth looks are built around clean silhouettes and versatile pieces that complement ${occasion}. Mix and match with your own wardrobe for the best personalised result.`;
}

// ─── Main serve handler ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages: any[] = Array.isArray(body.messages) ? body.messages : [];
    const wardrobe: any[] = Array.isArray(body.wardrobe) ? body.wardrobe : [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUserMsg: any = messages.findLast((m: any) => m.role === "user");
    const lastUserText = String(lastUserMsg?.content ?? "");
    const intent = detectIntent(lastUserText);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? "";

    // ── MODE 1: Product recommendation ──────────────────────────────────────
    if (intent.mode === "product") {
      // Extract previously shown product names from chat history for deduplication
      const seenProductNames: string[] = [];
      for (const m of messages) {
        if (m.role === "assistant" && typeof m.content === "string") {
          const nameRegex = /^Name:\s*(.+)$/gm;
          let nameMatch;
          while ((nameMatch = nameRegex.exec(m.content)) !== null) {
            seenProductNames.push(nameMatch[1].trim());
          }
        }
      }
      const responseText = await searchProductCatalog(intent.searchQuery, SUPABASE_URL, SUPABASE_ANON_KEY, seenProductNames);
      return new Response(streamText(responseText), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── MODE 2: Outfit recommendation ────────────────────────────────────────
    if (GEMINI_KEY) {
      try {
        const stream = await streamGeminiOutfitResponse(messages, wardrobe, GEMINI_KEY);
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      } catch (err) {
        if (err instanceof RateLimitError) {
          console.warn("Gemini rate-limited after all retries — serving local fallback");
          const notice = "⚠️ AI suggestions are temporarily throttled. Here are curated outfit ideas:\n\n";
          return new Response(streamText(notice + buildLocalOutfitFallback(lastUserText)), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        console.error("Gemini stream failed — local fallback:", err);
        return new Response(streamText(buildLocalOutfitFallback(lastUserText)), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // No API key — local fallback
    return new Response(streamText(buildLocalOutfitFallback(lastUserText)), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("ai-stylist error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
