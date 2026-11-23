import { useState, useRef } from "react";
import { Palette, Sparkles, Sun, Snowflake, CloudRain, Leaf, Wand2, RotateCcw, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { OutfitCard } from "@/components/ai-stylist/OutfitCard";
import ReactMarkdown from "react-markdown";
import Seo from "@/components/Seo";

const STYLES = [
  { id: "casual", label: "Casual", icon: "👕", desc: "Everyday comfort" },
  { id: "ethnic", label: "Ethnic", icon: "🪷", desc: "Traditional elegance" },
  { id: "party", label: "Party", icon: "🎉", desc: "Night out glam" },
  { id: "formal", label: "Formal", icon: "👔", desc: "Boardroom ready" },
  { id: "streetwear", label: "Streetwear", icon: "🧢", desc: "Urban edge" },
  { id: "boho", label: "Bohemian", icon: "🌻", desc: "Free-spirited" },
];

const COLORS = [
  { id: "black", label: "Black", hex: "#1a1a1a" },
  { id: "white", label: "White", hex: "#f5f5f5" },
  { id: "navy", label: "Navy", hex: "#1e3a5f" },
  { id: "red", label: "Red", hex: "#dc2626" },
  { id: "olive", label: "Olive", hex: "#556b2f" },
  { id: "beige", label: "Beige", hex: "#d4b896" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "brown", label: "Brown", hex: "#8b4513" },
  { id: "lavender", label: "Lavender", hex: "#9b8ec4" },
  { id: "mustard", label: "Mustard", hex: "#d4a017" },
];

const SEASONS = [
  { id: "summer", label: "Summer", icon: Sun, color: "text-amber-500" },
  { id: "winter", label: "Winter", icon: Snowflake, color: "text-blue-400" },
  { id: "monsoon", label: "Monsoon", icon: CloudRain, color: "text-muted-foreground" },
  { id: "spring", label: "Spring", icon: Leaf, color: "text-emerald-500" },
];

const GENDERS = [
  { id: "male", label: "Male", icon: "👨" },
  { id: "female", label: "Female", icon: "👩" },
  { id: "unisex", label: "Unisex", icon: "🧑" },
];

const BUDGETS = [
  { id: "budget", label: "Budget", desc: "Under ₹3,000" },
  { id: "medium", label: "Medium", desc: "₹3,000 – ₹8,000" },
  { id: "premium", label: "Premium", desc: "₹8,000+" },
];
const Age = [
  { id: "budget", label: "Budget", desc: "18 -21" },
  { id: "medium", label: "Medium", desc: "20 -30" },

];

type OutfitItem = {
  type: string;
  name: string;
  price: number;
  platform: string;
};

type Outfit = {
  name: string;
  items: OutfitItem[];
};

function parseOutfits(text: string): Outfit[] {
  const outfits: Outfit[] = [];
  const regex = /:::outfit\[(.+?)\]([\s\S]*?):::/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    const block = match[2];
    const items: OutfitItem[] = [];
    const lines = block.split("\n").filter((l) => l.trim().startsWith("- "));
    for (const line of lines) {
      const cleaned = line.replace(/^-\s*/, "").trim();
      const parts = cleaned.split("|").map((p) => p.trim());
      if (parts.length >= 3) {
        const [typeAndName, priceStr, platform] = parts;
        const colonIdx = typeAndName.indexOf(":");
        const type = colonIdx > -1 ? typeAndName.slice(0, colonIdx).trim() : "Item";
        const itemName = colonIdx > -1 ? typeAndName.slice(colonIdx + 1).trim() : typeAndName;
        const price = parseInt(priceStr.replace(/[^\d]/g, "")) || 0;
        items.push({ type, name: itemName, price, platform });
      }
    }
    if (items.length > 0) outfits.push({ name, items });
  }
  return outfits;
}

function formatOutfit(outfit: Outfit) {
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

  // Define style-specific templates
  interface StyleTemplate {
    top: string;
    bottom: string;
    footwear: string;
    accessory: string;
  }

  const styleTemplates: Record<string, StyleTemplate> = {
    ethnic: {
      top: "Embroidered silk kurta",
      bottom: "Tailored dhoti pants",
      footwear: "Handcrafted leather juttis",
      accessory: "Contrast designer Nehru jacket"
    },
    formal: {
      top: "Crisp structured dress shirt",
      bottom: "Slim-fit formal trousers",
      footwear: "Polished Oxford leather shoes",
      accessory: "Classic chronograph watch & leather belt"
    },
    streetwear: {
      top: "Heavyweight oversized graphic tee",
      bottom: "Relaxed utility cargo pants",
      footwear: "Retro high-top sneakers",
      accessory: "Canvas messenger bag & streetwear cap"
    },
    party: {
      top: "Sleek satin resort shirt",
      bottom: "Slim-fit black coating jeans",
      footwear: "Chelsea leather boots",
      accessory: "Silver curb chain necklace"
    },
    boho: {
      top: "Flowy printed linen tunic shirt",
      bottom: "Relaxed wide-leg linen trousers",
      footwear: "Woven leather slides",
      accessory: "Beaded multi-layer bracelet set"
    },
    casual: {
      top: "Relaxed linen-blend shirt",
      bottom: "Tailored stretch chinos",
      footwear: "Minimalist white leather sneakers",
      accessory: "Minimal woven belt"
    }
  };

  const currentTemplate = styleTemplates[style] || styleTemplates.casual;
  const primaryColor = options.colors?.[0] ? `${options.colors[0].charAt(0).toUpperCase()}${options.colors[0].slice(1)}` : "Neutral";
  const secondaryColor = options.colors?.[1] ? `${options.colors[1].charAt(0).toUpperCase()}${options.colors[1].slice(1)}` : "Complementary";

  const outfits = [
    {
      name: `${style.charAt(0).toUpperCase() + style.slice(1)} Day Edit`,
      items: [
        { type: "Top", name: `${gender} ${currentTemplate.top} in ${primaryColor}`, price: getPrice(1390), platform: getPlatform("top", 0) },
        { type: "Bottom", name: `${gender} ${currentTemplate.bottom}`, price: getPrice(1590), platform: getPlatform("bottom", 0) },
        { type: "Footwear", name: `${gender} ${currentTemplate.footwear}`, price: getPrice(2190), platform: getPlatform("footwear", 0) },
        { type: "Accessory", name: `${currentTemplate.accessory}`, price: getPrice(690), platform: getPlatform("accessory", 0) },
      ],
    },
    {
      name: `${season} Layered Edit`,
      items: [
        { type: "Top", name: `${gender} layered jacket over ${currentTemplate.top} with ${secondaryColor} accents`, price: getPrice(1890), platform: getPlatform("top", 1) },
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
        { type: "Top", name: `${gender} premium shirt with ${colorString.split(", ")[0] || "neutral"} shades`, price: getPrice(1490), platform: getPlatform("top", 2) },
        { type: "Bottom", name: `${gender} classic jeans`, price: getPrice(1690), platform: getPlatform("bottom", 2) },
        { type: "Footwear", name: "Casual low-top canvas sneakers", price: getPrice(1290), platform: getPlatform("footwear", 2) },
        { type: "Accessory", name: "Genuine leather wallet", price: getPrice(590), platform: getPlatform("accessory", 2) },
      ],
    }
  ];

  return `${outfits.map((outfit) => formatOutfit(outfit)).join("\n\n")}\n\n## ✨ Complementary Picks\nA polished edit with ${colorString} tones, balanced for ${season} and a ${budget} budget styling.\n\n${complementary.map((outfit) => formatOutfit(outfit)).join("\n\n")}`;
}

export default function AIDesigner() {
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("medium");
  const [selectedGender, setSelectedGender] = useState("unisex");
  const [isGenerating, setIsGenerating] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const toggleColor = (id: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length < 3) return [...prev, id];
      return prev;
    });
  };

  const canGenerate = selectedStyle && selectedColors.length > 0 && selectedSeason;

  const generate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setResponseText("");
    setError("");
    setStep(4);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-designer`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          style: selectedStyle,
          colors: selectedColors,
          season: selectedSeason,
          gender: selectedGender,
          budget: selectedBudget,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        console.warn("AI Designer fallback for response failure:", err.error || resp.status);
        const fallback = buildLocalDesignerResponse({
          style: selectedStyle,
          colors: selectedColors,
          season: selectedSeason,
          gender: selectedGender,
          budget: selectedBudget,
        });
        setResponseText(fallback);
        return;
      }

      if (!resp.body) {
        const fallback = buildLocalDesignerResponse({
          style: selectedStyle,
          colors: selectedColors,
          season: selectedSeason,
          gender: selectedGender,
          budget: selectedBudget,
        });
        setResponseText(fallback);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let designerContent = "";
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              designerContent += content;
              setResponseText(designerContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Generation aborted");
        return;
      }
      console.error("AI Designer error:", error);
      const fallback = buildLocalDesignerResponse({
        style: selectedStyle,
        colors: selectedColors,
        season: selectedSeason,
        gender: selectedGender,
        budget: selectedBudget,
      });
      setResponseText(fallback);
      toast({ title: "Designer fallback active", description: "Using local AI-style outfit generation." });
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setSelectedStyle("");
    setSelectedColors([]);
    setSelectedSeason("");
    setSelectedBudget("medium");
    setSelectedGender("unisex");
    setResponseText("");
    setError("");
    setIsGenerating(false);
    setStep(1);
  };

  const outfits = parseOutfits(responseText);
  const nonOutfitText = responseText
    .replace(/:::outfit\[.+?\][\s\S]*?:::/g, "")
    .trim();

  return (
    <>
      <Seo title="AI Outfit Designer — StyleSnap" description="Generate visual fashion concepts by style, color, and season with StyleSnap's AI Designer." path="/ai-designer" />
      <div className="min-h-screen bg-background transition-colors duration-300">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-hero dark:bg-gradient-to-b dark:from-background dark:to-card py-16 md:py-24">
          <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.15]">
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
          </div>
          <div className="container relative text-center max-w-3xl mx-auto px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 dark:bg-accent/20 text-accent mb-6 border border-accent/20">
              <Wand2 className="w-4 h-4" />
              <span className="text-sm font-medium font-body">AI Style Inspiration</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 tracking-tight">
              AI Fashion <span className="text-gradient-gold">Designer</span>
            </h1>
            <p className="text-muted-foreground text-lg font-body max-w-xl mx-auto">
              Get personalized outfit suggestions with AI-generated visuals to inspire your style. Pure inspiration, no shopping needed.
            </p>
          </div>
        </section>

        <div className="container max-w-5xl mx-auto px-4 py-12 space-y-10">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 md:gap-4 text-sm font-body">
            {["Style", "Colors", "Season", "Results"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${step > i + 1
                    ? "bg-accent text-accent-foreground shadow-gold"
                    : step === i + 1
                      ? "bg-primary text-primary-foreground ring-2 ring-accent ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`hidden md:inline transition-colors ${step >= i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Step 1: Style */}
          {step >= 1 && step < 4 && (
            <div className="animate-fade-up space-y-4">
              <h2 className="text-2xl font-display font-semibold text-foreground">Pick Your Style</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STYLES.map((s) => (
                  <Card
                    key={s.id}
                    onClick={() => { setSelectedStyle(s.id); if (step === 1) setStep(2); }}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-card group border ${selectedStyle === s.id
                      ? "ring-2 ring-accent bg-accent/5 dark:bg-accent/10 shadow-gold border-accent/30"
                      : "hover:bg-secondary/50 dark:hover:bg-secondary/30 border-border"
                      }`}
                  >
                    <CardContent className="p-4 text-center space-y-1">
                      <span className="text-3xl">{s.icon}</span>
                      <p className="font-semibold text-foreground font-body">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Colors */}
          {step >= 2 && step < 4 && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent" /> Color Palette
                </h2>
                <span className="text-sm text-muted-foreground font-body">{selectedColors.length}/3 selected</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((c) => {
                  const active = selectedColors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { toggleColor(c.id); if (step === 2 && (selectedColors.length > 0 || !active)) setStep(3); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 font-body text-sm ${active
                        ? "border-accent bg-accent/10 dark:bg-accent/20 shadow-md text-foreground"
                        : "border-border hover:border-accent/50 bg-card text-foreground"
                        }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 shadow-sm"
                        style={{
                          backgroundColor: c.hex,
                          borderColor: active ? "hsl(var(--accent))" : "hsl(var(--border))",
                        }}
                      />
                      {c.label}
                      {active && <span className="text-accent font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Season + Budget + Gender + Generate */}
          {step >= 3 && step < 4 && (
            <div className="animate-fade-up space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-display font-semibold text-foreground">Gender, Season & Budget</h2>

                {/* Gender Selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground font-body">Who is this for?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {GENDERS.map((g) => (
                      <Card
                        key={g.id}
                        onClick={() => setSelectedGender(g.id)}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-card border ${selectedGender === g.id
                          ? "ring-2 ring-accent bg-accent/5 dark:bg-accent/10 shadow-gold border-accent/30"
                          : "hover:bg-secondary/50 dark:hover:bg-secondary/30 border-border"
                          }`}
                      >
                        <CardContent className="p-3 text-center space-y-1">
                          <span className="text-2xl">{g.icon}</span>
                          <p className="font-semibold text-foreground font-body text-sm">{g.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SEASONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Card
                        key={s.id}
                        onClick={() => setSelectedSeason(s.id)}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-card border ${selectedSeason === s.id
                          ? "ring-2 ring-accent bg-accent/5 dark:bg-accent/10 shadow-gold border-accent/30"
                          : "hover:bg-secondary/50 dark:hover:bg-secondary/30 border-border"
                          }`}
                      >
                        <CardContent className="p-4 text-center space-y-1">
                          <Icon className={`w-6 h-6 mx-auto ${s.color}`} />
                          <p className="font-semibold text-foreground font-body text-sm">{s.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <Badge
                    key={b.id}
                    variant={selectedBudget === b.id ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 text-sm transition-all duration-200 ${selectedBudget === b.id
                      ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                      : "hover:bg-secondary dark:hover:bg-secondary/50 text-foreground"
                      }`}
                    onClick={() => setSelectedBudget(b.id)}
                  >
                    {b.label} · {b.desc}
                  </Badge>
                ))}
              </div>

              <Button
                size="lg"
                disabled={!canGenerate || isGenerating}
                onClick={generate}
                className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold font-body text-base gap-2 transition-all duration-200"
              >
                <Sparkles className="w-5 h-5" />
                {isGenerating ? "Designing..." : "Generate Style Inspiration"}
              </Button>
            </div>
          )}

          {/* Step 4: Results - Style Inspiration Only */}
          {step === 4 && (
            <div className="space-y-8 animate-fade-up">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-foreground">Your Style Inspiration</h2>
                  <p className="text-sm text-muted-foreground font-body mt-1">AI-generated outfit ideas to inspire your personal style</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="capitalize text-foreground border-border">{selectedStyle}</Badge>
                    {selectedColors.map((c) => {
                      const col = COLORS.find((x) => x.id === c);
                      return (
                        <Badge key={c} variant="outline" className="gap-1 text-foreground border-border">
                          <span
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: col?.hex, borderColor: "hsl(var(--border))" }}
                          />
                          {col?.label}
                        </Badge>
                      );
                    })}
                    <Badge variant="outline" className="capitalize text-foreground border-border">{selectedSeason}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                  <RotateCcw className="w-4 h-4" /> New Design
                </Button>
              </div>

              {isGenerating && outfits.length === 0 && (
                <div className="flex flex-col items-center py-20 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted border-t-accent animate-spin" />
                    <Sparkles className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-muted-foreground font-body animate-pulse-soft">AI is crafting your style inspiration...</p>
                </div>
              )}

              {error && !isGenerating && outfits.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-4">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <p className="text-foreground font-body font-medium">{error}</p>
                  <Button onClick={generate} variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </Button>
                </div>
              )}

              {outfits.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {outfits.map((outfit) => (
                    <OutfitCard
                      key={outfit.name}
                      outfit={outfit}
                      onSaveLook={() => undefined}
                      addToWishlist={() => undefined}
                      addToCart={() => undefined}
                      isSaved={false}
                      gender={selectedGender}
                    />
                  ))}
                </div>
              )}

              {nonOutfitText && (
                <Card className="bg-secondary/30 dark:bg-card border-border">
                  <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none text-foreground font-body">
                    <ReactMarkdown>{nonOutfitText}</ReactMarkdown>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
