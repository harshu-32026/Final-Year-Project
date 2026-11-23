import { useState, useEffect } from "react";
import { Heart, ShoppingBag, Bookmark, BookmarkCheck, ExternalLink, Tag, BarChart3, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceCompareModal } from "./PriceCompareModal";
import { OutfitImagePreview } from "./OutfitImagePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OutfitItem {
  type: string;
  name: string;
  price: number;
  platform: string;
}

export interface ParsedOutfit {
  name: string;
  items: OutfitItem[];
}

const PLATFORM_SEARCH_URLS: Record<string, (query: string) => string> = {
  amazon: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  myntra: (q) => `https://www.myntra.com/search?q=${encodeURIComponent(q)}`,
  flipkart: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  ajio: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`,
  meesho: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`,
  "h&m": (q) => `https://www2.hm.com/en_in/search-results.html?q=${encodeURIComponent(q)}`,
  zara: (q) => `https://www.zara.com/in/en/search?searchTerm=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`,
};

function getSearchUrl(platform: string, productName: string): string | null {
  if (platform.toLowerCase() === "own wardrobe") return null;
  const key = platform.toLowerCase();
  const builder = PLATFORM_SEARCH_URLS[key] || PLATFORM_SEARCH_URLS.google;
  return builder(productName);
}

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    amazon: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    myntra: "bg-pink-500/15 text-pink-600 border-pink-500/30",
    flipkart: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    ajio: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    meesho: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    "h&m": "bg-red-500/15 text-red-600 border-red-500/30",
    zara: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-300 border-neutral-500/30",
    "own wardrobe": "bg-green-500/15 text-green-600 border-green-500/30",
  };
  return colors[platform.toLowerCase()] || "bg-muted text-muted-foreground border-border";
}

const TYPE_ICONS: Record<string, string> = {
  top: "👕",
  bottom: "👖",
  footwear: "👟",
  accessory: "💍",
  jacket: "🧥",
  dress: "👗",
  bag: "👜",
  watch: "⌚",
};

interface OutfitCardProps {
  outfit: ParsedOutfit;
  onSaveLook: (outfit: ParsedOutfit) => void;
  addToWishlist: (product: any) => void;
  addToCart: (product: any) => void;
  isSaved?: boolean;
  gender?: string;
}

const directLinkCache: Record<string, string> = {};

const getCachedLink = (platform: string, productName: string): string | null => {
  try {
    const key = `direct_link:${platform.toLowerCase()}:${productName.toLowerCase()}`;
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const setCachedLink = (platform: string, productName: string, url: string) => {
  try {
    const key = `direct_link:${platform.toLowerCase()}:${productName.toLowerCase()}`;
    localStorage.setItem(key, url);
  } catch (e) {
    // Ignore storage quota errors
  }
};

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

export function OutfitCard({ outfit, onSaveLook, addToWishlist, addToCart, isSaved, gender }: OutfitCardProps) {
  const [compareItem, setCompareItem] = useState<string | null>(null);
  const [redirectingItem, setRedirectingItem] = useState<string | null>(null);
  const [preFetchedLinks, setPreFetchedLinks] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [realTimeProducts, setRealTimeProducts] = useState<Record<string, {
    name: string;
    price: number;
    platform: string;
    image: string;
    link: string;
  }>>({});

  const totalPrice = outfit.items.reduce((s, i) => {
    const isOwn = i.platform.toLowerCase() === "own wardrobe";
    if (isOwn) return s;
    const cacheKey = `${i.platform.toLowerCase()}:${i.name.toLowerCase()}`;
    const realProduct = realTimeProducts[cacheKey];
    return s + (realProduct ? realProduct.price : i.price);
  }, 0);

  const ownItems = outfit.items.filter((i) => i.platform.toLowerCase() === "own wardrobe").length;

  useEffect(() => {
    // Background pre-fetch all buy items with a small delay to avoid slamming the edge functions during generation
    const buyItems = outfit.items.filter((i) => i.platform.toLowerCase() !== "own wardrobe");
    if (buyItems.length === 0) return;

    const timer = setTimeout(() => {
      buyItems.forEach((item) => {
        preFetchProductLink(item.platform, item.name);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [outfit]);

  const preFetchProductLink = async (platform: string, productName: string) => {
    const cacheKey = `${platform.toLowerCase()}:${productName.toLowerCase()}`;

    // Check LocalStorage cache first
    const diskCached = getCachedLink(platform, productName);
    if (diskCached) {
      directLinkCache[cacheKey] = diskCached;
      setPreFetchedLinks(prev => ({ ...prev, [cacheKey]: diskCached }));
      const diskCachedImg = localStorage.getItem(`product_image:${cacheKey}`);
      if (diskCachedImg) {
        setProductImages(prev => ({ ...prev, [cacheKey]: diskCachedImg }));
      }
      const diskCachedName = localStorage.getItem(`product_name:${cacheKey}`);
      const diskCachedPrice = localStorage.getItem(`product_price:${cacheKey}`);
      const diskCachedPlatform = localStorage.getItem(`product_platform:${cacheKey}`);
      if (diskCachedName && diskCachedPrice && diskCachedPlatform) {
        setRealTimeProducts(prev => ({
          ...prev,
          [cacheKey]: {
            name: diskCachedName,
            price: parseInt(diskCachedPrice) || 0,
            platform: diskCachedPlatform,
            image: diskCachedImg || "",
            link: diskCached
          }
        }));
      }
      return;
    }

    if (directLinkCache[cacheKey] || preFetchedLinks[cacheKey]) return;

    try {
      setPreFetchedLinks(prev => ({ ...prev, [cacheKey]: "fetching" }));
      directLinkCache[cacheKey] = "fetching";

      const { data } = await supabase.functions.invoke("search-products", {
        body: { query: productName },
      });

      const products = data?.products || [];
      const firstWithImage = products.find((p: any) => p.image);
      if (firstWithImage?.image) {
        setProductImages(prev => ({ ...prev, [cacheKey]: firstWithImage.image }));
        try {
          localStorage.setItem(`product_image:${cacheKey}`, firstWithImage.image);
        } catch (e) {}
      }

      let directUrl = "";
      let matchedPriceObj = null;

      for (const p of products) {
        const match = p.prices.find((pr: any) => {
          const prName = pr.platform.toLowerCase();
          const platName = platform.toLowerCase();
          return prName.includes(platName) || platName.includes(prName);
        });
        if (match?.link) {
          directUrl = match.link;
          matchedPriceObj = match;
          break;
        }
      }


      if (!directUrl && products[0]?.prices?.[0]?.link) {
        directUrl = products[0].prices[0].link;
        matchedPriceObj = products[0].prices[0];
      }

      if (directUrl) {
        directLinkCache[cacheKey] = directUrl;
        setCachedLink(platform, productName, directUrl);
        setPreFetchedLinks(prev => ({ ...prev, [cacheKey]: directUrl }));

        const matchedProduct = products.find((p: any) => p.prices.some((pr: any) => pr.link === directUrl)) || products[0];
        if (matchedProduct) {
          const realPrice = matchedPriceObj?.price || matchedProduct.price;
          const realPlatform = matchedPriceObj?.platform || matchedProduct.platform || platform;
          
          setRealTimeProducts(prev => ({
            ...prev,
            [cacheKey]: {
              name: matchedProduct.name,
              price: realPrice,
              platform: realPlatform,
              image: matchedProduct.image || "",
              link: directUrl
            }
          }));

          try {
            localStorage.setItem(`product_name:${cacheKey}`, matchedProduct.name);
            localStorage.setItem(`product_price:${cacheKey}`, String(realPrice));
            localStorage.setItem(`product_platform:${cacheKey}`, realPlatform);
          } catch (e) {}
        }
      } else {
        const fallbackUrl = getSearchUrl(platform, productName) || "";
        directLinkCache[cacheKey] = fallbackUrl;
        setCachedLink(platform, productName, fallbackUrl);
        setPreFetchedLinks(prev => ({ ...prev, [cacheKey]: fallbackUrl }));
      }
    } catch (e) {
      console.warn("Pre-fetch failed for", productName, e);
      delete directLinkCache[cacheKey];
      setPreFetchedLinks(prev => {
        const copy = { ...prev };
        delete copy[cacheKey];
        return copy;
      });
    }
  };


  const handleRedirectToProduct = async (platform: string, productName: string) => {
    const cacheKey = `${platform.toLowerCase()}:${productName.toLowerCase()}`;

    // 1. Instant cache hit (Memory cache)
    if (directLinkCache[cacheKey] && directLinkCache[cacheKey] !== "fetching") {
      window.open(directLinkCache[cacheKey], "_blank");
      return;
    }

    // 2. Instant cache hit (LocalStorage cache)
    const diskCached = getCachedLink(platform, productName);
    if (diskCached) {
      directLinkCache[cacheKey] = diskCached;
      window.open(diskCached, "_blank");
      return;
    }

    // 3. If already fetching in background, wait and check
    if (preFetchedLinks[cacheKey] === "fetching" || directLinkCache[cacheKey] === "fetching" || redirectingItem === productName) {
      setRedirectingItem(productName);
      const toastId = toast.loading(`Resolving specific page for "${productName}"...`);

      // Poll cache for up to 3 seconds
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));

        // Check disk cache during polling as well
        const latestDiskCached = getCachedLink(platform, productName);
        if (latestDiskCached) {
          directLinkCache[cacheKey] = latestDiskCached;
        }

        if (directLinkCache[cacheKey] && directLinkCache[cacheKey] !== "fetching") {
          toast.success(`Redirecting...`, { id: toastId });
          window.open(directLinkCache[cacheKey], "_blank");
          setRedirectingItem(null);
          return;
        }
      }
      toast.dismiss(toastId);
    }

    // 4. Fresh fetch if not cached or fetching
    if (redirectingItem) return;
    setRedirectingItem(productName);
    const toastId = toast.loading(`Finding specific page for "${productName}" on ${platform}...`);

    try {
      const { data, error } = await supabase.functions.invoke("search-products", {
        body: { query: productName },
      });

      if (error) throw error;

      const products = data?.products || [];
      const firstWithImage = products.find((p: any) => p.image);
      if (firstWithImage?.image) {
        setProductImages(prev => ({ ...prev, [cacheKey]: firstWithImage.image }));
        try {
          localStorage.setItem(`product_image:${cacheKey}`, firstWithImage.image);
        } catch (e) {}
      }

      let directUrl = "";
      let matchedPriceObj = null;

      for (const p of products) {
        const match = p.prices.find((pr: any) => {
          const prName = pr.platform.toLowerCase();
          const platName = platform.toLowerCase();
          return prName.includes(platName) || platName.includes(prName);
        });
        if (match?.link) {
          directUrl = match.link;
          matchedPriceObj = match;
          break;
        }
      }


      if (!directUrl && products[0]?.prices?.[0]?.link) {
        directUrl = products[0].prices[0].link;
        matchedPriceObj = products[0].prices[0];
      }

      if (directUrl) {
        directLinkCache[cacheKey] = directUrl;
        setCachedLink(platform, productName, directUrl);

        const matchedProduct = products.find((p: any) => p.prices.some((pr: any) => pr.link === directUrl)) || products[0];
        if (matchedProduct) {
          const realPrice = matchedPriceObj?.price || matchedProduct.price;
          const realPlatform = matchedPriceObj?.platform || matchedProduct.platform || platform;
          setRealTimeProducts(prev => ({
            ...prev,
            [cacheKey]: {
              name: matchedProduct.name,
              price: realPrice,
              platform: realPlatform,
              image: matchedProduct.image || "",
              link: directUrl
            }
          }));
          try {
            localStorage.setItem(`product_name:${cacheKey}`, matchedProduct.name);
            localStorage.setItem(`product_price:${cacheKey}`, String(realPrice));
            localStorage.setItem(`product_platform:${cacheKey}`, realPlatform);
          } catch (e) {}
        }

        toast.success(`Found direct page! Redirecting...`, { id: toastId });
        window.open(directUrl, "_blank");
      } else {
        const firstBackup = products[0]?.prices?.[0]?.link;
        if (firstBackup) {
          directLinkCache[cacheKey] = firstBackup;
          setCachedLink(platform, productName, firstBackup);
          toast.success(`Redirecting to top result...`, { id: toastId });
          window.open(firstBackup, "_blank");
        } else {
          const fallbackUrl = getSearchUrl(platform, productName) || "";
          directLinkCache[cacheKey] = fallbackUrl;
          setCachedLink(platform, productName, fallbackUrl);
          toast.info(`Opening search page...`, { id: toastId });
          window.open(fallbackUrl, "_blank");
        }
      }
    } catch (err) {
      console.error("Redirect error:", err);
      const fallbackUrl = getSearchUrl(platform, productName) || "";
      toast.info(`Opening search page...`, { id: toastId });
      if (fallbackUrl) window.open(fallbackUrl, "_blank");
    } finally {
      setRedirectingItem(null);
    }
  };

  return (
    <>
      <div
        className="rounded-2xl bg-card border border-border p-5 text-left shadow-card hover:shadow-elevated transition-all duration-300 group relative overflow-hidden"
        onMouseEnter={() => {
          const buyItems = outfit.items.filter((i) => i.platform.toLowerCase() !== "own wardrobe");
          if (buyItems.length > 0) {
            preFetchProductLink(buyItems[0].platform, buyItems[0].name);
          }
        }}
      >
        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/60 via-gold to-gold/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm leading-tight">{outfit.name}</h4>
              {ownItems > 0 && (
                <span className="text-[10px] text-green-600 font-medium">
                  ✓ {ownItems} from your wardrobe
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onSaveLook(outfit)}
            className={`p-2 rounded-lg transition-all duration-200 ${isSaved
              ? "text-gold bg-gold/15 shadow-sm"
              : "hover:bg-gold/10 hover:text-gold text-muted-foreground hover:shadow-sm"
              }`}
            title={isSaved ? "Already saved" : "Save this look"}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {outfit.items.map((item, ii) => {
            const isOwn = item.platform.toLowerCase() === "own wardrobe";
            const icon = TYPE_ICONS[item.type.toLowerCase()] || "🏷️";
            const cacheKey = `${item.platform.toLowerCase()}:${item.name.toLowerCase()}`;
            
            // Get resolved real-time details if available
            const realProduct = realTimeProducts[cacheKey];
            const searchUrl = realProduct ? realProduct.link : (getSearchUrl(item.platform, item.name) || "");
            const displayName = realProduct ? realProduct.name : item.name;
            const displayPrice = realProduct ? realProduct.price : item.price;
            const displayPlatform = realProduct ? realProduct.platform : item.platform;
            const imageUrl = realProduct?.image || productImages[cacheKey] || null;
            const isFallback = !imageUrl;

            return (
              <div
                key={ii}
                className="rounded-xl bg-secondary/40 border border-transparent hover:border-border/60 p-3 transition-all duration-200 hover:bg-secondary/70"
                onMouseEnter={() => !isOwn && preFetchProductLink(item.platform, item.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/20 flex-shrink-0 border border-border/20 shadow-sm relative flex items-center justify-center">
                    {isFallback ? (
                      <span className="text-xl select-none">{icon}</span>
                    ) : (
                      <img 
                        src={imageUrl} 
                        alt={displayName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const span = document.createElement("span");
                            span.className = "text-xl select-none";
                            span.innerText = icon;
                            parent.appendChild(span);
                          }
                        }}
                      />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 rounded px-1 text-white leading-none">
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {item.type}
                        </span>
                        <p
                          onClick={() => !isOwn && handleRedirectToProduct(item.platform, item.name)}
                          className={`text-xs font-medium leading-snug ${!isOwn ? "cursor-pointer hover:text-gold hover:underline transition-colors" : ""}`}
                        >
                          {displayName}
                        </p>
                      </div>
                      <span className={`text-sm font-bold whitespace-nowrap ${isOwn ? "text-green-600" : "text-foreground"}`}>
                        {isOwn ? "Free ✓" : `₹${displayPrice.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 h-auto font-medium rounded-full ${getPlatformColor(displayPlatform)}`}
                      >
                        {displayPlatform}
                      </Badge>
                      {!isOwn && (
                        <div className="flex items-center gap-0.5">
                          {/* Compare Prices Button */}
                          <button
                            onClick={() => setCompareItem(displayName)}
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted-foreground hover:text-gold transition-colors"
                            title="Compare prices across platforms"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                          {!isOwn && (
                            <button
                              onClick={() => handleRedirectToProduct(item.platform, item.name)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                              disabled={redirectingItem === item.name}
                              title={`Go to direct product page on ${displayPlatform}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => addToWishlist({ name: displayName, price: displayPrice, platform: displayPlatform, url: searchUrl })}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Add to wishlist"
                          >
                            <Heart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => addToCart({ name: displayName, price: displayPrice, platform: displayPlatform, url: searchUrl })}
                            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted-foreground hover:text-gold transition-colors"
                            title="Add to cart"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Image Preview */}
        <div className="mb-3">
          <OutfitImagePreview 
            outfit={outfit} 
            gender={gender} 
            realTimeProducts={realTimeProducts}
            productImages={productImages}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <span className="font-display font-bold text-base">₹{totalPrice.toLocaleString()}</span>
            {ownItems > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1.5">
                ({ownItems} owned)
              </span>
            )}
          </div>
          <Button
            variant="gold"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg shadow-gold/20"
            onClick={() => {
              const buyItems = outfit.items.filter((i) => i.platform.toLowerCase() !== "own wardrobe");
              if (buyItems.length === 0) return;
              handleRedirectToProduct(buyItems[0].platform, buyItems[0].name);
            }}
            disabled={!!redirectingItem}
          >
            {redirectingItem ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Tag className="w-3 h-3" />
            )}
            Shop This Look
          </Button>
        </div>
      </div>

      {/* Compare Prices Modal */}
      {compareItem && (
        <PriceCompareModal
          open={!!compareItem}
          onOpenChange={(open) => !open && setCompareItem(null)}
          productName={compareItem}
          addToWishlist={addToWishlist}
          addToCart={addToCart}
        />
      )}
    </>
  );
}
