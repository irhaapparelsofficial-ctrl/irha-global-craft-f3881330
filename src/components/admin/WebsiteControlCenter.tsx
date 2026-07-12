import { useState } from "react";
import { Image, LayoutTemplate, Settings2 } from "lucide-react";
import WebsiteEditorPanel from "@/components/admin/WebsiteEditorPanel";
import GlobalSiteSettingsPanel from "@/components/admin/GlobalSiteSettingsPanel";
import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";

type Tab = "global" | "homepage" | "media";

const tabs: Array<{ key: Tab; label: string; icon: typeof Settings2 }> = [
  { key: "global", label: "Global Settings", icon: Settings2 },
  { key: "homepage", label: "Homepage", icon: LayoutTemplate },
  { key: "media", label: "Media Library", icon: Image },
];

export default function WebsiteControlCenter() {
  const [tab, setTab] = useState<Tab>("global");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-11 inline-flex items-center gap-2 border px-4 text-[10px] uppercase tracking-[0.18em] ${tab === item.key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground hover:text-foreground"}`}><Icon size={14} /> {item.label}</button>;
        })}
      </div>
      {tab === "global" && <GlobalSiteSettingsPanel />}
      {tab === "homepage" && <WebsiteEditorPanel />}
      {tab === "media" && <MediaLibraryPanel />}
    </div>
  );
}
