import { useEffect, useRef, useState } from "react";
import { Brush, Eraser, Upload, X, Send, Tag, Palette, Trash2 } from "lucide-react";
import { whatsappLink } from "@/lib/constants";

type Silhouette = "jacket" | "hoodie" | "lederhosen";

const SILHOUETTES: { key: Silhouette; label: string }[] = [
  { key: "jacket", label: "Leather Jacket" },
  { key: "hoodie", label: "Boxy Hoodie" },
  { key: "lederhosen", label: "Lederhosen" },
];

const COLORS = [
  "#0a0a0a",
  "#8B4513",
  "#C7A56B",
  "#1E3A8A",
  "#9F1239",
  "#065F46",
  "#E11D48",
  "#F59E0B",
];

type Marker = { id: string; x: number; y: number; label: string };

function SilhouetteSVG({ kind }: { kind: Silhouette }) {
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
  // lederhosen
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

export default function MockupSketchPad() {
  const [silhouette, setSilhouette] = useState<Silhouette>("jacket");
  const [color, setColor] = useState(COLORS[2]);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<"brush" | "marker">("brush");
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [material, setMaterial] = useState("Premium full-grain cowhide");
  const [quantity, setQuantity] = useState(300);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to match its display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        // preserve drawing
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

  const sendQuotation = () => {
    const lines = [
      "Hello IRHA Apparels — Factory Quotation Request from the Studio Sketch Pad.",
      "",
      `• Silhouette: ${SILHOUETTES.find((s) => s.key === silhouette)?.label}`,
      `• Material: ${material}`,
      `• Quantity: ${quantity} pcs`,
      `• Active color accent: ${color}`,
      markers.length
        ? `• Placement notes (${markers.length}): ${markers.map((m) => m.label).join(" · ")}`
        : "• Placement notes: none",
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
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Canvas surface */}
      <div className="lg:col-span-2 border border-border/60 bg-card/40 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brush size={14} className="text-primary" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary">
              Mockup Sketch Pad
            </span>
          </div>
          <div className="inline-flex border border-border/60">
            {SILHOUETTES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSilhouette(s.key)}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 transition-colors ${
                  silhouette === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="relative aspect-[4/3] bg-background border border-border/60 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <SilhouetteSVG kind={silhouette} />
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

          <div className="flex items-center gap-1.5">
            <Palette size={12} className="text-muted-foreground" />
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`w-5 h-5 rounded-full border transition-all ${
                  color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-transparent" : "border-border/60"
                }`}
                style={{ background: c }}
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
      </div>

      {/* Right column: dropzone, basics, CTA */}
      <div className="flex flex-col gap-6">
        {/* Dropzone */}
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
            Drop your tech-pack or rough sketch here
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            to auto-analyze production specs
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
                <li key={i} className="text-[10px] font-mono text-foreground/80 flex items-center justify-between gap-2 bg-background border border-border/60 px-2 py-1">
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

        {/* Production basics that flow into the payload */}
        <div className="border border-border/60 bg-card/40 p-5 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-b border-border/60 pb-3">
            Production Basics
          </h3>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
              Material
            </label>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full bg-background border border-border/60 p-2.5 text-xs focus:border-primary outline-none"
            />
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
          Bundles silhouette, material, volume, color accents, placement markers and any
          dropped tech-pack files into a single WhatsApp brief sent to our Sialkot atelier.
        </p>
      </div>
    </div>
  );
}
