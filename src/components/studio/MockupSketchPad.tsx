import { useEffect, useRef, useState } from "react";
import {
  Brush,
  Upload,
  X,
  Send,
  Tag,
  Palette,
  Trash2,
  Mic,
  MicOff,
  Sparkles,
  Wand2,
} from "lucide-react";
import { whatsappLink } from "@/lib/constants";

type SilhouetteKey = "jacket" | "hoodie" | "lederhosen" | "sportskit";

type CatalogItem = {
  sku: string;
  name: string;
  silhouette: SilhouetteKey;
  blurb: string;
};

const CATALOG: CatalogItem[] = [
  {
    sku: "IRHA-BAV-01",
    name: "Premium Cowhide Lederhosen",
    silhouette: "lederhosen",
    blurb: "Heritage Bavarian · hand-tooled cowhide",
  },
  {
    sku: "IRHA-LTH-09",
    name: "Custom Leather Motorcycle Jacket",
    silhouette: "jacket",
    blurb: "Full-grain cowhide · YKK hardware",
  },
  {
    sku: "IRHA-STW-04",
    name: "Heavyweight Boxy Hoodie",
    silhouette: "hoodie",
    blurb: "400 GSM · brushed loopback",
  },
  {
    sku: "IRHA-SPT-12",
    name: "Dry-Fit Pro Training Kit",
    silhouette: "sportskit",
    blurb: "Sublimation-ready · 4-way stretch",
  },
];

const COLORS = [
  { hex: "#0a0a0a", name: "black" },
  { hex: "#8B4513", name: "brown" },
  { hex: "#C7A56B", name: "tan" },
  { hex: "#1E3A8A", name: "navy" },
  { hex: "#9F1239", name: "burgundy" },
  { hex: "#065F46", name: "green" },
  { hex: "#E11D48", name: "red" },
  { hex: "#F59E0B", name: "gold" },
  { hex: "#C0C0C0", name: "silver" },
  { hex: "#FFFFFF", name: "white" },
];

type Marker = { id: string; x: number; y: number; label: string };
type Adjustment = { id: string; text: string; source: "voice" | "text" };

function SilhouetteSVG({ kind }: { kind: SilhouetteKey }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  if (kind === "jacket") {
    return (
      <svg viewBox="0 0 400 500" className="w-full h-full text-foreground/40">
        <path {...common} d="M140 70 L100 100 L60 160 L80 280 L110 270 L110 440 L290 440 L290 270 L320 280 L340 160 L300 100 L260 70 L230 90 L200 110 L170 90 Z" />
        <path {...common} d="M200 110 L200 440" />
        <path {...common} d="M170 90 L200 200 L230 90" />
        <circle {...common} cx="200" cy="250" r="4" />
        <circle {...common} cx="200" cy="310" r="4" />
        <circle {...common} cx="200" cy="370" r="4" />
      </svg>
    );
  }
  if (kind === "hoodie") {
    return (
      <svg viewBox="0 0 400 500" className="w-full h-full text-foreground/40">
        <path {...common} d="M140 80 Q200 30 260 80 L320 110 L350 200 L310 230 L310 450 L90 450 L90 230 L50 200 L80 110 Z" />
        <path {...common} d="M160 90 Q200 130 240 90" />
        <rect {...common} x="160" y="290" width="80" height="50" rx="6" />
        <path {...common} d="M155 200 L155 320" />
        <path {...common} d="M245 200 L245 320" />
      </svg>
    );
  }
  if (kind === "lederhosen") {
    return (
      <svg viewBox="0 0 400 500" className="w-full h-full text-foreground/40">
        <path {...common} d="M120 90 L140 60 L260 60 L280 90 L290 280 L260 380 L220 380 L210 250 L200 380 L190 380 L180 250 L170 380 L140 380 L110 280 Z" />
        <path {...common} d="M150 130 L250 130 Q260 200 200 220 Q140 200 150 130 Z" />
        <path {...common} d="M180 175 Q200 195 220 175" />
        <circle {...common} cx="170" cy="100" r="5" />
        <circle {...common} cx="230" cy="100" r="5" />
      </svg>
    );
  }
  // sportskit: short-sleeve jersey + shorts
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full text-foreground/40">
      {/* Jersey */}
      <path {...common} d="M150 60 L120 80 L70 130 L100 170 L130 150 L130 280 L270 280 L270 150 L300 170 L330 130 L280 80 L250 60 Q200 95 150 60 Z" />
      <path {...common} d="M170 70 Q200 100 230 70" />
      {/* Shorts */}
      <path {...common} d="M130 290 L270 290 L280 420 L215 420 L205 320 L195 320 L185 420 L120 420 Z" />
      <path {...common} d="M200 320 L200 420" />
    </svg>
  );
}

// Minimal SpeechRecognition typing
type SpeechRecCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function MockupSketchPad() {
  const [product, setProduct] = useState<CatalogItem>(CATALOG[1]);
  const [color, setColor] = useState(COLORS[2].hex);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<"brush" | "marker">("brush");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [quantity, setQuantity] = useState(300);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // AI suite
  const [prompt, setPrompt] = useState("");
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("Awaiting design directive");
  const recognitionRef = useRef<ReturnType<SpeechRecCtor> | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        const tmp = document.createElement("canvas");
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        tmp.getContext("2d")?.drawImage(canvas, 0, 0);
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(tmp, 0, 0, width, height);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Reset canvas when product changes silhouette
  useEffect(() => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setMarkers([]);
  }, [product.sku]);

  const clearCanvas = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setMarkers([]);
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (tool === "marker") {
      const label = window.prompt("Marker label (e.g. 'Front embroidery 8cm')") ?? "";
      if (!label.trim()) return;
      const r = e.currentTarget.getBoundingClientRect();
      setMarkers((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          x: (pos.x / r.width) * 100,
          y: (pos.y / r.height) * 100,
          label: label.trim(),
        },
      ]);
      return;
    }
    drawing.current = true;
    last.current = pos;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || tool !== "brush") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last.current = pos;
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).slice(0, 5);
    setFiles((f) => [...f, ...dropped].slice(0, 5));
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).slice(0, 5);
    setFiles((f) => [...f, ...picked].slice(0, 5));
  };

  // ============ AI dictation engine ============
  const processPrompt = (raw: string, source: "voice" | "text") => {
    const text = raw.trim();
    if (!text) return;
    setIsProcessing(true);
    setAiStatus("Parsing directive…");

    // Detect color keywords and shift active accent
    const lower = text.toLowerCase();
    const matched = COLORS.find((c) => lower.includes(c.name));
    setTimeout(() => {
      if (matched) {
        setColor(matched.hex);
        setAiStatus(`Accent shifted to ${matched.name.toUpperCase()} — applying to ${product.name}`);
      } else {
        setAiStatus(`Adjustment logged for ${product.sku}`);
      }
      setAdjustments((arr) => [
        ...arr,
        { id: crypto.randomUUID(), text, source },
      ]);
      setIsProcessing(false);
      setTimeout(() => setAiStatus("Awaiting design directive"), 2200);
    }, 900);
  };

  const submitPrompt = () => {
    if (!prompt.trim()) return;
    processPrompt(prompt, "text");
    setPrompt("");
  };

  const toggleListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      window.alert(
        "Voice recognition isn't supported in this browser. Use Chrome/Edge, or type your directive instead.",
      );
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) processPrompt(transcript, "voice");
    };
    rec.onerror = () => {
      setIsListening(false);
      setAiStatus("Voice capture failed — try again or type the directive");
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    setAiStatus("Listening…");
    rec.start();
  };

  // ============ Quote payload ============
  const sendQuotation = () => {
    const lines = [
      "Hello IRHA Apparels — Factory Quotation Request from the Hybrid AI Design Suite.",
      "",
      `• Base product: ${product.name} (${product.sku})`,
      `• Quantity: ${quantity} pcs`,
      `• Active color accent: ${color}`,
      adjustments.length
        ? `• AI / dictation adjustments (${adjustments.length}):\n   - ${adjustments
            .map((a) => `[${a.source}] ${a.text}`)
            .join("\n   - ")}`
        : "• AI adjustments: none",
      markers.length
        ? `• Placement markers (${markers.length}): ${markers.map((m) => m.label).join(" · ")}`
        : "• Placement markers: none",
      files.length
        ? `• Files attached on form: ${files.map((f) => f.name).join(", ")}`
        : "• Tech-pack: will send via this WhatsApp thread",
      "",
      notes ? `Additional notes:\n${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(whatsappLink(lines), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Universal Product Catalog Selector */}
      <div className="border border-border/60 bg-card/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary">
              Base Product Model Matrix
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            Active: {product.sku}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CATALOG.map((item) => {
            const active = item.sku === product.sku;
            return (
              <button
                key={item.sku}
                type="button"
                onClick={() => setProduct(item)}
                className={`text-left p-3 border transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/60 bg-background hover:border-primary/50"
                }`}
              >
                <div className="aspect-square bg-background border border-border/40 p-2 mb-2">
                  <SilhouetteSVG kind={item.silhouette} />
                </div>
                <div className="text-[10px] font-mono text-primary">{item.sku}</div>
                <div className="text-xs font-semibold text-foreground leading-tight mt-0.5">
                  {item.name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{item.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas surface */}
        <div className="lg:col-span-2 border border-border/60 bg-card/40 p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brush size={14} className="text-primary" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary">
                Live Mockup Workspace
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {product.name}
            </span>
          </div>

          {/* Stage */}
          <div className="relative aspect-[4/3] bg-background border border-border/60 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
              <SilhouetteSVG kind={product.silhouette} />
            </div>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: tool === "brush" ? "crosshair" : "copy" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {markers.map((m) => (
              <div
                key={m.id}
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-auto"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <div className="px-2 py-1 text-[10px] font-mono bg-primary text-primary-foreground whitespace-nowrap max-w-[180px] truncate flex items-center gap-1">
                  <Tag size={9} />
                  {m.label}
                  <button
                    type="button"
                    onClick={() => setMarkers((ms) => ms.filter((x) => x.id !== m.id))}
                    className="ml-1 hover:opacity-70"
                    aria-label="Remove marker"
                  >
                    <X size={9} />
                  </button>
                </div>
                <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
              </div>
            ))}

            {isProcessing && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary">
                  AI updating mockup blueprint
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={clearCanvas}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] bg-background/90 border border-border/60 px-2.5 py-1.5 hover:bg-card"
            >
              <Trash2 size={11} /> Clear
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex border border-border/60">
              <button
                type="button"
                onClick={() => setTool("brush")}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 inline-flex items-center gap-1.5 ${
                  tool === "brush" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Brush size={11} /> Brush
              </button>
              <button
                type="button"
                onClick={() => setTool("marker")}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 inline-flex items-center gap-1.5 ${
                  tool === "marker" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tag size={11} /> Marker
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Palette size={12} className="text-muted-foreground" />
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={`Color ${c.name}`}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    color === c.hex
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent"
                      : "border-border/60"
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Brush
              <input
                type="range"
                min={1}
                max={20}
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="accent-primary w-24"
              />
            </label>
          </div>

          {/* AI prompt / voice */}
          <div className="border border-border/60 bg-background/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 size={13} className="text-primary" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-primary">
                  AI Voice & Text Directive
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{aiStatus}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isProcessing}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold border transition-colors ${
                  isListening
                    ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
                    : "bg-primary text-primary-foreground border-primary hover:opacity-90"
                }`}
                title="Click to dictate design"
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                {isListening ? "Listening…" : "Dictate Design"}
              </button>
              <div className="flex-1 flex gap-2">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitPrompt()}
                  placeholder="e.g. Change zippers to gold, add red inner lining"
                  className="flex-1 bg-background border border-border/60 px-3 py-2.5 text-xs focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={submitPrompt}
                  disabled={!prompt.trim() || isProcessing}
                  className="px-3 py-2.5 text-[10px] uppercase tracking-[0.25em] font-bold bg-foreground text-background hover:opacity-90 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Click the mic and speak: <em>"Make a black leather jacket with silver zippers and red lining"</em>.
              Each directive logs into the production payload and color keywords auto-shift the active accent.
            </p>

            {adjustments.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  AI Adjustments queue
                </div>
                <ul className="space-y-1.5">
                  {adjustments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2 bg-background border border-border/60 px-2.5 py-1.5"
                    >
                      <span className="flex items-start gap-2 text-xs text-foreground/90">
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-primary mt-0.5">
                          {a.source}
                        </span>
                        {a.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdjustments((arr) => arr.filter((x) => x.id !== a.id))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right column: dropzone, basics, CTA */}
        <div className="flex flex-col gap-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed p-5 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border/70 bg-card/40"
            }`}
          >
            <Upload size={20} className="mx-auto text-primary mb-2" />
            <p className="text-xs font-semibold text-foreground">
              Drop tech-pack, sketch or embroidery emblem
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              auto-analyze production specs
            </p>
            <label className="inline-block mt-3 text-[10px] uppercase tracking-[0.25em] text-primary cursor-pointer hover:underline">
              or browse files
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.ai,.psd,.svg,.zip"
                onChange={onFilePick}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1 text-left">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="text-[10px] font-mono text-foreground/80 flex items-center justify-between gap-2 bg-background border border-border/60 px-2 py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((arr) => arr.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={10} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-border/60 bg-card/40 p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-b border-border/60 pb-3">
              Production Basics
            </h3>
            <div className="text-xs text-foreground/80 space-y-1">
              <div>
                <span className="text-muted-foreground">Base:</span> {product.name}
              </div>
              <div className="font-mono text-[11px] text-primary">{product.sku}</div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                Order Volume
              </label>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>50</span>
                <span className="text-primary font-bold text-xs">{quantity} pcs</span>
                <span>5,000+</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Branding, sizing curve, label position…"
                className="w-full bg-background border border-border/60 p-2.5 text-xs focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={sendQuotation}
            className="w-full bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.3em] font-bold py-4 hover:opacity-90 inline-flex items-center justify-center gap-2"
          >
            <Send size={12} /> Request Factory Quotation
          </button>
          <p className="text-[10px] text-muted-foreground -mt-3 leading-relaxed">
            Bundles base product SKU, AI dictation adjustments, manual color accents, placement
            markers and any uploaded tech-pack into one WhatsApp brief sent to Sialkot.
          </p>
        </div>
      </div>
    </div>
  );
}
