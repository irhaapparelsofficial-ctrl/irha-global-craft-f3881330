import { Wrench } from "lucide-react";

export default function NotBuiltPanel({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border border-dashed border-border/60 bg-card/20 p-12 text-center">
      <Wrench className="mx-auto mb-3 text-muted-foreground/70" size={28} />
      <h3 className="font-display text-xl">{title} · Unavailable</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {note ?? "This admin module is not connected to a production workflow yet. No action can be completed from this screen."}
      </p>
    </div>
  );
}