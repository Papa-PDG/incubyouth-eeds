import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Heart,
  Flame,
  Pin,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CATEGORIES,
  UPCOMING_EVENTS,
  buildAuthor,
  getCategory,
  gradeFor,
  initialsOf,
  relativeTime,
  type CategoryKey,
  type ForumAuthor,
} from "@/data/forumData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/forum")({
  head: () => ({
    meta: [
      { title: "Forum Scout — Incub'Youth" },
      {
        name: "description",
        content:
          "Échangez avec la communauté EEDS : scoutisme, droits de l'enfant, environnement, santé, citoyenneté et plus.",
      },
    ],
  }),
  component: ForumPage,
});

const PAGE_SIZE = 10;

interface ThreadRow {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  user_id: string;
  est_epingle: boolean;
  est_resolu: boolean;
  est_ferme: boolean;
  nb_likes: number;
  nb_vues: number;
  created_at: string;
}

interface AuthorRow {
  id: string;
  prenom: string | null;
  nom: string | null;
  region: string | null;
  post_count: number;
}

const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initialsOf(name)}
    </div>
  );
}

function CategoryBadge({ categoryKey }: { categoryKey: string }) {
  const c = getCategory(categoryKey);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </span>
  );
}

function ForumPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, ForumAuthor>>({});
  const [replyCount, setReplyCount] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<CategoryKey | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openCreate, setOpenCreate] = useState(false);
  const [bumpId, setBumpId] = useState<string | null>(null);

  const loadAuthors = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase.rpc("get_forum_authors" as never, { _ids: ids } as never);
    const map: Record<string, ForumAuthor> = {};
    ((data ?? []) as AuthorRow[]).forEach((a) => {
      map[a.id] = buildAuthor(a.id, a.prenom, a.nom, a.region, a.post_count ?? 0);
    });
    setAuthors((prev) => ({ ...prev, ...map }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("forum_threads")
      .select("*")
      .order("est_epingle", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur de chargement du forum");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as ThreadRow[];
    setThreads(list);

    if (list.length) {
      const ids = list.map((t) => t.id);
      const { data: replies } = await db
        .from("forum_replies")
        .select("thread_id")
        .in("thread_id", ids);
      const counts: Record<string, number> = {};
      ((replies ?? []) as { thread_id: string }[]).forEach((r) => {
        counts[r.thread_id] = (counts[r.thread_id] ?? 0) + 1;
      });
      setReplyCount(counts);

      await loadAuthors(Array.from(new Set(list.map((t) => t.user_id))));
    }

    if (user) {
      const { data: likes } = await db
        .from("forum_likes")
        .select("thread_id")
        .eq("user_id", user.id)
        .not("thread_id", "is", null);
      setLikedIds(
        new Set(
          ((likes ?? []) as { thread_id: string }[]).map((l) => l.thread_id),
        ),
      );
    } else {
      setLikedIds(new Set());
    }

    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    setMemberCount(count ?? 0);

    setLoading(false);
  }, [loadAuthors, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("forum-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_threads" },
        (payload) => {
          const t = payload.new as ThreadRow;
          setThreads((arr) => (arr.some((x) => x.id === t.id) ? arr : [t, ...arr]));
          void loadAuthors([t.user_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forum_threads" },
        (payload) => {
          const t = payload.new as ThreadRow;
          setThreads((arr) => arr.map((x) => (x.id === t.id ? { ...x, ...t } : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_threads" },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old.id) return;
          setThreads((arr) => arr.filter((x) => x.id !== old.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_replies" },
        (payload) => {
          const r = payload.new as { thread_id: string };
          setReplyCount((c) => ({ ...c, [r.thread_id]: (c[r.thread_id] ?? 0) + 1 }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadAuthors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((t) => activeCat === "all" || t.categorie === activeCat)
      .filter(
        (t) =>
          !q ||
          t.titre.toLowerCase().includes(q) ||
          t.contenu.toLowerCase().includes(q),
      );
  }, [threads, activeCat, search]);

  const visible = filtered.slice(0, visibleCount);

  const toggleLike = async (t: ThreadRow) => {
    if (!user) {
      toast.info("Connecte-toi pour aimer une discussion");
      return;
    }
    const liked = likedIds.has(t.id);
    // Optimistic
    setLikedIds((s) => {
      const n = new Set(s);
      if (liked) n.delete(t.id);
      else n.add(t.id);
      return n;
    });
    setThreads((arr) =>
      arr.map((x) =>
        x.id === t.id
          ? { ...x, nb_likes: Math.max(0, x.nb_likes + (liked ? -1 : 1)) }
          : x,
      ),
    );
    if (!liked) {
      setBumpId(t.id);
      window.setTimeout(() => setBumpId(null), 350);
    }
    if (liked) {
      const { error } = await db
        .from("forum_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("thread_id", t.id);
      if (!error) {
        await db
          .from("forum_threads")
          .update({ nb_likes: Math.max(0, t.nb_likes - 1) })
          .eq("id", t.id);
      }
    } else {
      const { error } = await db
        .from("forum_likes")
        .insert({ user_id: user.id, thread_id: t.id });
      if (!error) {
        await db
          .from("forum_threads")
          .update({ nb_likes: t.nb_likes + 1 })
          .eq("id", t.id);
      }
    }
  };

  const handleCreate = async (data: {
    title: string;
    content: string;
    category: CategoryKey;
  }) => {
    if (!user) return;
    const { data: inserted, error } = await db
      .from("forum_threads")
      .insert({
        user_id: user.id,
        titre: data.title.trim(),
        contenu: data.content.trim(),
        categorie: data.category,
      })
      .select("*")
      .maybeSingle();
    if (error || !inserted) {
      toast.error("Impossible de publier la discussion");
      return;
    }
    setThreads((arr) => [inserted as ThreadRow, ...arr]);
    void loadAuthors([user.id]);
    setOpenCreate(false);
    toast.success("Discussion publiée ! 🎉");
  };

  const stats = useMemo(() => {
    const totalReplies = Object.values(replyCount).reduce((a, b) => a + b, 0);
    return {
      members: memberCount,
      threads: threads.length,
      replies: totalReplies,
    };
  }, [memberCount, threads.length, replyCount]);

  const topContributors = useMemo(() => {
    return Object.values(authors)
      .filter((a) => a.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);
  }, [authors]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground sm:text-4xl">
            <span aria-hidden>💬</span> Forum Scout
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Échangez avec la communauté EEDS
          </p>
        </div>

        {user ? (
          <button
            onClick={() => setOpenCreate(true)}
            aria-label="Créer une nouvelle discussion"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:opacity-90"
            style={{ background: "#622599" }}
          >
            <Plus className="h-4 w-4" /> Nouvelle discussion
          </button>
        ) : (
          <Link
            to="/login"
            aria-label="Se connecter pour publier"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border-2 px-5 text-sm font-semibold transition-colors hover:text-white"
            style={{ borderColor: "#622599", color: "#622599" }}
          >
            <Plus className="h-4 w-4" /> Connectez-vous pour poster
          </Link>
        )}
      </header>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Rechercher une discussion, un mot-clé..."
          aria-label="Rechercher dans le forum"
          className="h-11 w-full rounded-[10px] border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-2 sm:flex-wrap">
          <CategoryPill
            label="Tous"
            emoji="✨"
            active={activeCat === "all"}
            onClick={() => {
              setActiveCat("all");
              setVisibleCount(PAGE_SIZE);
            }}
            color="#622599"
          />
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c.key}
              label={c.label}
              emoji={c.emoji}
              active={activeCat === c.key}
              color={c.color}
              onClick={() => {
                setActiveCat(c.key);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr,300px]">
        <section aria-label="Discussions">
          {loading ? (
            <ul className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <Skeleton className="h-32 w-full rounded-xl" />
                </li>
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune discussion ne correspond à votre recherche.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((t) => {
                const replies = replyCount[t.id] ?? 0;
                const trending = t.nb_likes >= 10 || replies >= 5;
                const liked = likedIds.has(t.id);
                const author = authors[t.user_id] ?? buildAuthor(t.user_id, null, null, null, 0);
                const grade = gradeFor(author.postCount);
                return (
                  <li key={t.id}>
                    <article className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-5">
                      <Link
                        to="/forum/$id"
                        params={{ id: t.id }}
                        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={author.name} color={author.avatarColor} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{author.name}</span>
                              <span aria-hidden>·</span>
                              <span title={grade.label}>
                                {grade.emoji} {grade.label}
                              </span>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {author.city}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <CategoryBadge categoryKey={t.categorie} />
                              {t.est_epingle && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  <Pin className="h-3 w-3" /> Épinglé
                                </span>
                              )}
                              {trending && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                  <Flame className="h-3 w-3" /> Tendance
                                </span>
                              )}
                              {t.est_resolu && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" /> Résolu
                                </span>
                              )}
                            </div>

                            <h2 className="mt-2 text-[15px] font-bold leading-snug text-foreground sm:text-base">
                              {t.titre}
                            </h2>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {t.contenu}
                            </p>
                          </div>
                        </div>
                      </Link>

                      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => toggleLike(t)}
                          aria-label={liked ? "Retirer le like" : "Aimer cette discussion"}
                          className={`inline-flex items-center gap-1 transition-colors ${
                            liked ? "text-rose-600" : "hover:text-rose-600"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 transition-transform ${
                              liked ? "fill-current" : ""
                            } ${bumpId === t.id ? "scale-150" : ""}`}
                          />
                          {t.nb_likes}
                        </button>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" /> {replies}
                        </span>
                        <span className="ml-auto">{relativeTime(t.created_at)}</span>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && visibleCount < filtered.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Voir plus
              </button>
            </div>
          )}
        </section>

        <aside className="hidden space-y-6 lg:block" aria-label="Statistiques et événements">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-bold text-foreground">Statistiques communautaires</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.members}</strong> membres
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.threads}</strong> discussions
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.replies}</strong> réponses
                </span>
              </li>
            </ul>
          </div>

          {topContributors.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Trophy className="h-4 w-4" style={{ color: "#622599" }} /> Top contributeurs
              </h3>
              <ul className="space-y-3">
                {topContributors.map((u, i) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: "#622599" }}
                    >
                      {i + 1}
                    </span>
                    <Avatar name={u.name} color={u.avatarColor} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {gradeFor(u.postCount).emoji} {u.postCount} discussion{u.postCount > 1 ? "s" : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Calendar className="h-4 w-4" style={{ color: "#622599" }} /> Prochains événements
            </h3>
            <ul className="space-y-3">
              {UPCOMING_EVENTS.map((e) => (
                <li key={e.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="text-sm font-semibold text-foreground">{e.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {e.date}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {e.location}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <CreateThreadDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSubmit={handleCreate}
      />
    </main>
  );
}

function CategoryPill({
  label,
  emoji,
  active,
  onClick,
  color,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-transparent text-white shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
      style={active ? { background: color } : undefined}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function CreateThreadDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { title: string; content: string; category: CategoryKey }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CategoryKey>("scoutisme");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setContent("");
    setCategory("scoutisme");
    setErrors({});
    setSubmitting(false);
  };

  const handle = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    const errs: typeof errors = {};
    const t = title.trim();
    const c = content.trim();
    if (!t) errs.title = "Le titre est obligatoire";
    else if (t.length > 100) errs.title = "Maximum 100 caractères";
    if (!c) errs.content = "Le message est obligatoire";
    else if (c.length < 20) errs.content = "Au moins 20 caractères";
    else if (c.length > 2000) errs.content = "Maximum 2000 caractères";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: t, content: c, category });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handle}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle discussion</DialogTitle>
          <DialogDescription>
            Partagez votre question ou expérience avec la communauté.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="thread-title" className="mb-1 block text-sm font-medium">
              Titre <span className="text-destructive">*</span>
            </label>
            <input
              id="thread-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Ex : Comment préparer un feu de camp ?"
              className="h-10 w-full rounded-[10px] border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-destructive">{errors.title ?? ""}</span>
              <span className="text-muted-foreground">{title.length}/100</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Catégorie</label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="thread-content" className="mb-1 block text-sm font-medium">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              id="thread-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Décrivez votre question ou partagez votre expérience..."
              className="w-full resize-none rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-destructive">{errors.content ?? ""}</span>
              <span className="text-muted-foreground">{content.length}/2000</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => handle(false)}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: "#622599" }}
          >
            {submitting ? "Publication..." : "Publier"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
