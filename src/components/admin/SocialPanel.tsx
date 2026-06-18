import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, Facebook, Instagram, ExternalLink, RefreshCw, Upload, X } from "lucide-react";

type Post = {
  id: string;
  caption: string;
  image_url: string | null;
  channels: string[];
  status: string;
  fb_post_url: string | null;
  ig_post_url: string | null;
  error: string | null;
  created_at: string;
};

export default function SocialPanel() {
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [toFB, setToFB] = useState(true);
  const [toIG, setToIG] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Image must be under 8 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("social-uploads").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
      });
      if (up.error) throw up.error;
      // 7-day signed URL — Meta fetches once at publish time.
      const signed = await supabase.storage
        .from("social-uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed.error) throw signed.error;
      setImageUrl(signed.data.signedUrl);
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const publish = async () => {
    if (!caption.trim()) {
      toast({ title: "Caption is required", variant: "destructive" });
      return;
    }
    const channels: string[] = [];
    if (toFB) channels.push("facebook");
    if (toIG) channels.push("instagram");
    if (channels.length === 0) {
      toast({ title: "Pick at least one channel", variant: "destructive" });
      return;
    }
    if (toIG && !imageUrl.trim()) {
      toast({ title: "Instagram requires an image URL", variant: "destructive" });
      return;
    }

    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: { caption, imageUrl: imageUrl || undefined, channels },
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast({ title: "Published", description: "Posted to selected channels." });
        setCaption("");
        setImageUrl("");
      } else {
        toast({
          title: "Partial / failed",
          description: ((data as any)?.errors ?? []).join(" · ") || "See log below.",
          variant: "destructive",
        });
      }
      void load();
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const input = "w-full bg-input border border-border focus:border-primary outline-none px-4 py-3 text-sm transition-colors";

  return (
    <div className="space-y-8">
      <div className="border border-border/60 bg-card/30 p-6 md:p-8">
        <p className="eyebrow mb-4">Compose post</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Caption</span>
              <textarea
                rows={6}
                className={`${input} mt-2`}
                placeholder="Premium leather jacket — handcrafted in Sialkot. DM for B2B pricing."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Image URL {toIG && <span className="text-destructive">*</span>}
              </span>
              <input
                className={`${input} mt-2`}
                placeholder="https://www.irhaapparels.com/products/jacket.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Must be a public https URL. Required for Instagram.
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Channels</p>
            <label className="flex items-center gap-3 border border-border p-3 cursor-pointer hover:border-primary/60 transition-colors">
              <input type="checkbox" checked={toFB} onChange={(e) => setToFB(e.target.checked)} />
              <Facebook size={16} className="text-[#1877F2]" />
              <span className="text-sm">Facebook Page</span>
            </label>
            <label className="flex items-center gap-3 border border-border p-3 cursor-pointer hover:border-primary/60 transition-colors">
              <input type="checkbox" checked={toIG} onChange={(e) => setToIG(e.target.checked)} />
              <Instagram size={16} className="text-[#E1306C]" />
              <span className="text-sm">Instagram</span>
            </label>

            <button
              onClick={publish}
              disabled={posting}
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold disabled:opacity-50 transition-all"
            >
              {posting ? "Publishing…" : <>Publish <Send size={14} /></>}
            </button>
            <p className="text-[10px] text-muted-foreground">
              Requires META_PAGE_ACCESS_TOKEN, META_FB_PAGE_ID and META_IG_BUSINESS_ACCOUNT_ID secrets.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border/60 bg-card/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow">Recent posts</p>
          <button onClick={load} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-2">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="border border-border/60 p-4 bg-background/40">
                <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] mb-2">
                  <span className={`px-2 py-0.5 border ${
                    p.status === "success" ? "border-emerald-500/60 text-emerald-400" :
                    p.status === "partial" ? "border-amber-500/60 text-amber-400" :
                    p.status === "failed" ? "border-destructive/60 text-destructive" :
                    "border-border text-muted-foreground"
                  }`}>{p.status}</span>
                  <span className="text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                  <span className="text-muted-foreground">{p.channels.join(" · ")}</span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-3">{p.caption}</p>
                {p.error && <p className="text-xs text-destructive mt-2">{p.error}</p>}
                <div className="flex gap-4 mt-2 text-xs">
                  {p.fb_post_url && (
                    <a href={p.fb_post_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                      Facebook <ExternalLink size={11} />
                    </a>
                  )}
                  {p.ig_post_url && (
                    <a href={p.ig_post_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                      Instagram <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
