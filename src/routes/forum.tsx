import { createFileRoute, Link } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Heart,
  Eye,
  Pin,
  CheckCircle2,
  Lock,
  Flag,
  ArrowLeft,
  Send,
  Loader2,
  Trees,
  Scale,
  HeartPulse,
  Shield,
  Sparkles,
  ExternalLink,
  Users,
  Flame,
  Clock,
} from "lucide-react";
import { ProtectedRoute } from "@/components/route-guards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "Forum Scout Communautaire — Incub'Youth" },
      {
        name: "description",
        content:
          "Échangez avec la communauté EEDS : scoutisme, droits de l'enfant, environnement, santé et plus.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <ForumPage />
    </ProtectedRoute>
  ),
});

const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

type Thread = {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  user_id: string;
  est_epingle: boolean;
  est_resolu: boolean;
  est_ferme: boolean;
  nb_vues: number;
  nb_likes: number;
  created_at: string;
  updated_at?: string;
};

type Reply = {
  id: string;
  thread_id: string;
  user_id: string;
  contenu: string;
  est_meilleure_reponse: boolean;
  nb_likes: number;
  created_at: string;
};

type Profile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  last_seen_at?: string | null;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // < 2 min => en ligne

// Contexte de présence temps réel (Supabase Realtime Presence)
const OnlineContext = createContext<Set<string>>(new Set());
function useOnline() {
  return useContext(OnlineContext);
}

function presenceStatus(
  lastSeen?: string | null,
  liveOnline?: boolean,
): {
  online: boolean;
  label: string;
} {
  if (liveOnline) return { online: true, label: "En ligne" };
  if (!lastSeen) return { online: false, label: "Hors ligne" };
  const ms = Date.now() - new Date(lastSeen).getTime();
  if (ms < ONLINE_WINDOW_MS) return { online: true, label: "En ligne" };
  if (ms < 3600_000) return { online: false, label: `Vu il y a ${Math.floor(ms / 60000)} min` };
  if (ms < 86400_000) return { online: false, label: `Vu il y a ${Math.floor(ms / 3600_000)} h` };
  return { online: false, label: `Vu il y a ${Math.floor(ms / 86400_000)} j` };
}

function PresenceDot({ online, className = "" }: { online: boolean; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-card ${
        online ? "bg-emerald-500" : "bg-slate-300"
      } ${className}`}
      aria-hidden
    />
  );
}

const CATEGORIES = [
  { key: "all", label: "Tous", Icon: Sparkles, bg: "#F3E8FF", fg: "#622599" },
  { key: "scoutisme", label: "Scoutisme", Icon: Shield, bg: "#EEEDFE", fg: "#3C3489" },
  { key: "droits", label: "Droits de l'enfant", Icon: Scale, bg: "#E6F1FB", fg: "#0C447C" },
  { key: "environnement", label: "Environnement", Icon: Trees, bg: "#EAF3DE", fg: "#27500A" },
  { key: "sante", label: "Santé", Icon: HeartPulse, bg: "#E1F5EE", fg: "#085041" },
  { key: "general", label: "Général", Icon: MessageSquare, bg: "#FAEEDA", fg: "#633806" },
] as const;

const SORTS = [
  { key: "recent", label: "Récent", Icon: Clock },
  { key: "populaire", label: "Populaire", Icon: Flame },
  { key: "actif", label: "Actif", Icon: MessageSquare },
] as const;

const LAST_VISIT_KEY = "forum:last-visit";

function catMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}

function initialsOf(p?: Profile) {
  if (!p) return "?";
  const a = (p.prenom?.[0] ?? "").toUpperCase();
  const b = (p.nom?.[0] ?? "").toUpperCase();
  return (a + b) || "?";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function ForumPage() {
  const { user, isAdmin } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [lastReplyAt, setLastReplyAt] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedThreadIds, setLikedThreadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("recent");
  const [openCreate, setOpenCreate] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [, forceTick] = useState(0);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // Présence temps réel : tous les utilisateurs ouverts sur /forum se voient en direct
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("forum-presence", {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>;
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Re-render every 30s pour rafraîchir les libellés "vu il y a X"
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // mark visit
  useEffect(() => {
    try {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch { /* ignore */ }
  }, []);

  const loadThreads = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("forum_threads")
      .select("*")
      .order("est_epingle", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur de chargement");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Thread[];
    setThreads(list);

    // reply counts + last activity
    if (list.length) {
      const { data: allReplies } = await db
        .from("forum_replies")
        .select("thread_id, created_at")
        .in("thread_id", list.map((t) => t.id));
      const counts: Record<string, number> = {};
      const last: Record<string, string> = {};
      ((allReplies ?? []) as { thread_id: string; created_at: string }[]).forEach((r) => {
        counts[r.thread_id] = (counts[r.thread_id] ?? 0) + 1;
        if (!last[r.thread_id] || r.created_at > last[r.thread_id]) last[r.thread_id] = r.created_at;
      });
      setReplyCounts(counts);
      setLastReplyAt(last);
    }

    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles" as never, {
        _ids: ids,
      } as never);
      const map: Record<string, Profile> = {};
      ((profs ?? []) as Profile[]).forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }
    if (user) {
      const { data: likes } = await db
        .from("forum_likes")
        .select("thread_id")
        .eq("user_id", user.id)
        .not("thread_id", "is", null);
      setLikedThreadIds(new Set(((likes ?? []) as { thread_id: string }[]).map((l) => l.thread_id)));
    }

    // member count = distinct profiles
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    setMemberCount(count ?? 0);

    setLoading(false);
  };

  useEffect(() => {
    void loadThreads();
    // realtime
    const ch = supabase
      .channel("forum-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_threads" },
        () => { void loadThreads(); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forum_threads" },
        (payload) => {
          const t = payload.new as Thread;
          setThreads((arr) => {
            const exists = arr.some((x) => x.id === t.id);
            return exists ? arr.map((x) => (x.id === t.id ? { ...x, ...t } : x)) : [t, ...arr];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_threads" },
        (payload) => {
          const t = payload.old as Partial<Thread>;
          if (!t.id) return;
          setThreads((arr) => arr.filter((x) => x.id !== t.id));
          setReplyCounts((c) => { const n = { ...c }; delete n[t.id!]; return n; });
          setLastReplyAt((l) => { const n = { ...l }; delete n[t.id!]; return n; });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_replies" },
        (payload) => {
          const r = payload.new as Reply;
          setReplyCounts((c) => ({ ...c, [r.thread_id]: (c[r.thread_id] ?? 0) + 1 }));
          setLastReplyAt((l) => ({ ...l, [r.thread_id]: r.created_at }));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_replies" },
        (payload) => {
          const r = payload.old as Partial<Reply>;
          if (!r.thread_id) return;
          setReplyCounts((c) => ({
            ...c,
            [r.thread_id!]: Math.max(0, (c[r.thread_id!] ?? 1) - 1),
          }));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const totals = useMemo(() => {
    const totalReplies = Object.values(replyCounts).reduce((a, b) => a + b, 0);
    const resolus = threads.filter((t) => t.est_resolu).length;
    const onlineNow = Object.values(profiles).filter((p) =>
      presenceStatus(p.last_seen_at).online,
    ).length;
    return { threads: threads.length, replies: totalReplies, resolus, onlineNow };
  }, [threads, replyCounts, profiles]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = { all: threads.length };
    threads.forEach((t) => { m[t.categorie] = (m[t.categorie] ?? 0) + 1; });
    return m;
  }, [threads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = threads.filter((t) => {
      if (activeCat !== "all" && t.categorie !== activeCat) return false;
      if (q && !t.titre.toLowerCase().includes(q) && !t.contenu.toLowerCase().includes(q))
        return false;
      return true;
    });
    arr = [...arr].sort((a, b) => {
      if (a.est_epingle !== b.est_epingle) return a.est_epingle ? -1 : 1;
      if (sort === "populaire") {
        return (b.nb_likes + (replyCounts[b.id] ?? 0)) - (a.nb_likes + (replyCounts[a.id] ?? 0));
      }
      if (sort === "actif") {
        const la = lastReplyAt[a.id] ?? a.created_at;
        const lb = lastReplyAt[b.id] ?? b.created_at;
        return lb.localeCompare(la);
      }
      return b.created_at.localeCompare(a.created_at);
    });
    return arr;
  }, [threads, activeCat, search, sort, replyCounts, lastReplyAt]);

  const toggleThreadLike = async (thread: Thread) => {
    if (!user) return;
    const liked = likedThreadIds.has(thread.id);
    if (liked) {
      await db.from("forum_likes").delete().eq("user_id", user.id).eq("thread_id", thread.id);
      setLikedThreadIds((s) => { const n = new Set(s); n.delete(thread.id); return n; });
      await db.from("forum_threads").update({ nb_likes: Math.max(0, thread.nb_likes - 1) }).eq("id", thread.id);
      setThreads((arr) => arr.map((t) => (t.id === thread.id ? { ...t, nb_likes: Math.max(0, t.nb_likes - 1) } : t)));
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, thread_id: thread.id });
      setLikedThreadIds((s) => new Set(s).add(thread.id));
      await db.from("forum_threads").update({ nb_likes: thread.nb_likes + 1 }).eq("id", thread.id);
      setThreads((arr) => arr.map((t) => (t.id === thread.id ? { ...t, nb_likes: t.nb_likes + 1 } : t)));
    }
  };

  const openThread = async (t: Thread) => {
    setOpenThreadId(t.id);
    await db.from("forum_threads").update({ nb_vues: t.nb_vues + 1 }).eq("id", t.id);
    setThreads((arr) => arr.map((x) => (x.id === t.id ? { ...x, nb_vues: x.nb_vues + 1 } : x)));
  };

  const activeThread = threads.find((t) => t.id === openThreadId) ?? null;

  return (
    <OnlineContext.Provider value={onlineIds}>
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {!activeThread && (
        <>
          {/* Header + stats */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                Forum Scout Communautaire
              </h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                Posez vos questions, partagez vos expériences et échangez avec la communauté EEDS.
              </p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" /> Nouvelle discussion
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Discussions" value={totals.threads} Icon={MessageSquare} color="#622599" bg="#F3E8FF" />
            <StatCard label="Réponses" value={totals.replies} Icon={Send} color="#0C447C" bg="#E6F1FB" />
            <StatCard label="Membres" value={memberCount} Icon={Users} color="#27500A" bg="#EAF3DE" />
            <StatCard label="En ligne" value={totals.onlineNow} Icon={Users} color="#047857" bg="#D1FAE5" pulse />
            <StatCard label="Résolus" value={totals.resolus} Icon={CheckCircle2} color="#085041" bg="#E1F5EE" />
          </div>

          {/* Search + sort */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un sujet..."
                className="h-11 w-full rounded-[10px] border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="inline-flex rounded-[10px] border border-border bg-background p-1">
              {SORTS.map((s) => {
                const active = sort === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <s.Icon className="h-3.5 w-3.5" /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category pills with counts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = activeCat === c.key;
              const n = catCounts[c.key] ?? 0;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCat(c.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                  style={!active ? { background: c.bg, color: c.fg, borderColor: "transparent" } : undefined}
                >
                  <c.Icon className="h-4 w-4" /> {c.label}
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-white/20" : "bg-white/60"
                  }`}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* Threads list */}
          <div className="mt-8 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Aucune discussion pour l'instant. Sois le premier à lancer le sujet !
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const meta = catMeta(t.categorie);
                const author = profiles[t.user_id];
                const liked = likedThreadIds.has(t.id);
                const nReplies = replyCounts[t.id] ?? 0;
                const populaire = t.nb_likes + nReplies >= 5;
                return (
                  <article
                    key={t.id}
                    className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                    onClick={() => openThread(t)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
                          style={{ background: meta.bg, color: meta.fg }}
                          title={author ? `${author.prenom ?? ""} ${author.nom ?? ""}` : ""}
                        >
                          {initialsOf(author)}
                        </span>
                        <span className="absolute -bottom-0.5 -right-0.5">
                          <PresenceDot online={presenceStatus(author?.last_seen_at, author ? onlineIds.has(author.id) : false).online} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {t.est_epingle && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <Pin className="h-3 w-3" /> Épinglé
                            </span>
                          )}
                          {t.est_resolu && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Résolu
                            </span>
                          )}
                          {populaire && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                              <Flame className="h-3 w-3" /> Populaire
                            </span>
                          )}
                          {t.est_ferme && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              <Lock className="h-3 w-3" /> Fermé
                            </span>
                          )}
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: meta.bg, color: meta.fg }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary">
                          {t.titre}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {t.contenu}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            par{" "}
                            <span className="font-medium text-foreground">
                              {author
                                ? `${author.prenom ?? ""} ${author.nom ?? ""}`.trim() || "Membre"
                                : "Membre"}
                            </span>
                            {author && (
                              <span
                                className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  presenceStatus(author.last_seen_at, onlineIds.has(author.id)).online
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <PresenceDot online={presenceStatus(author.last_seen_at, onlineIds.has(author.id)).online} className="!ring-0 !h-1.5 !w-1.5" />
                                {presenceStatus(author.last_seen_at, onlineIds.has(author.id)).label}
                              </span>
                            )}
                          </span>
                          <span>{formatDate(t.created_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" /> {t.nb_vues}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); void toggleThreadLike(t); }}
                            className={`inline-flex items-center gap-1 transition-colors ${
                              liked ? "text-rose-600" : "hover:text-rose-600"
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />{" "}
                            {t.nb_likes}
                          </button>
                          <Link
                            to="/chat"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Poser à Incub'Youth <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl bg-muted/40 px-3 py-2 text-center">
                        <span className="text-xl font-bold text-foreground">{nReplies}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          réponse{nReplies > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {activeThread && (
        <ThreadDetail
          thread={activeThread}
          authorProfile={profiles[activeThread.user_id]}
          isAdmin={isAdmin}
          currentUserId={user?.id ?? null}
          liked={likedThreadIds.has(activeThread.id)}
          onLikeThread={() => toggleThreadLike(activeThread)}
          onBack={() => setOpenThreadId(null)}
          onThreadUpdate={(patch) => {
            setThreads((arr) => arr.map((t) => (t.id === activeThread.id ? { ...t, ...patch } : t)));
          }}
          onThreadDelete={() => {
            setThreads((arr) => arr.filter((t) => t.id !== activeThread.id));
            setOpenThreadId(null);
          }}
        />
      )}

      {openCreate && (
        <CreateThreadModal
          onClose={() => setOpenCreate(false)}
          onCreated={() => { setOpenCreate(false); void loadThreads(); }}
        />
      )}
    </main>
    </OnlineContext.Provider>
  );
}

function StatCard({
  label, value, Icon, color, bg, pulse,
}: { label: string; value: number; Icon: typeof MessageSquare; color: string; bg: string; pulse?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${pulse ? "after:absolute after:inset-0 after:rounded-xl after:bg-emerald-400/40 after:animate-ping" : ""}`}
          style={{ background: bg, color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CreateThreadModal({
  onClose,
  onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [categorie, setCategorie] = useState<string>("general");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (titre.trim().length < 5) {
      toast.error("Titre trop court (5 caractères min)");
      return;
    }
    if (titre.trim().length > 120) {
      toast.error("Titre trop long (120 caractères max)");
      return;
    }
    if (contenu.trim().length < 30) {
      toast.error("Message trop court (30 caractères min)");
      return;
    }
    setSubmitting(true);
    const { error } = await db.from("forum_threads").insert({
      titre: titre.trim(),
      contenu: contenu.trim(),
      categorie,
      user_id: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Échec de la publication");
      return;
    }
    toast.success("Discussion publiée !");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-xl font-bold text-foreground">Nouvelle discussion</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setCategorie(c.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    categorie === c.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <c.Icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium">Titre</label>
              <span className="text-xs text-muted-foreground">{titre.length}/120</span>
            </div>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value.slice(0, 120))}
              maxLength={120}
              className="h-11 w-full rounded-[10px] border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Question ou sujet de discussion..."
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium">Message</label>
              <span className={`text-xs ${contenu.trim().length < 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                {contenu.trim().length}/30 min
              </span>
            </div>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={6}
              className="w-full rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Décris ton sujet en détail (minimum 30 caractères)..."
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Publier
          </button>
        </div>
      </form>
    </div>
  );
}

function ThreadDetail({
  thread,
  authorProfile,
  isAdmin,
  currentUserId,
  liked,
  onLikeThread,
  onBack,
  onThreadUpdate,
  onThreadDelete,
}: {
  thread: Thread;
  authorProfile?: Profile;
  isAdmin: boolean;
  currentUserId: string | null;
  liked: boolean;
  onLikeThread: () => void;
  onBack: () => void;
  onThreadUpdate: (patch: Partial<Thread>) => void;
  onThreadDelete: () => void;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ thread_id?: string; reply_id?: string } | null>(null);
  const meta = catMeta(thread.categorie);
  const loadedAuthorIds = useRef(new Set<string>());

  const fetchProfilesForIds = async (ids: string[]) => {
    const missing = ids.filter((id) => !loadedAuthorIds.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => loadedAuthorIds.current.add(id));
    const { data: profs } = await supabase.rpc("get_public_profiles" as never, {
      _ids: missing,
    } as never);
    const map: Record<string, Profile> = {};
    ((profs ?? []) as Profile[]).forEach((p) => (map[p.id] = p));
    setProfiles((prev) => ({ ...prev, ...map }));
  };

  const load = async () => {
    setLoading(true);
    const { data } = await db
      .from("forum_replies")
      .select("*")
      .eq("thread_id", thread.id)
      .order("est_meilleure_reponse", { ascending: false })
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Reply[];
    setReplies(list);
    await fetchProfilesForIds([thread.user_id, ...list.map((r) => r.user_id)]);
    if (currentUserId && list.length) {
      const { data: likes } = await db
        .from("forum_likes")
        .select("reply_id")
        .eq("user_id", currentUserId)
        .in("reply_id", list.map((r) => r.id));
      setLikedReplyIds(new Set(((likes ?? []) as { reply_id: string }[]).map((l) => l.reply_id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // realtime: nouvelles réponses + likes + meilleure réponse + suppressions
    const ch = supabase
      .channel(`thread-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_replies", filter: `thread_id=eq.${thread.id}` },
        async (payload) => {
          const r = payload.new as Reply;
          setReplies((arr) => {
            if (arr.some((x) => x.id === r.id)) return arr;
            return [...arr, r];
          });
          await fetchProfilesForIds([r.user_id]);
          if (r.user_id !== currentUserId) {
            toast.message("Nouvelle réponse", { description: "Un membre vient de répondre." });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forum_replies", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          const r = payload.new as Reply;
          setReplies((arr) => arr.map((x) => (x.id === r.id ? { ...x, ...r } : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_replies", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          const r = payload.old as Partial<Reply>;
          if (r.id) setReplies((arr) => arr.filter((x) => x.id !== r.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forum_threads", filter: `id=eq.${thread.id}` },
        (payload) => {
          const t = payload.new as Partial<Thread>;
          onThreadUpdate(t);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    if (content.trim().length < 2) return;
    if (thread.est_ferme) { toast.error("Discussion fermée"); return; }
    setSubmitting(true);
    const { error } = await db.from("forum_replies").insert({
      thread_id: thread.id,
      user_id: currentUserId,
      contenu: content.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error("Échec de l'envoi"); return; }
    setContent("");
  };

  const toggleReplyLike = async (r: Reply) => {
    if (!currentUserId) return;
    const isLiked = likedReplyIds.has(r.id);
    if (isLiked) {
      await db.from("forum_likes").delete().eq("user_id", currentUserId).eq("reply_id", r.id);
      setLikedReplyIds((s) => { const n = new Set(s); n.delete(r.id); return n; });
      await db.from("forum_replies").update({ nb_likes: Math.max(0, r.nb_likes - 1) }).eq("id", r.id);
      setReplies((arr) => arr.map((x) => (x.id === r.id ? { ...x, nb_likes: Math.max(0, x.nb_likes - 1) } : x)));
    } else {
      await db.from("forum_likes").insert({ user_id: currentUserId, reply_id: r.id });
      setLikedReplyIds((s) => new Set(s).add(r.id));
      await db.from("forum_replies").update({ nb_likes: r.nb_likes + 1 }).eq("id", r.id);
      setReplies((arr) => arr.map((x) => (x.id === r.id ? { ...x, nb_likes: x.nb_likes + 1 } : x)));
    }
  };

  const markBest = async (r: Reply) => {
    await db.from("forum_replies").update({ est_meilleure_reponse: false }).eq("thread_id", thread.id);
    await db.from("forum_replies").update({ est_meilleure_reponse: true }).eq("id", r.id);
    await db.from("forum_threads").update({ est_resolu: true }).eq("id", thread.id);
    onThreadUpdate({ est_resolu: true });
    void load();
    toast.success("Meilleure réponse choisie");
  };

  const toggleThreadFlag = async (field: "est_epingle" | "est_ferme" | "est_resolu") => {
    const next = !thread[field];
    await db.from("forum_threads").update({ [field]: next }).eq("id", thread.id);
    onThreadUpdate({ [field]: next } as Partial<Thread>);
  };

  const deleteThread = async () => {
    if (!confirm("Supprimer cette discussion ?")) return;
    await db.from("forum_threads").delete().eq("id", thread.id);
    toast.success("Discussion supprimée");
    onThreadDelete();
  };

  const deleteReply = async (r: Reply) => {
    if (!confirm("Supprimer cette réponse ?")) return;
    await db.from("forum_replies").delete().eq("id", r.id);
    setReplies((arr) => arr.filter((x) => x.id !== r.id));
  };

  const author = authorProfile ?? profiles[thread.user_id];
  const canEditThread = isAdmin || currentUserId === thread.user_id;

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux discussions
      </button>

      {/* AI suggestion banner */}
      <Link
        to="/chat"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary-soft to-transparent p-4 transition-colors hover:border-primary/60"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Demander à Incub'Youth <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
            </div>
            <div className="text-xs text-muted-foreground">
              Obtiens une réponse instantanée de notre assistant scout sur ce sujet.
            </div>
          </div>
        </div>
      </Link>

      <article className="mt-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              {initialsOf(author)}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot online={presenceStatus(author?.last_seen_at).online} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {thread.est_epingle && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Pin className="h-3 w-3" /> Épinglé
                </span>
              )}
              {thread.est_resolu && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Résolu
                </span>
              )}
              {thread.est_ferme && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Lock className="h-3 w-3" /> Fermé
                </span>
              )}
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: meta.bg, color: meta.fg }}
              >
                {meta.label}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{thread.titre}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                par{" "}
                <span className="font-medium text-foreground">
                  {author ? `${author.prenom ?? ""} ${author.nom ?? ""}`.trim() || "Membre" : "Membre"}
                </span>
                {author && (
                  <span
                    className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      presenceStatus(author.last_seen_at).online
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <PresenceDot online={presenceStatus(author.last_seen_at).online} className="!ring-0 !h-1.5 !w-1.5" />
                    {presenceStatus(author.last_seen_at).label}
                  </span>
                )}
              </span>
              <span>{formatDate(thread.created_at)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {thread.nb_vues}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {thread.contenu}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                onClick={onLikeThread}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  liked
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {thread.nb_likes}
              </button>
              <button
                onClick={() => setReportTarget({ thread_id: thread.id })}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-amber-400 hover:text-amber-600"
              >
                <Flag className="h-3.5 w-3.5" /> Signaler
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => toggleThreadFlag("est_epingle")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Pin className="h-3.5 w-3.5" /> {thread.est_epingle ? "Désépingler" : "Épingler"}
                  </button>
                  <button
                    onClick={() => toggleThreadFlag("est_ferme")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Lock className="h-3.5 w-3.5" /> {thread.est_ferme ? "Rouvrir" : "Fermer"}
                  </button>
                </>
              )}
              {canEditThread && (
                <button
                  onClick={deleteThread}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">
          {replies.length} réponse{replies.length > 1 ? "s" : ""}
        </h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : (
            replies.map((r) => {
              const a = profiles[r.user_id];
              const isLiked = likedReplyIds.has(r.id);
              const canEditReply = isAdmin || currentUserId === r.user_id;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    r.est_meilleure_reponse
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-border bg-card"
                  }`}
                >
                  {r.est_meilleure_reponse && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Meilleure réponse
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="relative">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                        {initialsOf(a)}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <PresenceDot online={presenceStatus(a?.last_seen_at).online} className="!h-2 !w-2" />
                      </span>
                    </span>
                    <span className="font-medium text-foreground">
                      {a ? `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Membre" : "Membre"}
                    </span>
                    <span>•</span>
                    <span>{formatDate(r.created_at)}</span>
                    {a && (
                      <>
                        <span>•</span>
                        <span className={presenceStatus(a.last_seen_at).online ? "text-emerald-600" : ""}>
                          {presenceStatus(a.last_seen_at).label}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {r.contenu}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleReplyLike(r)}
                      className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                        isLiked ? "text-rose-600" : "text-muted-foreground hover:text-rose-600"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} /> {r.nb_likes}
                    </button>
                    <button
                      onClick={() => setReportTarget({ reply_id: r.id })}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-600"
                    >
                      <Flag className="h-3.5 w-3.5" /> Signaler
                    </button>
                    {currentUserId === thread.user_id && !r.est_meilleure_reponse && (
                      <button
                        onClick={() => markBest(r)}
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marquer comme meilleure
                      </button>
                    )}
                    {canEditReply && (
                      <button
                        onClick={() => deleteReply(r)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {!loading && replies.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune réponse encore. Sois le premier à répondre !
            </p>
          )}
        </div>

        {!thread.est_ferme && currentUserId && (
          <form onSubmit={submitReply} className="mt-6 rounded-xl border border-border bg-card p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Écris ta réponse..."
              className="w-full resize-none rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || content.trim().length < 2}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Répondre
              </button>
            </div>
          </form>
        )}
      </div>

      {reportTarget && (
        <ReportModal
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          userId={currentUserId}
        />
      )}
    </div>
  );
}

function ReportModal({
  target,
  onClose,
  userId,
}: {
  target: { thread_id?: string; reply_id?: string };
  onClose: () => void;
  userId: string | null;
}) {
  const [raison, setRaison] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || raison.trim().length < 3) return;
    setSubmitting(true);
    const { error } = await db.from("forum_signalements").insert({
      user_id: userId,
      thread_id: target.thread_id ?? null,
      reply_id: target.reply_id ?? null,
      raison: raison.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error("Erreur lors du signalement"); return; }
    toast.success("Signalement envoyé. Merci !");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground">Signaler ce contenu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explique brièvement pourquoi ce contenu doit être modéré.
        </p>
        <textarea
          value={raison}
          onChange={(e) => setRaison(e.target.value)}
          rows={4}
          className="mt-4 w-full rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          placeholder="Raison du signalement..."
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || raison.trim().length < 3}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
