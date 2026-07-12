import { useMemo, useState } from "react";
import { CalendarDays, Download, ExternalLink, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  meetingEnd,
  meetingIcs,
  type CommercialBuyerRef,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/commercialHub";
import {
  commercialBuyerKey,
  type MeetingRow,
} from "@/hooks/useCommercialHub";
import {
  Badge,
  BuyerSelect,
  Empty,
  Input,
  NumberInput,
  TextArea,
  downloadText,
} from "@/components/admin/commercial/CommercialUi";

const db = supabase as any;

type MeetingDraft = {
  buyerKey: string;
  title: string;
  meetingType: MeetingType;
  startLocal: string;
  duration: number;
  timezone: string;
  locationUrl: string;
  agenda: string;
};

function freshMeeting(): MeetingDraft {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  return {
    buyerKey: "",
    title: "Buyer review call",
    meetingType: "sales_call",
    startLocal: local,
    duration: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
    locationUrl: "",
    agenda: "",
  };
}

export default function CommercialMeetingsPanel({
  buyers,
  meetings,
  setMeetings,
}: {
  buyers: CommercialBuyerRef[];
  meetings: MeetingRow[];
  setMeetings: React.Dispatch<React.SetStateAction<MeetingRow[]>>;
}) {
  const [draft, setDraft] = useState<MeetingDraft>(() => freshMeeting());
  const [busy, setBusy] = useState(false);

  const selectedBuyer = useMemo(
    () => buyers.find((buyer) => commercialBuyerKey(buyer.source, buyer.sourceId) === draft.buyerKey) || null,
    [buyers, draft.buyerKey],
  );

  const applyBuyer = (key: string) => {
    const buyer = buyers.find((row) => commercialBuyerKey(row.source, row.sourceId) === key);
    setDraft((current) => ({
      ...current,
      buyerKey: key,
      title: buyer
        ? `${buyer.company || buyer.name} — ${current.meetingType.replaceAll("_", " ")}`
        : current.title,
    }));
  };

  const save = async () => {
    const endAt = meetingEnd(draft.startLocal, draft.duration);
    if (!selectedBuyer || !draft.title.trim() || !draft.startLocal || !endAt) {
      toast({ title: "Meeting details are incomplete", variant: "destructive" });
      return;
    }
    if (draft.locationUrl && !/^https:\/\//i.test(draft.locationUrl)) {
      toast({ title: "Meeting URL must use HTTPS", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { data, error } = await db
      .from("crm_meetings")
      .insert({
        source_type: selectedBuyer.source,
        source_id: selectedBuyer.sourceId,
        title: draft.title.trim(),
        meeting_type: draft.meetingType,
        start_at: new Date(draft.startLocal).toISOString(),
        end_at: endAt,
        timezone: draft.timezone,
        location_url: draft.locationUrl.trim() || null,
        agenda: draft.agenda.trim() || null,
        status: "scheduled",
      })
      .select("*")
      .single();
    setBusy(false);

    if (error) {
      toast({
        title: "Meeting backend is not active yet",
        description: "The migration is ready for final activation.",
        variant: "destructive",
      });
      return;
    }

    setMeetings((current) =>
      [...current, data as MeetingRow].sort(
        (left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime(),
      ),
    );
    setDraft(freshMeeting());
    toast({ title: "Meeting saved", description: "No external calendar invitation was sent." });
  };

  const updateStatus = async (meeting: MeetingRow, status: MeetingStatus) => {
    const { data, error } = await db
      .from("crm_meetings")
      .update({ status })
      .eq("id", meeting.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Meeting update failed", description: error.message, variant: "destructive" });
      return;
    }
    setMeetings((current) =>
      current.map((row) => (row.id === meeting.id ? (data as MeetingRow) : row)),
    );
  };

  const downloadCalendar = (meeting: MeetingRow) => {
    const buyer = buyers.find(
      (row) => row.source === meeting.source_type && row.sourceId === meeting.source_id,
    );
    const content = meetingIcs({
      uid: `${meeting.id}@irhaapparels.com`,
      title: meeting.title,
      startAt: meeting.start_at,
      endAt: meeting.end_at,
      description: `${meeting.agenda || "Buyer meeting"}\nBuyer: ${buyer?.reference || ""}`,
      location: meeting.location_url || "Online / to be confirmed",
    });
    downloadText(`${meeting.meeting_reference}.ics`, content, "text/calendar;charset=utf-8");
  };

  return (
    <div className="grid xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)] gap-5">
      <section className="border border-border/60 bg-card/20 p-5 space-y-4">
        <div>
          <p className="eyebrow mb-2">Schedule</p>
          <h3 className="font-display text-2xl">New buyer meeting</h3>
          <p className="text-xs text-muted-foreground mt-2">
            Save the commercial meeting internally. Downloading the calendar file does not invite the buyer.
          </p>
        </div>
        <BuyerSelect value={draft.buyerKey} buyers={buyers} onChange={applyBuyer} />
        <Input
          label="Meeting title"
          value={draft.title}
          onChange={(value) => setDraft({ ...draft, title: value })}
        />
        <label className="space-y-2 block">
          <span className="text-xs text-muted-foreground">Meeting type</span>
          <select
            value={draft.meetingType}
            onChange={(event) =>
              setDraft({ ...draft, meetingType: event.target.value as MeetingType })
            }
            className="w-full min-h-11 bg-background border border-border/60 px-3 text-sm"
          >
            <option value="factory_video">Factory video</option>
            <option value="sales_call">Sales call</option>
            <option value="sample_review">Sample review</option>
            <option value="quotation_review">Quotation review</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Start"
            type="datetime-local"
            value={draft.startLocal}
            onChange={(value) => setDraft({ ...draft, startLocal: value })}
          />
          <NumberInput
            label="Duration minutes"
            value={draft.duration}
            onChange={(value) => setDraft({ ...draft, duration: Math.max(15, value) })}
          />
        </div>
        <Input
          label="Timezone"
          value={draft.timezone}
          onChange={(value) => setDraft({ ...draft, timezone: value })}
        />
        <Input
          label="HTTPS meeting URL"
          value={draft.locationUrl}
          onChange={(value) => setDraft({ ...draft, locationUrl: value })}
          placeholder="Leave blank until the approved meeting link exists"
        />
        <TextArea
          label="Agenda"
          value={draft.agenda}
          onChange={(value) => setDraft({ ...draft, agenda: value })}
          placeholder="Buyer requirement, sample, quotation or factory-view topics"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50"
        >
          <Save size={13} /> {busy ? "Saving…" : "Save meeting"}
        </button>
      </section>

      <section className="border border-border/60 bg-card/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">Meeting schedule</h3>
          <Badge label={`${meetings.length} records`} />
        </div>
        <div className="mt-5 space-y-3 max-h-[720px] overflow-y-auto">
          {meetings.length === 0 ? (
            <Empty icon={<CalendarDays size={28} />} text="No meetings saved yet." />
          ) : (
            meetings.map((meeting) => {
              const buyer = buyers.find(
                (row) => row.source === meeting.source_type && row.sourceId === meeting.source_id,
              );
              return (
                <article key={meeting.id} className="border border-border/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-gold">
                        {meeting.meeting_reference} · {meeting.meeting_type.replaceAll("_", " ")}
                      </p>
                      <p className="font-display text-xl mt-1">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {buyer?.reference || "Buyer"} · {new Date(meeting.start_at).toLocaleString()} →{" "}
                        {new Date(meeting.end_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <select
                      value={meeting.status}
                      onChange={(event) =>
                        void updateStatus(meeting, event.target.value as MeetingStatus)
                      }
                      className="min-h-10 bg-background border border-border/60 px-2 text-xs"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No show</option>
                    </select>
                  </div>
                  {meeting.agenda && (
                    <p className="text-sm text-foreground/65 mt-3 whitespace-pre-wrap">
                      {meeting.agenda}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {meeting.location_url && (
                      <a
                        href={meeting.location_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"
                      >
                        <ExternalLink size={13} /> Open link
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadCalendar(meeting)}
                      className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-xs hover:border-gold"
                    >
                      <Download size={13} /> Download .ics
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
