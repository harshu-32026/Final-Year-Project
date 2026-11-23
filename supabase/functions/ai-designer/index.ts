import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatOutfit(outfit: {
  name: string;
  items: { type: string; name: string; price: number; platform: string }[];
}) {
  const lines = outfit.items.map(
    (item) => `- ${item.type}: ${item.name} | ₹${item.price.toLocaleString()} | ${item.platform}`
  );
  return `:::outfit[${outfit.name}]\n${lines.join("\n")}\n:::`;
}

function buildLocalDesignerResponse(options: {
  style?: string;
  colors?: string[];
  season?: string;
  gender?: string;
  budget?: string;
}) {
  const style = options.style ? options.style.toLowerCase() : "casual";
  const season = options.season ? `${options.season.charAt(0).toUpperCase()}${options.season.slice(1)}` : "Seasonal";
  const colorString = options.colors?.length ? options.colors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ") : "neutral tones";
  const gender = options.gender ? `${options.gender.charAt(0).toUpperCase()}${options.gender.slice(1)}` : "Unisex";
  const budget = options.budget ? options.budget.toLowerCase() : "medium";

  // Price scales: budget is under 3k, medium is 3k-8k, premium is 8k+
  let priceScale = 1.0;
  if (budget === "budget") {
    priceScale = 0.5;
  } else if (budget === "premium") {
    priceScale = 2.8;
  }

  const getPrice = (base: number) => Math.round(base * priceScale);

  // Platform assignments based on item type and platform preferences
  const platforms = {
    top: ["Myntra", "Zara", "H&M"],
    bottom: ["Amazon", "Zara", "Flipkart"],
    footwear: ["Flipkart", "Amazon", "Ajio"],
    accessory: ["Ajio", "Myntra", "Flipkart"]
  };

  const getPlatform = (type: "top" | "bottom" | "footwear" | "accessory", idx: number) => {
    const list = platforms[type];
    return list[idx % list.length];
  };

  // Define style-by-season templates
  interface StyleTemplate {
    top: string;
    bottom: string;
    footwear: string;
    accessory: string;
  }

  const templates: Record<string, Record<string, StyleTemplate>> = {
    casual: {
      summer: {
        top: "Ultra-light breathable linen shirt",
        bottom: "Lightweight stretch chinos",
        footwear: "Minimalist white canvas sneakers",
        accessory: "Classic polaroid sunglasses"
      },
      winter: {
        top: "Premium cashmere woolen sweater",
        bottom: "Heavyweight utility chinos",
        footwear: "Leather Chelsea boots",
        accessory: "Warm knit woolen scarf"
      },
      monsoon: {
        top: "Water-resistant windbreaker jacket",
        bottom: "Quick-dry stretch pants",
        footwear: "Waterproof slip-on shoes",
        accessory: "Compact travel umbrella"
      },
      spring: {
        top: "Relaxed linen-blend shirt",
        bottom: "Tailored stretch chinos",
        footwear: "Minimalist white leather sneakers",
        accessory: "Minimal woven belt"
      }
    },
    ethnic: {
      summer: {
        top: "Breathable pure cotton kurta",
        bottom: "Lightweight cotton dhoti pants",
        footwear: "Handcrafted leather juttis",
        accessory: "Traditional cotton dupatta"
      },
      winter: {
        top: "Heavy woolen embroidered kurta",
        bottom: "Thick silk churidar pants",
        footwear: "Handcrafted leather juttis",
        accessory: "Contrast designer Nehru jacket"
      },
      monsoon: {
        top: "Semi-formal short cotton kurta",
        bottom: "Quick-dry cropped trousers",
        footwear: "Rubber-soled casual sandals",
        accessory: "Water-repellent ethnic pouch"
      },
      spring: {
        top: "Embroidered silk kurta",
        bottom: "Tailored dhoti pants",
        footwear: "Handcrafted leather juttis",
        accessory: "Contrast designer Nehru jacket"
      }
    },
    formal: {
      summer: {
        top: "Lightweight cotton formal shirt",
        bottom: "Breathable slim-fit formal trousers",
        footwear: "Polished Oxford leather shoes",
        accessory: "Classic chronograph watch & leather belt"
      },
      winter: {
        top: "Premium woolen blazer over dress shirt",
        bottom: "Thick formal woolen trousers",
        footwear: "Polished Oxford leather shoes",
        accessory: "Premium cashmere muffler & leather gloves"
      },
      monsoon: {
        top: "Crisp structured dress shirt",
        bottom: "Quick-dry formal trousers",
        footwear: "Waterproof leather Derby shoes",
        accessory: "Classic chronograph watch & leather belt"
      },
      spring: {
        top: "Crisp structured dress shirt",
        bottom: "Slim-fit formal trousers",
        footwear: "Polished Oxford leather shoes",
        accessory: "Classic chronograph watch & leather belt"
      }
    },
    streetwear: {
      summer: {
        top: "Oversized graphic cotton tee",
        bottom: "Relaxed fit cargo shorts",
        footwear: "Retro low-top sneakers",
        accessory: "Canvas messenger bag & streetwear cap"
      },
      winter: {
        top: "Oversized fleece winter hoodie",
        bottom: "Heavyweight utility cargo pants",
        footwear: "Retro high-top winter sneakers",
        accessory: "Thick knit streetwear beanie"
      },
      monsoon: {
        top: "Waterproof graphic windbreaker hoody",
        bottom: "Water-repellent utility cargo pants",
        footwear: "Gore-tex waterproof sneakers",
        accessory: "Waterproof roll-top backpack"
      },
      spring: {
        top: "Heavyweight oversized graphic tee",
        bottom: "Relaxed utility cargo pants",
        footwear: "Retro high-top sneakers",
        accessory: "Canvas messenger bag & streetwear cap"
      }
    },
    party: {
      summer: {
        top: "Sleek short-sleeve resort shirt",
        bottom: "Lightweight cropped trousers",
        footwear: "Suede loafer shoes",
        accessory: "Silver curb chain necklace"
      },
      winter: {
        top: "Premium velvet blazer over shirt",
        bottom: "Slim-fit black coating jeans",
        footwear: "Chelsea leather boots",
        accessory: "Silver curb chain necklace"
      },
      monsoon: {
        top: "Sleek satin resort shirt",
        bottom: "Slim-fit black coating jeans",
        footwear: "Chelsea leather boots",
        accessory: "Silver curb chain necklace"
      },
      spring: {
        top: "Sleek satin resort shirt",
        bottom: "Slim-fit black coating jeans",
        footwear: "Chelsea leather boots",
        accessory: "Silver curb chain necklace"
      }
    },
    boho: {
      summer: {
        top: "Flowy printed linen tunic shirt",
        bottom: "Lightweight wide-leg linen trousers",
        footwear: "Woven leather slides",
        accessory: "Beaded multi-layer bracelet set"
      },
      winter: {
        top: "Layered patterned woolen cardigan over tunic",
        bottom: "Thick wide-leg corduroy trousers",
        footwear: "Woven leather slides",
        accessory: "Beaded multi-layer bracelet set"
      },
      monsoon: {
        top: "Flowy printed linen tunic shirt",
        bottom: "Cropped wide-leg linen trousers",
        footwear: "Waterproof strap sandals",
        accessory: "Beaded multi-layer bracelet set"
      },
      spring: {
        top: "Flowy printed linen tunic shirt",
        bottom: "Relaxed wide-leg linen trousers",
        footwear: "Woven leather slides",
        accessory: "Beaded multi-layer bracelet set"
      }
    }
  };

  const styleCategory = templates[style] || templates.casual;
  const currentTemplate = styleCategory[options.season?.toLowerCase() || "spring"] || styleCategory.spring;
  const primaryColor = options.colors?.[0] ? `${options.colors[0].charAt(0).toUpperCase()}${options.colors[0].slice(1)}` : "Neutral";
  const secondaryColor = options.colors?.[1] ? `${options.colors[1].charAt(0).toUpperCase()}${options.colors[1].slice(1)}` : "Complementary";

  let layeredTop = "";
  const seasonLower = options.season?.toLowerCase();
  if (seasonLower === "winter") {
    layeredTop = `${gender} padded bomber jacket in Black`;
  } else if (seasonLower === "summer") {
    layeredTop = `${gender} lightweight cotton overshirt in ${secondaryColor}`;
  } else if (seasonLower === "monsoon") {
    layeredTop = `${gender} waterproof windbreaker jacket in ${primaryColor}`;
  } else {
    layeredTop = `${gender} denim trucker jacket in Blue`;
  }

  const outfits = [
    {
      name: `${style.charAt(0).toUpperCase() + style.slice(1)} Day Edit`,
      items: [
        { type: "Top", name: `${gender} ${currentTemplate.top} in ${primaryColor}`, price: getPrice(1390), platform: getPlatform("top", 0) },
        { type: "Bottom", name: `${gender} ${currentTemplate.bottom}`, price: getPrice(1590), platform: getPlatform("bottom", 0) },
        { type: "Footwear", name: `${currentTemplate.footwear}`, price: getPrice(2190), platform: getPlatform("footwear", 0) },
        { type: "Accessory", name: `${currentTemplate.accessory}`, price: getPrice(690), platform: getPlatform("accessory", 0) },
      ],
    },
    {
      name: `${season} Layered Edit`,
      items: [
        { type: "Top", name: layeredTop, price: getPrice(1890), platform: getPlatform("top", 1) },
        { type: "Bottom", name: `${gender} ${currentTemplate.bottom} in dark tone`, price: getPrice(1690), platform: getPlatform("bottom", 1) },
        { type: "Footwear", name: `${currentTemplate.footwear}`, price: getPrice(2290), platform: getPlatform("footwear", 1) },
        { type: "Accessory", name: `Minimalist ${primaryColor} watch`, price: getPrice(990), platform: getPlatform("accessory", 1) },
      ],
    },
  ];

  const complementary = [
    {
      name: "Smart Remix Look",
      items: [
        { type: "Top", name: `${gender} premium shirt in ${primaryColor}`, price: getPrice(1490), platform: getPlatform("top", 2) },
        { type: "Bottom", name: `${gender} classic jeans`, price: getPrice(1690), platform: getPlatform("bottom", 2) },
        { type: "Footwear", name: "Casual canvas sneakers", price: getPrice(1290), platform: getPlatform("footwear", 2) },
        { type: "Accessory", name: "Genuine leather wallet", price: getPrice(590), platform: getPlatform("accessory", 2) },
      ],
    }
  ];

  let styleAdvice = "";
  if (style === "ethnic") {
    styleAdvice = "This traditional ensemble brings together classic Indian silhouettes with a modern edge. Perfect for festive gatherings, family celebrations, or cultural occasions.";
  } else if (style === "formal") {
    styleAdvice = "Designed for structured confidence. Ideal for business meetings, corporate environments, or formal interviews where looking sharp is essential.";
  } else if (style === "streetwear") {
    styleAdvice = "Embracing urban comfort and bold silhouettes. Great for relaxed social outings, concerts, or general weekend streetwear vibes.";
  } else if (style === "party") {
    styleAdvice = "Tailored for nighttime allure and sleek styling. Perfect for club nights, dinner dates, or weekend parties.";
  } else if (style === "boho") {
    styleAdvice = "A free-spirited blend of relaxed textures and artistic touches. Great for beach outings, casual brunches, or music festivals.";
  } else {
    styleAdvice = "A clean, minimal, everyday look that prioritizes both comfort and versatility. Suitable for casual workdays, errands, or hanging out.";
  }

  const notesText = `## 💡 Custom Styling Guide\nThis personalized edit has been tailored specifically for a **${gender}** look matching **${style.toUpperCase()}** style preferences:\n\n- 🎨 **Color Scheme**: Curated using a cohesive blend of **${colorString}** shades to complement your palette.\n- ⛅ **Seasonal Adaptation**: Tailored specifically for **${season}** conditions, utilizing fabrics and layering details suited to the weather.\n- 💰 **Budget Alignment**: Aligned with a **${budget.toUpperCase()}** tier, ensuring high value and premium styling choices.\n\n### 🌟 Wearer Recommendations\n${styleAdvice} Keep accessories minimal to allow the key colors to stand out, and pair the look with comfortable confidence!`;

  return `${outfits.map(formatOutfit).join("\n\n")}\n\n## ✨ Complementary Picks\nA polished edit with ${colorString} tones, balanced for ${season} and a ${budget} budget styling.\n\n${complementary.map(formatOutfit).join("\n\n")}\n\n${notesText}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { style, colors, season, gender, budget } = await req.json();
    if (!style || !Array.isArray(colors) || colors.length === 0 || !season) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = buildLocalDesignerResponse({ style, colors, season, gender, budget });
    const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: responseText } }] })}\n\ndata: [DONE]\n\n`;

    return new Response(payload, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-designer error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
