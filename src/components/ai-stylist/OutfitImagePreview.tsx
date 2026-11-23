import { useState, useEffect } from "react";
import { Loader2, X, Maximize2, RefreshCw, Sparkles, ExternalLink, ShoppingBag } from "lucide-react";
import type { ParsedOutfit } from "./OutfitCard";

interface OutfitImagePreviewProps {
  readonly outfit: ParsedOutfit;
  readonly gender?: string;
  readonly realTimeProducts?: Record<string, {
    name: string;
    price: number;
    platform: string;
    image: string;
    link: string;
  }>;
  readonly productImages?: Record<string, string>;
}

interface FetchedItem {
  type: string;
  name: string;
  price: number;
  platform: string;
  imageUrl: string | null;
  productUrl: string;
}

const TYPE_EMOJI: Record<string, string> = {
  top: "👕", shirt: "👕", blouse: "👚", dress: "👗", kurta: "👘", saree: "👘",
  bottom: "👖", trouser: "👖", pant: "👖", jean: "👖", skirt: "🩱",
  footwear: "👟", shoe: "👟", boot: "🥾", sandal: "🩴", heel: "👠",
  accessory: "💍", bag: "👜", watch: "⌚", jacket: "🧥", blazer: "🥼",
};

function getEmoji(type: string) {
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(TYPE_EMOJI)) {
    if (lower.includes(key)) return icon;
  }
  return "🏷️";
}

function getPlatformSearch(platform: string, productName: string): string {
  const q = encodeURIComponent(productName);
  const p = platform.toLowerCase();
  if (p.includes("amazon")) return `https://www.amazon.in/s?k=${q}`;
  if (p.includes("myntra")) return `https://www.myntra.com/search?q=${q}`;
  if (p.includes("flipkart")) return `https://www.flipkart.com/search?q=${q}`;
  if (p.includes("ajio")) return `https://www.ajio.com/search/?text=${q}`;
  if (p.includes("meesho")) return `https://www.meesho.com/search?q=${q}`;
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}

async function fetchProductImage(
  itemName: string,
  platform: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ imageUrl: string | null; productUrl: string; realName?: string; realPrice?: number; realPlatform?: string }> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/search-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ query: itemName }),
    });
    if (!resp.ok) return { imageUrl: null, productUrl: getPlatformSearch(platform, itemName) };

    const data = await resp.json();
    const products: any[] = data.products || [];

    for (const p of products) {
      if (p.image && p.image.startsWith("http")) {
        // Try to find a link matching the suggested platform first
        const platformPrice = p.prices?.find((pr: any) => {
          if (!pr.platform) return false;
          const prName = pr.platform.toLowerCase();
          const platName = platform.toLowerCase();
          return prName.includes(platName) || platName.includes(prName);
        });

        const platformLink = platformPrice?.link;
        const anyLink = p.prices?.[0]?.link || getPlatformSearch(platform, itemName);
        return {
          imageUrl: p.image,
          productUrl: platformLink || anyLink,
          realName: p.name,
          realPrice: platformPrice?.price || p.prices?.[0]?.price || p.price,
          realPlatform: platformPrice?.platform || p.prices?.[0]?.platform || platform,
        };
      }
    }
    return { imageUrl: null, productUrl: getPlatformSearch(platform, itemName) };
  } catch {
    return { imageUrl: null, productUrl: getPlatformSearch(platform, itemName) };
  }
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="aspect-square rounded-lg bg-secondary/50 animate-pulse flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-secondary" />
    </div>
  );
}

const CATEGORY_IMAGES: Record<string, string> = {
  dress: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop",
  dresses: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop",
  gown: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop",
  heel: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop",
  heels: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop",
  shoe: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  sneaker: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  boot: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  boots: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  sandal: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  sandals: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
  bag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop",
  handbag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop",
  handbags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop",
  clutch: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop",
  clutches: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop",
  watch: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&auto=format&fit=crop",
  watches: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&auto=format&fit=crop",
  blazer: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop",
  blazers: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop",
  jacket: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop",
  jackets: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop",
  shirt: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop",
  shirts: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop",
  top: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop",
  tops: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop",
  jeans: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop",
  trousers: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop",
};

function getFallbackImageUrl(categoryOrType: string): string {
  const lower = categoryOrType.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }
  return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&auto=format&fit=crop"; // default shirt
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ProductImageCard({ item }: { item: FetchedItem }) {
  const [imgError, setImgError] = useState(false);
  const emoji = getEmoji(item.type);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.productUrl) window.open(item.productUrl, "_blank");
  };

  const previewUrl = item.imageUrl && !imgError ? item.imageUrl : null;
  const isFallback = !previewUrl;

  return (
    <div
      className="relative group/card aspect-square rounded-lg overflow-hidden bg-secondary/20 cursor-pointer border border-border/30 hover:border-gold/40 transition-all duration-200 flex items-center justify-center"
      onClick={handleClick}
      title={`Shop: ${item.name}`}
    >
      {isFallback ? (
        <span className="text-3xl select-none">{emoji}</span>
      ) : (
        <img
          src={previewUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          onError={() => setImgError(true)}
        />
      )}


      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
        <p className="text-[9px] text-white/70 leading-tight">{emoji} {item.type}</p>
        <p className="text-[10px] text-white font-semibold leading-tight line-clamp-2">{item.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gold font-bold">
            {item.price === 0 ? "Own ✓" : `₹${item.price.toLocaleString()}`}
          </span>
          <span className="text-[8px] text-white/60 flex items-center gap-0.5">
            <ExternalLink className="w-2.5 h-2.5" /> {item.platform}
          </span>
        </div>
      </div>

      {/* Shop icon badge */}
      {item.productUrl && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
          <ShoppingBag className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OutfitImagePreview({ outfit, realTimeProducts, productImages }: OutfitImagePreviewProps) {
  const [fetchedItems, setFetchedItems] = useState<FetchedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  useEffect(() => {
    if (realTimeProducts && Object.keys(realTimeProducts).length > 0) {
      // Map directly from parent resolved state to guarantee 100% matching items and images
      const mapped = outfit.items.slice(0, 6).map((item): FetchedItem => {
        const isOwn = item.platform.toLowerCase() === "own wardrobe";
        const cacheKey = `${item.platform.toLowerCase()}:${item.name.toLowerCase()}`;
        const realProduct = realTimeProducts[cacheKey];
        const imageUrl = realProduct?.image || productImages?.[cacheKey] || null;
        
        return {
          type: item.type,
          name: realProduct ? realProduct.name : item.name,
          price: isOwn ? 0 : (realProduct ? realProduct.price : item.price),
          platform: isOwn ? "Own Wardrobe" : (realProduct ? realProduct.platform : item.platform),
          imageUrl,
          productUrl: realProduct ? realProduct.link : getPlatformSearch(item.platform, item.name)
        };
      });
      setFetchedItems(mapped);
      setIsLoading(false);
    } else {
      loadImages();
    }
  }, [outfit, realTimeProducts, productImages, fetchKey]);

  const loadImages = async () => {
    setIsLoading(true);
    setFetchedItems([]);

    const items = outfit.items.slice(0, 6);

    // Fetch all product images in parallel
    const results = await Promise.all(
      items.map(async (item): Promise<FetchedItem> => {
        const isOwn = item.platform.toLowerCase() === "own wardrobe";
        if (isOwn) {
          return { type: item.type, name: item.name, price: 0, platform: "Own Wardrobe", imageUrl: null, productUrl: "" };
        }
        const { imageUrl, productUrl, realName, realPrice, realPlatform } = await fetchProductImage(item.name, item.platform, supabaseUrl, anonKey);
        return {
          type: item.type,
          name: realName || item.name,
          price: typeof realPrice === "number" ? realPrice : item.price,
          platform: realPlatform || item.platform,
          imageUrl,
          productUrl
        };
      })
    );

    setFetchedItems(results);
    setIsLoading(false);
  };

  const count = outfit.items.slice(0, 6).length;

  const gridClass =
    count === 1 ? "grid-cols-1" :
    count === 2 ? "grid-cols-2" :
    count <= 4 ? "grid-cols-2" :
    "grid-cols-3";

  return (
    <div className="relative group">
      {/* Outer card */}
      <div
        className={`w-full rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
          isExpanded ? "fixed inset-3 z-50 bg-background/98 backdrop-blur-md flex flex-col shadow-2xl" : "cursor-pointer"
        }`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">{outfit.name}</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
          </div>
          <div className="flex items-center gap-1.5">
            {!isLoading && (
              <span className="text-[9px] text-muted-foreground">
                {fetchedItems.filter(i => i.imageUrl).length}/{count} found
              </span>
            )}
            {isExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="ml-1 p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Image grid */}
        <div
          className={`grid ${gridClass} gap-1 p-1.5 bg-background ${
            isExpanded ? "flex-1 overflow-y-auto" : ""
          }`}
        >
          {isLoading
            ? Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)
            : fetchedItems.map((item, i) => <ProductImageCard key={i} item={item} />)
          }
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-card border-t border-border/40">
          <span className="text-[9px] text-muted-foreground/70">
            {isLoading ? "Loading product images…" : "Tap any image to shop"}
          </span>
          <span className="text-xs font-bold text-gold">
            ₹{outfit.items.reduce((s, i) => s + i.price, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Hover controls */}
      {!isExpanded && !isLoading && (
        <div className="absolute top-9 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setFetchKey(k => k + 1); }}
            className="p-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
            title="Refresh product images"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="p-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
            title="Expand"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
