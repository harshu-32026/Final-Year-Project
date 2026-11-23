import { useState } from "react";
import {
  Heart, ShoppingBag, ExternalLink, Tag, BarChart3,
  Sparkles, Star, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceCompareModal } from "./PriceCompareModal";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ProductRecommendation {
  type: "product";
  category: string;
  name: string;
  brand?: string;
  color?: string;
  price: number;
  originalPrice?: number;
  platform: string;
  rating?: number;
  reviews?: number;
  image?: string;
  link?: string;
  score?: number;
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  string,
  { badge: string; shopBtn: string; searchUrl: (q: string) => string }
> = {
  myntra: {
    badge: "bg-pink-100 text-pink-800",
    shopBtn: "bg-pink-600 hover:bg-pink-700 text-white",
    searchUrl: (q) => `https://www.myntra.com/search?q=${encodeURIComponent(q)}`,
  },
  amazon: {
    badge: "bg-orange-100 text-orange-800",
    shopBtn: "bg-orange-500 hover:bg-orange-600 text-white",
    searchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  },
  flipkart: {
    badge: "bg-blue-100 text-blue-800",
    shopBtn: "bg-blue-600 hover:bg-blue-700 text-white",
    searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  },
  ajio: {
    badge: "bg-purple-100 text-purple-800",
    shopBtn: "bg-purple-600 hover:bg-purple-700 text-white",
    searchUrl: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`,
  },
  meesho: {
    badge: "bg-rose-100 text-rose-800",
    shopBtn: "bg-rose-500 hover:bg-rose-600 text-white",
    searchUrl: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`,
  },
  nykaa: {
    badge: "bg-fuchsia-100 text-fuchsia-800",
    shopBtn: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
    searchUrl: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}`,
  },
  zara: {
    badge: "bg-neutral-100 text-neutral-800",
    shopBtn: "bg-neutral-800 hover:bg-neutral-900 text-white",
    searchUrl: (q) => `https://www.zara.com/in/en/search?searchTerm=${encodeURIComponent(q)}`,
  },
  "h&m": {
    badge: "bg-red-100 text-red-800",
    shopBtn: "bg-red-600 hover:bg-red-700 text-white",
    searchUrl: (q) => `https://www2.hm.com/en_in/search-results.html?q=${encodeURIComponent(q)}`,
  },
  snapdeal: {
    badge: "bg-red-50 text-red-700",
    shopBtn: "bg-red-500 hover:bg-red-600 text-white",
    searchUrl: (q) => `https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}`,
  },
  "tata cliq": {
    badge: "bg-violet-100 text-violet-800",
    shopBtn: "bg-violet-600 hover:bg-violet-700 text-white",
    searchUrl: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`,
  },
};

const FALLBACK_CONFIG = {
  badge: "bg-gray-100 text-gray-700",
  shopBtn: "bg-gray-700 hover:bg-gray-800 text-white",
  searchUrl: (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`,
};

function getPlatformConfig(platform: string) {
  return PLATFORM_CONFIG[platform.toLowerCase()] ?? FALLBACK_CONFIG;
}

function getShopLink(p: ProductRecommendation): string {
  if (p.link) return p.link;
  return getPlatformConfig(p.platform).searchUrl(p.name);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchScore({ score }: { score: number }) {
  const color =
    score >= 85 ? "from-emerald-400 to-emerald-600" :
    score >= 65 ? "from-amber-400 to-amber-600" :
    "from-gray-400 to-gray-500";
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${color} shadow-sm`}>
      <Sparkles className="w-2.5 h-2.5" />
      {score}% match
    </div>
  );
}

function StarRating({ rating, reviews }: { rating: number; reviews?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3 h-3",
              i < full ? "fill-amber-400 text-amber-400" :
              i === full && half ? "fill-amber-200 text-amber-400" :
              "fill-muted text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {rating.toFixed(1)}{reviews ? ` (${reviews > 999 ? `${(reviews / 1000).toFixed(1)}k` : reviews})` : ""}
      </span>
    </div>
  );
}

function DiscountBadge({ price, originalPrice }: { price: number; originalPrice: number }) {
  if (originalPrice <= price) return null;
  const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
  if (pct < 2) return null;
  return (
    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full ml-1 flex items-center gap-0.5">
      <TrendingDown className="w-2.5 h-2.5" />
      {pct}% off
    </span>
  );
}

// ─── CATEGORY IMAGES for fallback placeholders ───────────────────────────────

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

function getFallbackImageUrl(category: string): string {
  const lower = category.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }
  return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&auto=format&fit=crop"; // default shirt
}

function CategoryPlaceholder({ category }: { category: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-secondary/35 text-muted-foreground/30 border border-dashed border-border/60 select-none">
      <ShoppingBag className="w-12 h-12 mb-2 text-muted-foreground/35" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/45">{category || "Product"}</span>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  addToWishlist,
  addToCart,
}: {
  product: ProductRecommendation;
  addToWishlist: (p: any) => void;
  addToCart: (p: any) => void;
}) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [cartActive, setCartActive] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cfg = getPlatformConfig(product.platform);
  const shopLink = getShopLink(product);
  const hasOriginal = (product.originalPrice ?? 0) > product.price;

  const mockProductForModal = {
    id: Math.abs(product.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
    name: product.name,
    image: product.image || "",
    prices: [
      {
        platform: product.platform,
        price: product.price,
        originalPrice: product.originalPrice ?? Math.round(product.price * 1.25),
        rating: product.rating ?? 4.2,
        reviews: product.reviews ?? 180,
        link: shopLink,
        source: product.platform,
      },
    ],
  };

  const handleWishlist = () => {
    addToWishlist({ name: product.name, price: product.price, platform: product.platform, image: product.image || "", link: shopLink });
    setWishlistActive(true);
    toast({ title: "❤️ Added to wishlist", description: product.name });
  };

  const handleCart = () => {
    addToCart({ name: product.name, price: product.price, platform: product.platform, image: product.image || "", link: shopLink });
    setCartActive(true);
    toast({ title: "🛍️ Added to cart", description: product.name });
  };

  return (
    <>
      <div className="group rounded-2xl border border-border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-250 overflow-hidden flex flex-col">

        {/* ── Image area ─────────────────────────────────────────────── */}
        <div className="h-44 bg-gradient-to-br from-muted/50 to-muted/80 flex items-center justify-center overflow-hidden relative">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-350"
            />
          ) : (
            <CategoryPlaceholder category={product.category} />
          )}

          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Top badges row */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${cfg.badge}`}>
              {product.platform}
            </span>
            {product.score !== undefined && <MatchScore score={product.score} />}
          </div>

          {/* Wishlist shortcut on image */}
          <button
            onClick={handleWishlist}
            className={cn(
              "absolute bottom-2 right-2 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-200",
              wishlistActive
                ? "bg-red-500 text-white"
                : "bg-background/80 text-muted-foreground hover:text-red-500 hover:bg-background"
            )}
            title="Add to wishlist"
          >
            <Heart className={cn("w-4 h-4", wishlistActive && "fill-current")} />
          </button>
        </div>

        {/* ── Info area ──────────────────────────────────────────────── */}
        <div className="p-3 flex flex-col gap-2 flex-1">

          {/* Category pill */}
          <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/70">
            {product.category}
          </span>

          {/* Product name */}
          <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {product.name}
          </p>

          {/* Brand + Color tags */}
          {(product.brand || product.color) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {product.brand && (
                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {product.brand}
                </span>
              )}
              {product.color && (
                <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: product.color.toLowerCase() }}
                  />
                  {product.color}
                </span>
              )}
            </div>
          )}

          {/* Rating */}
          {product.rating !== undefined && product.rating > 0 && (
            <StarRating rating={product.rating} reviews={product.reviews} />
          )}

          {/* Price row */}
          <div className="flex items-center flex-wrap gap-1">
            <span className="text-base font-bold text-gold">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {hasOriginal && (
              <span className="text-xs text-muted-foreground line-through">
                ₹{product.originalPrice!.toLocaleString("en-IN")}
              </span>
            )}
            {hasOriginal && (
              <DiscountBadge price={product.price} originalPrice={product.originalPrice!} />
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-border/50">
            <Button
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 flex-shrink-0", cartActive && "text-primary")}
              onClick={handleCart}
              title="Add to cart"
            >
              <ShoppingBag className={cn("w-3.5 h-3.5", cartActive && "fill-current")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setCompareOpen(true)}
              title="Compare prices"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
            <a href={shopLink} target="_blank" rel="noopener noreferrer" className="flex-1 ml-auto">
              <button
                className={cn(
                  "w-full h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                  cfg.shopBtn
                )}
              >
                Shop on {product.platform} <ExternalLink className="w-3 h-3" />
              </button>
            </a>
          </div>
        </div>
      </div>

      <PriceCompareModal product={mockProductForModal} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </>
  );
}
