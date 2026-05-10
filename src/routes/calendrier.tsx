import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Users,
  User as UserIcon,
  X,
  ExternalLink,
  Sparkles,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/calendrier")({
  head: () => ({
    meta: [
      { title: "Calendrier des événements EEDS — Incub'Youth" },
      {
        name: "description",
        content:
          "Tous les camps, formations et événements des Éclaireuses et Éclaireurs du Sénégal.",
      },
    ],
  }),
  component: CalendrierPage,
});

const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

type EventType = "camp" | "formation" | "national" | "local" | "urgent";

type Evt = {
  id: string;
  titre: string;
  description: string | null;
  type: EventType;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  region: string;
  responsable: string | null;
  nb_places: number;
  nb_inscrits: number;
  lien_externe: string | null;
  rappel_email: boolean;
  visible: boolean;
  created_by: string | null;
  created_at: string;
};

const TYPE_STYLES: Record<EventType, { bg: string; fg: string; dot: string; label: string }> = {
  camp: { bg: "#EAF3DE", fg: "#27500A", dot: "#5B8A2A", label: "Camp" },
  formation: { bg: "#EEEDFE", fg: "#3C3489", dot: "#622599", label: "Formation" },
  national: { bg: "#FAEEDA", fg: "#633806", dot: "#B57A14", label: "National" },
  local: { bg: "#E1F5EE", fg: "#085041", dot: "#0F8068", label: "Local" },
  urgent: { bg: "#FCEBEB", fg: "#791F1F", dot: "#C62828", label: "Urgent" },
};

const REGIONS = [
  "National", "Dakar", "Thiès", "Saint-Louis", "Diourbel", "Louga",
  "Fatick", "Kaolack", "Kaffrine", "Tambacounda", "Kédougou",
  "Kolda", "Sédhiou", "Ziguinchor", "Matam",
];

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateFR(s: string) {
  return parseDate(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function formatGCDate(s: string) {
  return s.replace(/-/g, "");
}
function buildGCalUrl(evt: Evt) {
  const end = parseDate(evt.date_fin);
  end.setDate(end.getDate() + 1); // GCal exclusive end
  const endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, "0")}${String(end.getDate()).padStart(2, "0")}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evt.titre,
    dates: `${formatGCDate(evt.date_debut)}/${endStr}`,
    details: evt.description ?? "",
    location: evt.lieu ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function CalendrierPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [evenements, setEvenements] = useState<Evt[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<"calendar" | "list" | "agenda">("calendar");
  const [activeFilter, setActiveFilter] = useState<"all" | EventType>("all");
  const [selectedEvent, setSelectedEvent] = useState<Evt | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editEvent, setEditEvent] = useState<Evt | null>(null);
  const [inscriptions, setInscriptions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const evtsP = db.from("evenements").select("*").eq("visible", true).order("date_debut");
      const inscrP = user
        ? db.from("evenements_inscriptions").select("evenement_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { evenement_id: string }[] });
      const [{ data: evts }, { data: inscrits }] = await Promise.all([evtsP, inscrP]);
      if (cancelled) return;
      setEvenements((evts as Evt[]) ?? []);
      setInscriptions(new Set(((inscrits as { evenement_id: string }[]) ?? []).map((i) => i.evenement_id)));
      setIsLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(
    () => (activeFilter === "all" ? evenements : evenements.filter((e) => e.type === activeFilter)),
    [evenements, activeFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: evenements.length };
    (Object.keys(TYPE_STYLES) as EventType[]).forEach((k) => {
      c[k] = evenements.filter((e) => e.type === k).length;
    });
    return c;
  }, [evenements]);

  const handleInscription = async (evt: Evt) => {
    if (!user) {
      toast.info("Connecte-toi pour t'inscrire");
      navigate({ to: "/login" });
      return;
    }
    const isInscrit = inscriptions.has(evt.id);
    if (isInscrit) {
      const { error } = await db.from("evenements_inscriptions").delete()
        .eq("evenement_id", evt.id).eq("user_id", user.id);
      if (error) { toast.error(error.message); return; }
      await db.from("evenements").update({ nb_inscrits: Math.max(0, evt.nb_inscrits - 1) }).eq("id", evt.id);
      setInscriptions((p) => { const s = new Set(p); s.delete(evt.id); return s; });
      setEvenements((p) => p.map((e) => e.id === evt.id ? { ...e, nb_inscrits: Math.max(0, e.nb_inscrits - 1) } : e));
      setSelectedEvent((p) => p && p.id === evt.id ? { ...p, nb_inscrits: Math.max(0, p.nb_inscrits - 1) } : p);
      toast.success("Inscription annulée");
    } else {
      const statut = evt.nb_places > 0 && evt.nb_inscrits >= evt.nb_places ? "liste_attente" : "inscrit";
      const { error } = await db.from("evenements_inscriptions").insert({
        evenement_id: evt.id, user_id: user.id, statut,
      } as never);
      if (error) { toast.error(error.message); return; }
      await db.from("evenements").update({ nb_inscrits: evt.nb_inscrits + 1 }).eq("id", evt.id);
      setInscriptions((p) => new Set([...p, evt.id]));
      setEvenements((p) => p.map((e) => e.id === evt.id ? { ...e, nb_inscrits: e.nb_inscrits + 1 } : e));
      setSelectedEvent((p) => p && p.id === evt.id ? { ...p, nb_inscrits: p.nb_inscrits + 1 } : p);
      toast.success(statut === "liste_attente" ? "Ajouté en liste d'attente" : "Inscription confirmée !");
    }
  };

  const handleDelete = async (evt: Evt) => {
    if (!confirm(`Supprimer l'événement "${evt.titre}" ? Cette action est irréversible.`)) return;
    const { error } = await db.from("evenements").delete().eq("id", evt.id);
    if (error) { toast.error(error.message); return; }
    setEvenements((p) => p.filter((e) => e.id !== evt.id));
    setSelectedEvent(null);
    toast.success("Événement supprimé");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="bg-[#FAF5FF] border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#622599] text-white">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Calendrier EEDS</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tous les camps, formations et événements des scouts sénégalais
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label="Mois précédent"
            ><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-base font-bold min-w-[150px] text-center">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label="Mois suivant"
            ><ChevronRight className="h-4 w-4" /></button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-2 h-9 px-3 text-sm rounded-md border border-border hover:bg-muted"
            >Aujourd'hui</button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border border-border p-0.5 bg-background">
              {([
                ["calendar", "Calendrier"],
                ["list", "Liste"],
                ["agenda", "À venir"],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setActiveView(k)}
                  className={`px-3 h-8 text-sm rounded ${activeView === k ? "bg-[#622599] text-white" : "text-muted-foreground hover:text-foreground"}`}
                >{l}</button>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#622599] text-white text-sm font-medium hover:bg-[#522085]"
              ><Plus className="h-4 w-4" /> Ajouter un événement</button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterPill label={`Tous (${counts.all ?? 0})`} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} dot="#94A3B8" />
          {(Object.keys(TYPE_STYLES) as EventType[]).map((t) => (
            <FilterPill
              key={t}
              label={`${TYPE_STYLES[t].label} (${counts[t] ?? 0})`}
              active={activeFilter === t}
              onClick={() => setActiveFilter(t)}
              dot={TYPE_STYLES[t].dot}
            />
          ))}
        </div>

        {/* Views */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" />
          </div>
        ) : activeView === "calendar" ? (
          <CalendarView
            currentDate={currentDate}
            events={filtered}
            onSelect={setSelectedEvent}
          />
        ) : activeView === "list" ? (
          <ListView currentDate={currentDate} events={filtered} onSelect={setSelectedEvent} />
        ) : (
          <AgendaView events={filtered} onSelect={setSelectedEvent} />
        )}
      </div>

      {selectedEvent && (
        <EventDetailModal
          evt={selectedEvent}
          isInscrit={inscriptions.has(selectedEvent.id)}
          isAdmin={isAdmin}
          onClose={() => setSelectedEvent(null)}
          onInscription={() => handleInscription(selectedEvent)}
          onAskAi={() => navigate({ to: "/chat" })}
          onEdit={() => { setEditEvent(selectedEvent); setSelectedEvent(null); }}
          onDelete={() => handleDelete(selectedEvent)}
        />
      )}

      {showNewModal && isAdmin && user && (
        <EventFormModal
          userId={user.id}
          onClose={() => setShowNewModal(false)}
          onSaved={(evt, isNew) => {
            setEvenements((p) => {
              const next = isNew ? [...p, evt] : p.map((e) => e.id === evt.id ? evt : e);
              return next.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
            });
            setShowNewModal(false);
            toast.success("Événement créé et visible par tous les scouts !");
          }}
        />
      )}

      {editEvent && isAdmin && user && (
        <EventFormModal
          userId={user.id}
          existing={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={(evt) => {
            setEvenements((p) => p.map((e) => e.id === evt.id ? evt : e).sort((a, b) => a.date_debut.localeCompare(b.date_debut)));
            setEditEvent(null);
            toast.success("Événement mis à jour");
          }}
        />
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick, dot }: { label: string; active: boolean; onClick: () => void; dot: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
        active ? "bg-[#622599] text-white border-[#622599]" : "bg-background text-foreground border-border hover:bg-muted"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: active ? "white" : dot }} />
      {label}
    </button>
  );
}

/* ----------- Calendar grid ----------- */
function CalendarView({ currentDate, events, onSelect }: { currentDate: Date; events: Evt[]; onSelect: (e: Evt) => void }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday=0
  const start = new Date(year, month, 1 - startOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const eventsForDay = (d: Date) => {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return events.filter((e) => ds >= e.date_debut && ds <= e.date_fin);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <div className="grid grid-cols-7 bg-muted">
        {DAY_NAMES.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
          const dayEvents = eventsForDay(d);
          return (
            <div
              key={i}
              className={`min-h-[80px] p-1.5 border-r border-b border-border ${!inMonth ? "bg-muted/30 opacity-50" : ""} ${isToday ? "ring-2 ring-inset ring-[#622599]" : ""}`}
            >
              <div className={`text-[12px] font-medium mb-1 ${isToday ? "text-[#622599] font-bold" : "text-foreground"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => {
                  const s = TYPE_STYLES[e.type];
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelect(e)}
                      className="block w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate"
                      style={{ background: s.bg, color: s.fg }}
                      title={e.titre}
                    >{e.titre}</button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <button
                    onClick={() => onSelect(dayEvents[2])}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >+{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? "s" : ""}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------- List view (current month) ----------- */
function ListView({ currentDate, events, onSelect }: { currentDate: Date; events: Evt[]; onSelect: (e: Evt) => void }) {
  const y = currentDate.getFullYear(), m = currentDate.getMonth();
  const monthEvents = events.filter((e) => {
    const d = parseDate(e.date_debut);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  if (monthEvents.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      Aucun événement ce mois-ci.
    </div>;
  }
  return (
    <div className="space-y-3">
      {monthEvents.map((e) => <ListCard key={e.id} evt={e} onClick={() => onSelect(e)} />)}
    </div>
  );
}

function ListCard({ evt, onClick }: { evt: Evt; onClick: () => void }) {
  const s = TYPE_STYLES[evt.type];
  const d = parseDate(evt.date_debut);
  const multi = evt.date_debut !== evt.date_fin;
  return (
    <button onClick={onClick} className="w-full text-left flex gap-4 p-4 rounded-lg border border-border bg-background hover:border-[#622599]/40 hover:shadow-sm transition-all">
      <div className="flex flex-col items-center justify-center bg-muted rounded-md w-16 py-2 shrink-0">
        <div className="text-[22px] font-bold text-[#622599] leading-none">{d.getDate()}</div>
        <div className="text-[11px] text-muted-foreground uppercase mt-1">{MONTH_NAMES[d.getMonth()].slice(0, 3)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
          {evt.region !== "National" && (
            <span className="px-2 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">{evt.region}</span>
          )}
          {multi && (
            <span className="text-[11px] text-muted-foreground">
              {d.getDate()} au {parseDate(evt.date_fin).getDate()} {MONTH_NAMES[parseDate(evt.date_fin).getMonth()].toLowerCase()}
            </span>
          )}
        </div>
        <div className="font-medium text-sm text-foreground mb-1">{evt.titre}</div>
        {evt.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{evt.description}</div>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          {evt.lieu && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{evt.lieu}</span>}
          {evt.nb_places > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{evt.nb_inscrits} / {evt.nb_places} places</span>}
          {evt.responsable && <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" />{evt.responsable}</span>}
        </div>
      </div>
    </button>
  );
}

/* ----------- Agenda view ----------- */
function AgendaView({ events, onSelect }: { events: Evt[]; onSelect: (e: Evt) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = events
    .filter((e) => parseDate(e.date_debut) >= today)
    .slice(0, 30);

  if (upcoming.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      Aucun événement à venir.
    </div>;
  }

  const groups: Record<string, Evt[]> = {};
  const oneWeek = 7 * 86400000;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (const e of upcoming) {
    const d = parseDate(e.date_debut).getTime();
    const diff = d - startOfWeek.getTime();
    let key: string;
    if (diff < oneWeek) key = "Cette semaine";
    else if (diff < 2 * oneWeek) key = "Semaine prochaine";
    else if (diff < 4 * oneWeek) key = "Ce mois";
    else key = "Plus tard";
    (groups[key] ||= []).push(e);
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-[2px] bg-[#622599]/30" />
      <div className="space-y-6">
        {Object.entries(groups).map(([k, items]) => (
          <div key={k}>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#622599] mb-3">{k}</div>
            <div className="space-y-2">
              {items.map((e) => {
                const s = TYPE_STYLES[e.type];
                return (
                  <div key={e.id} className="relative">
                    <span className="absolute -left-[18px] top-3 h-3 w-3 rounded-full border-2 border-background" style={{ background: s.dot }} />
                    <ListCard evt={e} onClick={() => onSelect(e)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------- Detail modal ----------- */
function EventDetailModal({ evt, isInscrit, isAdmin, onClose, onInscription, onAskAi, onEdit, onDelete }: {
  evt: Evt; isInscrit: boolean; isAdmin: boolean; onClose: () => void; onInscription: () => void; onAskAi: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const s = TYPE_STYLES[evt.type];
  const multi = evt.date_debut !== evt.date_fin;
  const full = evt.nb_places > 0 && evt.nb_inscrits >= evt.nb_places;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-2" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
              <h2 className="text-xl font-bold text-foreground">{evt.titre}</h2>
            </div>
            <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2"><CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{multi ? `Du ${formatDateFR(evt.date_debut)} au ${formatDateFR(evt.date_fin)}` : formatDateFR(evt.date_debut)}</span>
            </div>
            {evt.lieu && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" /><span>{evt.lieu}</span></div>}
            <div className="flex items-start gap-2"><Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div>{evt.nb_inscrits}{evt.nb_places > 0 ? ` / ${evt.nb_places}` : ""} {evt.nb_places > 0 ? "places" : "inscrits"}</div>
                {evt.nb_places > 0 && (
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#622599]" style={{ width: `${Math.min(100, (evt.nb_inscrits / evt.nb_places) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
            {evt.responsable && <div className="flex items-start gap-2"><UserIcon className="h-4 w-4 mt-0.5 text-muted-foreground" /><span>{evt.responsable}</span></div>}
            {evt.region && <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-muted">{evt.region}</span>}
            {evt.description && <p className="text-muted-foreground whitespace-pre-wrap">{evt.description}</p>}
          </div>

          <div className="mt-6 grid gap-2">
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={onEdit} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border text-sm font-medium hover:bg-muted">
                  <Pencil className="h-4 w-4" /> Modifier
                </button>
                <button onClick={onDelete} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              </div>
            )}
            <button onClick={onAskAi} className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-[#622599] text-[#622599] text-sm font-medium hover:bg-[#FAF5FF]">
              <Sparkles className="h-4 w-4" /> Demander à Incub'Youth <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <a
              href={buildGCalUrl(evt)} target="_blank" rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border text-sm font-medium hover:bg-muted"
            ><CalendarPlus className="h-4 w-4" /> Ajouter à Google Calendar</a>
            <button
              onClick={onInscription}
              className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold ${
                isInscrit ? "bg-muted text-foreground hover:bg-muted/80" : "bg-[#622599] text-white hover:bg-[#522085]"
              }`}
            >
              {isInscrit ? <><CheckCircle2 className="h-4 w-4" /> Se désinscrire</> : full ? <><AlertCircle className="h-4 w-4" /> S'inscrire (liste d'attente)</> : "S'inscrire"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------- Event form modal (create + edit) ----------- */
function EventFormModal({ userId, existing, onClose, onSaved }: { userId: string; existing?: Evt; onClose: () => void; onSaved: (e: Evt, isNew: boolean) => void }) {
  const isEdit = !!existing;
  const [titre, setTitre] = useState(existing?.titre ?? "");
  const [type, setType] = useState<EventType>(existing?.type ?? "camp");
  const [dateDebut, setDateDebut] = useState(existing?.date_debut ?? "");
  const [dateFin, setDateFin] = useState(existing?.date_fin ?? "");
  const [lieu, setLieu] = useState(existing?.lieu ?? "");
  const [region, setRegion] = useState(existing?.region ?? "National");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [responsable, setResponsable] = useState(existing?.responsable ?? "");
  const [nbPlaces, setNbPlaces] = useState(existing?.nb_places ?? 0);
  const [rappel, setRappel] = useState(existing?.rappel_email ?? true);
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [addToGcal, setAddToGcal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (titre.length < 3 || titre.length > 100) { toast.error("Titre entre 3 et 100 caractères"); return; }
    if (!dateDebut || !dateFin) { toast.error("Dates requises"); return; }
    if (dateFin < dateDebut) { toast.error("Date de fin invalide"); return; }
    if (description.length < 20) { toast.error("Description trop courte (min 20 caractères)"); return; }
    setSubmitting(true);
    const payload = {
      titre, type, date_debut: dateDebut, date_fin: dateFin,
      lieu: lieu || null, region, description, responsable: responsable || null,
      nb_places: nbPlaces, rappel_email: rappel, visible,
    };
    const { data, error } = isEdit
      ? await db.from("evenements").update(payload as never).eq("id", existing!.id).select().single()
      : await db.from("evenements").insert({ ...payload, created_by: userId } as never).select().single();
    setSubmitting(false);
    if (error || !data) { toast.error(error?.message ?? "Erreur"); return; }
    const saved = data as Evt;
    onSaved(saved, !isEdit);
    if (!isEdit && addToGcal) window.open(buildGCalUrl(saved), "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{isEdit ? "Modifier l'événement" : "Nouvel événement"}</h2>
            <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>

          <Field label="Titre">
            <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={100} required className="w-full h-10 rounded-md border border-border px-3 text-sm" />
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="w-full h-10 rounded-md border border-border px-3 text-sm">
              {(Object.keys(TYPE_STYLES) as EventType[]).map((k) => <option key={k} value={k}>{TYPE_STYLES[k].label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date début"><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required className="w-full h-10 rounded-md border border-border px-3 text-sm" /></Field>
            <Field label="Date fin"><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} min={dateDebut} required className="w-full h-10 rounded-md border border-border px-3 text-sm" /></Field>
          </div>
          <Field label="Lieu"><input value={lieu} onChange={(e) => setLieu(e.target.value)} className="w-full h-10 rounded-md border border-border px-3 text-sm" /></Field>
          <Field label="Région">
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-10 rounded-md border border-border px-3 text-sm">
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Description (min 20 caractères)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required className="w-full rounded-md border border-border p-3 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable"><input value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full h-10 rounded-md border border-border px-3 text-sm" /></Field>
            <Field label="Nombre de places (0 = illimité)"><input type="number" min={0} value={nbPlaces} onChange={(e) => setNbPlaces(Number(e.target.value))} className="w-full h-10 rounded-md border border-border px-3 text-sm" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rappel} onChange={(e) => setRappel(e.target.checked)} /> Envoyer un rappel email 7 jours avant
          </label>
          <label className="flex items-center justify-between gap-2 text-sm rounded-md border border-border px-3 py-2">
            <span className="flex flex-col">
              <span className="font-medium">{visible ? "Visible publiquement" : "Masqué (brouillon)"}</span>
              <span className="text-xs text-muted-foreground">{visible ? "L'événement apparaît dans le calendrier de tous les scouts." : "Seuls les administrateurs le voient."}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={visible}
              onClick={() => setVisible((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${visible ? "bg-[#622599]" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${visible ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addToGcal} onChange={(e) => setAddToGcal(e.target.checked)} /> Ajouter à mon Google Calendar après création
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-md border border-border text-sm">Annuler</button>
            <button type="submit" disabled={submitting} className="flex-1 h-10 rounded-md bg-[#622599] text-white text-sm font-medium hover:bg-[#522085] disabled:opacity-50">
              {submitting ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer l'événement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}
