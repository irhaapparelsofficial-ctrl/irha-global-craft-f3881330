import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, RotateCw, Upload, X, File as FileIcon } from "lucide-react";
import type { UploadedFileRef } from "@/lib/inquiryDraft";
import { uploadPublicLeadFile } from "@/lib/publicLeadGateway";

const ALLOWED_EXT = new Set(["pdf", "ai", "eps", "zip", "png", "jpg", "jpeg"]);
const ALLOWED_MIME_BY_EXT: Record<string, Set<string>> = {
  pdf: new Set(["", "application/pdf"]),
  ai: new Set(["", "application/octet-stream", "application/pdf", "application/postscript", "application/illustrator", "application/vnd.adobe.illustrator"]),
  eps: new Set(["", "application/octet-stream", "application/postscript", "application/eps", "application/x-eps"]),
  zip: new Set(["", "application/octet-stream", "application/zip", "application/x-zip-compressed", "multipart/x-zip"]),
  png: new Set(["", "image/png"]),
  jpg: new Set(["", "image/jpeg"]),
  jpeg: new Set(["", "image/jpeg"]),
};
const BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "com", "msi", "sh", "ps1", "js", "jsx", "ts", "tsx", "py", "rb", "php", "html", "svg", "dmg", "apk", "jar",
]);

const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 5;

type UploadRow = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  path?: string;
  error?: string;
};

function rid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function extOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function validate(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return `"${file.name}" is over 25 MB.`;
  if (file.size < 1) return `"${file.name}" is empty.`;
  const ext = extOf(file.name);
  if (BLOCKED_EXT.has(ext)) return `"${file.name}" file type is not allowed.`;
  if (!ALLOWED_EXT.has(ext)) return `"${file.name}" must be PDF, AI, EPS, ZIP, PNG or JPG.`;
  if (file.type && !ALLOWED_MIME_BY_EXT[ext]?.has(file.type.toLowerCase())) return `"${file.name}" has an unsupported format.`;
  return null;
}

export type SecureFileUploadProps = {
  value: UploadedFileRef[];
  onChange: (files: UploadedFileRef[]) => void;
  sessionId: string;
  disabled?: boolean;
  purpose?: "tech-pack" | "mockup";
};

export default function SecureFileUpload({ value, onChange, sessionId, disabled, purpose = "tech-pack" }: SecureFileUploadProps) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<UploadedFileRef[]>(value);
  const startedAtRef = useRef(Date.now());

  useEffect(() => { valueRef.current = value; }, [value]);

  const publishValue = useCallback((next: UploadedFileRef[]) => {
    valueRef.current = next;
    onChange(next);
  }, [onChange]);

  const uploadOne = useCallback(async (row: UploadRow) => {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "uploading", progress: 15, error: undefined } : item));
    try {
      const ref = await uploadPublicLeadFile(row.file, purpose, startedAtRef.current);
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "done", progress: 100, path: ref.path } : item));
      publishValue([...valueRef.current.filter((item) => item.path !== ref.path), ref]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "error", progress: 0, error: message } : item));
    }
  }, [publishValue, purpose]);

  const acceptFiles = useCallback((incoming: FileList | File[]) => {
    setGlobalError(null);
    const list = Array.from(incoming);
    const inFlightCount = rows.filter((row) => row.status === "pending" || row.status === "uploading").length;
    const existingCount = valueRef.current.length + inFlightCount;
    if (existingCount + list.length > MAX_FILES) {
      setGlobalError(`Maximum ${MAX_FILES} files.`);
      return;
    }

    const seen = new Set([
      ...valueRef.current.map((item) => `${item.name}|${item.size}`),
      ...rows.filter((row) => row.status !== "error").map((row) => `${row.file.name}|${row.file.size}`),
    ]);
    const newRows: UploadRow[] = [];
    for (const file of list) {
      const key = `${file.name}|${file.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const error = validate(file);
      if (error) {
        setGlobalError(error);
        continue;
      }
      newRows.push({ id: rid(), file, status: "pending", progress: 0 });
    }
    if (newRows.length === 0) return;
    setRows((current) => [...current, ...newRows]);
    for (const row of newRows) void uploadOne(row);
  }, [rows, uploadOne]);

  const removeRow = useCallback((row: UploadRow) => {
    setRows((current) => current.filter((item) => item.id !== row.id));
    if (row.path) publishValue(valueRef.current.filter((item) => item.path !== row.path));
  }, [publishValue]);

  return (
    <div className="space-y-3" data-upload-session={sessionId}>
      <div
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (disabled) return;
          if (event.dataTransfer.files) acceptFiles(event.dataTransfer.files);
        }}
        className={`border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border/60"}`}
      >
        <Upload className="mx-auto mb-3 text-foreground/60" size={22} />
        <p className="text-sm text-foreground/80">Drag & drop your tech pack or{" "}<button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="text-primary underline underline-offset-2 hover:opacity-80">choose files</button></p>
        <p className="text-[11px] text-foreground/50 mt-2">PDF, AI, EPS, ZIP, PNG, JPG · max 25 MB each · up to {MAX_FILES} files</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,.ai,.eps,.zip,.png,.jpg,.jpeg,application/pdf,application/postscript,application/zip,image/png,image/jpeg" className="hidden" onChange={(event) => { if (event.target.files) acceptFiles(event.target.files); event.target.value = ""; }} />
      </div>

      {globalError && <div className="flex items-start gap-2 text-xs text-destructive"><AlertTriangle size={14} className="mt-0.5" /><span>{globalError}</span></div>}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 border border-border/60 px-3 py-2 text-sm">
              <FileIcon size={16} className="text-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{row.file.name}</p>
                <div className="mt-1 h-1 bg-border/60 rounded overflow-hidden"><div className={`h-full transition-all ${row.status === "error" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${row.progress}%` }} /></div>
                {row.error && <p className="text-[11px] text-destructive mt-1">{row.error}</p>}
              </div>
              {row.status === "uploading" && <Loader2 className="animate-spin text-foreground/60" size={16} />}
              {row.status === "done" && <Check className="text-primary" size={16} />}
              {row.status === "error" && <button type="button" onClick={() => void uploadOne(row)} aria-label="Retry" className="text-foreground/60 hover:text-primary"><RotateCw size={16} /></button>}
              <button type="button" onClick={() => removeRow(row)} aria-label={`Remove ${row.file.name}`} className="text-foreground/60 hover:text-destructive"><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
