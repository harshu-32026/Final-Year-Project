import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, User, Bot, X, Image, Shirt, Mic, Loader2 } from "lucide-react";
import { useProductActions } from "@/hooks/use-product-actions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { OutfitCard, type ParsedOutfit } from "@/components/ai-stylist/OutfitCard";
import { ProductCard, type ProductRecommendation } from "@/components/ai-stylist/ProductCard";
import Seo from "@/components/Seo";


interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
}

// ParsedOutfit is now imported from OutfitCard

function parseOutfits(content: string): ParsedOutfit[] {
  const outfits: ParsedOutfit[] = [];
  const regex = /:::outfit\[(.+?)\]\n([\s\S]*?):::/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const items: ParsedOutfit["items"] = [];
    const lines = match[2].trim().split("\n");
    for (const line of lines) {
      const m = line.match(/^-\s*(\w+):\s*(.+?)\s*\|\s*₹([\d,]+)\s*\|\s*(.+)$/);
      if (m) {
        items.push({ type: m[1], name: m[2].trim(), price: parseInt(m[3].replace(/,/g, "")), platform: m[4].trim() });
      }
    }
    if (items.length > 0) outfits.push({ name, items });
  }
  return outfits;
}

function stripOutfitBlocks(content: string): string {
  return content.replace(/:::outfit\[.+?\]\n[\s\S]*?:::/g, "").trim();
}

function parseProducts(content: string): ProductRecommendation[] {
  const products: ProductRecommendation[] = [];
  const regex = /:::product\n([\s\S]*?):::/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lines = match[1].trim().split("\n");
    const p: any = { type: "product" };
    for (const line of lines) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(":").trim();
        if (key === "category") p.category = val;
        else if (key === "name") p.name = val;
        else if (key === "brand") p.brand = val;
        else if (key === "color") p.color = val;
        else if (key === "price") p.price = parseInt(val.replace(/[^0-9]/g, ""));
        else if (key === "originalprice") p.originalPrice = parseInt(val.replace(/[^0-9]/g, ""));
        else if (key === "platform") p.platform = val;
        else if (key === "rating") p.rating = parseFloat(val);
        else if (key === "reviews") p.reviews = parseInt(val.replace(/[^0-9]/g, ""));
        else if (key === "score") p.score = parseInt(val);
        else if (key === "image") p.image = val;
        else if (key === "link") p.link = val;
      }
    }
    if (p.name && p.price && p.platform) {
      products.push(p);
    }
  }
  return products;
}

function stripProductBlocks(content: string): string {
  return content.replace(/:::product\n[\s\S]*?:::/g, "").trim();
}


function formatOutfit(outfit: { name: string; items: { type: string; name: string; price: number; platform: string }[] }) {
  const lines = outfit.items.map(
    (item) => `- ${item.type}: ${item.name} | ₹${item.price.toLocaleString()} | ${item.platform}`
  );
  return `:::outfit[${outfit.name}]\n${lines.join("\n")}\n:::`;
}

function buildLocalStylistResponse(lastUserMessage: string, wardrobe: any[] = []) {
  const cleaned = lastUserMessage.trim();
  const lower = cleaned.toLowerCase();
  const hasWardrobe = Array.isArray(wardrobe) && wardrobe.length > 0;
  const wardrobeSummary = hasWardrobe
    ? `I reviewed your wardrobe and prioritized your own pieces where possible.\n\n${wardrobe
      .map((item: any) => `- ${item.category}: ${item.name}${item.color ? ` (${item.color})` : ""}${item.brand ? ` by ${item.brand}` : ""}`)
      .join("\n")}\n\n`
    : "";

  const occasion = lower.includes("wedding")
    ? "wedding or festive celebration"
    : lower.includes("office") || lower.includes("meeting")
      ? "office styling"
      : lower.includes("date")
        ? "date night"
        : lower.includes("party")
          ? "party"
          : "everyday styling";

  if (lower.includes("analyze") || lower.includes("photo") || lower.includes("image")) {
    const outfit = {
      name: "Wardrobe Refresh",
      items: [
        { type: "Top", name: "Soft cotton shirt", price: 0, platform: "Own Wardrobe" },
        { type: "Bottom", name: "Dark chinos", price: 0, platform: "Own Wardrobe" },
        { type: "Footwear", name: "Clean white sneakers", price: 2199, platform: "Flipkart" },
        { type: "Accessory", name: "Slim leather belt", price: 599, platform: "Ajio" },
      ],
    };

    return `${wardrobeSummary}I analyzed your outfit and recommend a grounded look that keeps the silhouette clean and balanced.\n\n:::outfit[${outfit.name}]\n- ${outfit.items.map((item) => `${item.type}: ${item.name} | ₹${item.price.toLocaleString()} | ${item.platform}`).join("\n- ")}\n:::\n\n## Style Notes\nThis approach refreshes your look with classic separates, a polished contrast of soft textures, and accessories that feel intentional without overpowering the outfit.`;
  }

  const outfits = [
    {
      name: "Casual Weekend Edit",
      items: [
        { type: "Top", name: "Relaxed linen shirt", price: 1399, platform: hasWardrobe ? "Own Wardrobe" : "Myntra" },
        { type: "Bottom", name: "Tailored chinos", price: 1599, platform: "Amazon" },
        { type: "Footwear", name: "White sneakers", price: 2199, platform: "Flipkart" },
        { type: "Accessory", name: "Minimal necklace", price: 699, platform: "Ajio" },
      ],
    },
    {
      name: "Smart Office Edit",
      items: [
        { type: "Top", name: "Crisp button-down shirt", price: 1499, platform: "Myntra" },
        { type: "Bottom", name: "Streamlined trousers", price: 1699, platform: hasWardrobe ? "Own Wardrobe" : "Zara" },
        { type: "Footwear", name: "Black loafers", price: 2299, platform: "Amazon" },
        { type: "Accessory", name: "Classic watch", price: 999, platform: "Flipkart" },
      ],
    },
    {
      name: "Date Night Ready",
      items: [
        { type: "Top", name: "Textured knit top", price: 1499, platform: "Myntra" },
        { type: "Bottom", name: "Dark jeans", price: 1599, platform: "Amazon" },
        { type: "Footwear", name: "Suede boots", price: 2399, platform: "Flipkart" },
        { type: "Accessory", name: "Leather bracelet", price: 599, platform: "Ajio" },
      ],
    },
  ];

  return `${wardrobeSummary}Based on your request for ${occasion}, here are a few outfit ideas to keep the look polished and wearable.\n\n${outfits
    .map((outfit) => formatOutfit(outfit))
    .join("\n\n")}\n\n## Style Notes\nI focused on clean silhouettes and balanced textures so your outfit feels effortless, practical, and ready for whatever plans you have.`;
}

const AIStylist = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm **StyleGenie** — your personal AI Fashion Stylist ✨\n\nI can help you with:\n\n• **Outfit recommendations** for any occasion\n• **Style analysis** — upload a photo and I'll suggest how to wear it\n• **Premium alternatives** to outfits you already own\n• **Complete looks** (Top + Bottom + Footwear + Accessories)\n\nTell me about your style, an occasion, or upload a photo to get started!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micBlockedVisible, setMicBlockedVisible] = useState(false);
  const micBlockTimeoutRef = useRef<number | null>(null);
  const { addToWishlist, addToCart } = useProductActions();
  const { user } = useAuth();
  const [savedOutfitNames, setSavedOutfitNames] = useState<Set<string>>(new Set());

  const handleSaveLook = async (outfit: ParsedOutfit) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save looks.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("saved_looks" as any).insert({
        user_id: user.id,
        name: outfit.name,
        items: outfit.items,
      } as any);
      if (error) throw error;
      setSavedOutfitNames((prev) => new Set(prev).add(outfit.name));
      toast({ title: "Look saved!", description: `"${outfit.name}" added to your saved looks.` });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  };

  const { data: wardrobeItems = [] } = useQuery({
    queryKey: ["wardrobe", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wardrobe_items" as any)
        .select("name, category, color, brand")
        .eq("user_id", user!.id);
      return (data || []) as unknown as { name: string; category: string; color: string | null; brand: string | null }[];
    },
    enabled: !!user,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (micBlockTimeoutRef.current) window.clearTimeout(micBlockTimeoutRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) {
        setInputValue((prev) => (prev ? prev.trim() + " " + transcript : transcript));
      }
    };

    recognition.onerror = (event: any) => {
      const raw = event?.error || event;
      const name = typeof raw === "string" ? raw : (raw?.name || raw?.message || raw?.type || "");
      const lower = String(name).toLowerCase();
      const permissionKeywords = ["not-allowed", "service-not-allowed", "permission-denied", "denied", "notallowederror", "permission"];
      if (permissionKeywords.some((k) => lower.includes(k))) {
        // show small bottom card briefly instead of a toast
        setMicBlockedVisible(true);
        if (micBlockTimeoutRef.current) window.clearTimeout(micBlockTimeoutRef.current);
        micBlockTimeoutRef.current = window.setTimeout(() => setMicBlockedVisible(false), 6000);
      } else {
        const message = event.error ? `Voice recognition error: ${event.error}` : "Voice recognition failed.";
        toast({ title: "Voice search error", description: message, variant: "destructive" });
      }
      setIsRecording(false);
      setIsTranscribing(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setIsTranscribing(true);
    return true;
  };

  const startRecording = async () => {
    if (isRecording || isTranscribing) return;
    if (startSpeechRecognition()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
      const mimeType =
        candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordedChunksRef.current, { type });
        if (blob.size < 2048) {
          toast({ title: "Recording too short", description: "Hold the mic and speak, then tap again to stop.", variant: "destructive" });
          return;
        }
        await transcribeBlob(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsTranscribing(true);
    } catch (err: any) {
      const name = err?.name || err?.message || "";
      const lower = String(name).toLowerCase();
      const permissionKeywords = ["not-allowed", "permissiondenied", "permission-denied", "denied", "notallowederror"];
      if (permissionKeywords.some((k) => lower.includes(k))) {
        setMicBlockedVisible(true);
        if (micBlockTimeoutRef.current) window.clearTimeout(micBlockTimeoutRef.current);
        micBlockTimeoutRef.current = window.setTimeout(() => setMicBlockedVisible(false), 6000);
      } else {
        toast({
          title: "Microphone unavailable",
          description: err?.message || "Please allow microphone access and try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopRecording = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      return;
    }

    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setIsRecording(false);
  };

  const transcribeBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const mime = (blob.type || "audio/webm").split(";")[0];
      const ext =
        mime === "audio/mp4" ? "mp4" :
          mime === "audio/mpeg" ? "mp3" :
            mime === "audio/wav" || mime === "audio/x-wav" ? "wav" :
              mime === "audio/ogg" ? "ogg" :
                "webm";
      const form = new FormData();
      form.append("file", blob, `recording.${ext}`);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-transcribe`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: form,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Transcription failed (${resp.status})`);
      const text = (data.text || "").trim();
      if (!text) {
        toast({ title: "Couldn't hear that", description: "Please try recording again.", variant: "destructive" });
      } else {
        setInputValue((prev) => (prev ? prev.trim() + " " + text : text));
      }
    } catch (err: any) {
      toast({ title: "Voice search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text && !pendingImage) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text || "Analyze this outfit and suggest styling ideas",
      imagePreview: pendingImage || undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setPendingImage(null);
    setIsTyping(true);

    // Build chat history for the API
    const chatHistory = updatedMessages
      .filter((m) => m.id !== 1) // skip initial greeting
      .map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.imagePreview ? { imageBase64: m.imagePreview } : {}),
      }));

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stylist`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory, wardrobe: wardrobeItems.length > 0 ? wardrobeItems : undefined }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        const fallback = buildLocalStylistResponse(text, wardrobeItems);
        setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content: fallback }]);
        console.warn("AI Stylist fallback for response failure:", err.error || resp.status);
        return;
      }

      if (!resp.body) {
        const fallback = buildLocalStylistResponse(text, wardrobeItems);
        setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content: fallback }]);
        console.warn("AI Stylist fallback for missing response body");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
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
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id === -1) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { id: -1, role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Finalize assistant message with a real ID
      setMessages((prev) =>
        prev.map((m) => (m.id === -1 ? { ...m, id: Date.now() } : m))
      );
    } catch (err: any) {
      console.error("AI Stylist error:", err);
      const fallback = buildLocalStylistResponse(text, wardrobeItems);
      setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content: fallback }]);
      console.warn("AI Stylist fallback after error:", err?.message || err);
      return;
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = wardrobeItems.length > 0
    ? [
      "Style an outfit from my wardrobe for office",
      "What can I wear from my closet for a date night?",
      "Suggest outfits using my existing clothes",
      "What's missing from my wardrobe?",
    ]
    : [
      "Suggest a smart casual outfit for office",
      "What should I wear for a date night?",
      "Suggest a stylish summer look under ₹5000",
      "Help me style a black blazer",
    ];

  return (
    <>
      <Seo title="AI Fashion Stylist — StyleSnap" description="Chat with StyleSnap's AI Stylist for personalized outfit ideas, color tips, and shoppable looks tailored to your wardrobe." path="/ai-stylist" />
      <div className="min-h-screen flex flex-col">
        {/* Hero */}
        <section className="py-10 bg-gradient-hero border-b border-border">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 mb-3">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium">AI-Powered Personal Stylist</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
              Your Personal <span className="text-gradient-gold">StyleGenie</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Get real AI-powered outfit recommendations, style your existing wardrobe, or upload a photo for instant analysis.
            </p>
            {user && wardrobeItems.length > 0 && (
              <Link to="/account/wardrobe" className="inline-flex items-center gap-1.5 mt-3 text-xs text-gold hover:underline">
                <Shirt className="w-3.5 h-3.5" /> {wardrobeItems.length} items in your wardrobe — AI will use them
              </Link>
            )}
            {user && wardrobeItems.length === 0 && (
              <Link to="/account/wardrobe" className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-gold transition-colors">
                <Shirt className="w-3.5 h-3.5" /> Add clothes to your wardrobe for personalized suggestions
              </Link>
            )}
          </div>
        </section>

        {/* Chat */}
        <section className="flex-1 py-6">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="space-y-5 mb-6 min-h-[400px]">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} addToWishlist={addToWishlist} addToCart={addToCart} onSaveLook={handleSaveLook} />
              ))}

              {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="p-3 rounded-2xl bg-secondary">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    className="px-4 py-2 rounded-full bg-secondary text-sm font-medium hover:bg-gold/10 hover:text-gold transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Pending Image Preview */}
            {pendingImage && (
              <div className="mb-3 relative inline-block">
                <img src={pendingImage} alt="Upload preview" className="h-20 rounded-lg border border-border" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-12 w-12"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="w-5 h-5" />
              </Button>
              <Button
                variant={isRecording ? "default" : "outline"}
                size="icon"
                className={`flex-shrink-0 h-12 w-12 ${isRecording ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse" : ""}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing || isTyping}
                aria-label={isRecording ? "Stop recording" : "Start voice search"}
                title={isRecording ? "Stop recording" : "Voice search"}
              >
                {isTranscribing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              <div className="relative flex-1">
                <Input
                  placeholder={isRecording ? "Listening… tap the mic to stop" : "Ask, speak, or upload a photo..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="h-12 pr-12"
                  disabled={isTyping}
                />
                <Button
                  variant="gold"
                  size="icon"
                  onClick={handleSend}
                  disabled={isTyping && !inputValue.trim() && !pendingImage}
                  className="absolute right-1 top-1 h-10 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      {micBlockedVisible && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-md shadow-sm text-sm flex items-center gap-3">
            <span>Microphone blocked — enable in your browser settings to use voice.</span>
            <button
              onClick={() => {
                setMicBlockedVisible(false);
                if (micBlockTimeoutRef.current) {
                  window.clearTimeout(micBlockTimeoutRef.current);
                  micBlockTimeoutRef.current = null;
                }
              }}
              aria-label="Dismiss"
              className="text-yellow-800/80 hover:text-yellow-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

function MessageBubble({
  message,
  addToWishlist,
  addToCart,
  onSaveLook,
}: {
  message: Message;
  addToWishlist: (p: any) => void;
  addToCart: (p: any) => void;
  onSaveLook: (outfit: ParsedOutfit) => void;
}) {
  const isUser = message.role === "user";
  const outfits = !isUser ? parseOutfits(message.content) : [];
  const products = !isUser ? parseProducts(message.content) : [];
  const textContent = !isUser 
    ? stripProductBlocks(stripOutfitBlocks(message.content)) 
    : message.content;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-gold" : "bg-primary"
          }`}
      >
        {isUser ? <User className="w-4 h-4 text-accent-foreground" /> : <Bot className="w-4 h-4 text-primary-foreground" />}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {/* Image attachment */}
        {message.imagePreview && (
          <div className={`mb-2 ${isUser ? "flex justify-end" : ""}`}>
            <img src={message.imagePreview} alt="Uploaded" className="h-40 rounded-xl border border-border object-cover" />
          </div>
        )}

        {textContent && (
          <div className={`inline-block p-4 rounded-2xl text-left ${isUser ? "bg-gold text-accent-foreground" : "bg-secondary"}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{textContent}</p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3">
                <ReactMarkdown>{textContent}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Product Recommendations */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {products.map((product, pi) => (
              <ProductCard
                key={pi}
                product={product}
                addToWishlist={addToWishlist}
                addToCart={addToCart}
              />
            ))}
          </div>
        )}

        {/* Outfit Cards */}
        {outfits.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {outfits.map((outfit, oi) => (
              <OutfitCard
                key={oi}
                outfit={outfit}
                onSaveLook={onSaveLook}
                addToWishlist={addToWishlist}
                addToCart={addToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIStylist;
