/**
 * Reusable secure file upload for inquiry / sample / reference / tech-pack flows.
 * - Client-side MIME + extension + size + count validation
 * - Random filenames — never uses client-provided name
 * - Per-file progress + retry + remove-before-submit
 * - Private "inquiry-uploads" bucket (admin-only read via signed URL)
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Check, Loader2, RotateCw, Upload, X, File as FileIcon } from "lucide-react";
import type { UploadedFileRef } from "@/lib/inquiryDraft";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
// Executable / risky extensions we explicitly reject even if MIME slips through
const BLOCKED_EXT = new Set([
  "exe","bat","cmd","com","msi","sh","ps1","js","jsx","ts","tsx","py","rb","php","html","svg","dmg","apk","jar",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
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
  if (file.size > MAX_SIZE_BYTES) return `"${file.name}" is over 10 MB.`;
  const ext = extOf(file.name);
  if (BLOCKED_EXT.has(ext)) return `"${file.name}" file type is not allowed.`;
  if (!ALLOWED_EXT.has(ext)) return `"${file.name}" must be PDF, JPG, PNG or WEBP.`;
  if (file.type && !ALLOWED_MIME.has(file.type)) return `"${file.name}" has an unsupported format.`;
  return null;
}

export type SecureFileUploadProps = {
  value: UploadedFileRef[];
  onChange: (files: UploadedFileRef[]) => void;
  sessionId: string;
  disabled?: boolean;
};

export default function SecureFileUpload({ value, onChange, sessionId, disabled }: SecureFileUploadProps) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOne = useCallback(async (row: UploadRow) => {
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status: "uploading", progress: 15, error: undefined } : x)));
    try {
      const ext = extOf(row.file.name) || "bin";
      const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
      const path = `${sessionId}/${Date.now()}-${rid()}.${safeExt}`;
      const { error } = await supabase.storage
        .from("inquiry-uploads")
        .upload(path, row.file, { contentType: row.file.type, upsert: false });
      if (error) throw error;
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status: "done", progress: 100, path } : x)));
      // append to value (dedupe by path)
      const ref: UploadedFileRef = { path, name: row.file.name, size: row.file.size, mime: row.file.type };
      onChange([...value.filter((v) => v.path !== path), ref]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, status: "error", progress: 0, error: msg } : x)));
    }
  }, [onChange, sessionId, value]);

  const acceptFiles = useCallback((incoming: FileList | File[]) => {
    setGlobalError(null);
    const list = Array.from(incoming);
    const existingCount = value.length + rows.filter((r) => r.status !== "error").length;
    if (existingCount + list.length > MAX_FILES) {
      setGlobalError(`Maximum ${MAX_FILES} files.`);
      return;
    }
    // Dedupe by name+size against current session (prevents accidental double-add)
    const seen = new Set([
      ...value.map((v) => `${v.name}|${v.size}`),
      ...rows.map((r) => `${r.file.name}|${r.file.size}`),
    ]);
    const newRows: UploadRow[] = [];
    for (const f of list) {
      const key = `${f.name}|${f.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const err = validate(f);
      if (err) {
        setGlobalError(err);
        continue;
      }
      newRows.push({ id: rid(), file: f, status: "pending", progress: 0 });
    }
    if (newRows.length === 0) return;
    setRows((r) => [...r, ...newRows]);
    newRows.forEach(uploadOne);
  }, [rows, uploadOne, value]);

  const removeRow = useCallback(async (row: UploadRow) => {
    setRows((r) => r.filter((x) => x.id !== row.id));
    if (row.path) {
      onChange(value.filter((v) => v.path !== row.path));
      // Best-effort cleanup — private bucket, anon can INSERT but not DELETE, so ignore
      try { await supabase.storage.from("inquiry-uploads").remove([row.path]); } catch { /* admin-only, ok */ }
    }
  }, [onChange, value]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          if (e.dataTransfer.files) acceptFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/60"
        }`}
      >
        <Upload className="mx-auto mb-3 text-foreground/60" size={22} />
        <p className="text-sm text-foreground/80">
          Drag & drop or{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            choose files
          </button>
        </p>
        <p className="text-[11px] text-foreground/50 mt-2">
          PDF, JPG, PNG, WEBP · max 10 MB each · up to {MAX_FILES} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files && acceptFiles(e.target.files)}
        />
      </div>

      {globalError && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle size={14} className="mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 border border-border/60 px-3 py-2 text-sm">
              <FileIcon size={16} className="text-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{r.file.name}</p>
                <div className="mt-1 h-1 bg-border/60 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${r.status === "error" ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${r.progress}%` }}
                  />
                </div>
                {r.error && <p className="text-[11px] text-destructive mt-1">{r.error}</p>}
              </div>
              {r.status === "uploading" && <Loader2 className="animate-spin text-foreground/60" size={16} />}
              {r.status === "done" && <Check className="text-primary" size={16} />}
              {r.status === "error" && (
                <button
                  type="button"
                  onClick={() => uploadOne(r)}
                  aria-label="Retry"
                  className="text-foreground/60 hover:text-primary"
                >
                  <RotateCw size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeRow(r)}
                aria-label={`Remove ${r.file.name}`}
                className="text-foreground/60 hover:text-destructive"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
