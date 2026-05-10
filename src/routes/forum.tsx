import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import {
  CATEGORIES,
  MOCK_THREADS,
  MOCK_REPLIES,
  MOCK_USERS,
  UPCOMING_EVENTS,
  getCategory,
  gradeFor,
  initialsOf,
  relativeTime,
  type CategoryKey,
  type ForumThread,
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

function CategoryBadge({ categoryKey }: { categoryKey: CategoryKey }) {
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
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<ForumThread[]>(MOCK_THREADS);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<CategoryKey | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openCreate, setOpenCreate] = useState(false);

  // likes locally
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bumpId, setBumpId] = useState<string | null>(null);

  const replyCount = useMemo(() => {
    const m: Record<string, number> = {};
    MOCK_REPLIES.forEach((r) => {
      m[r.threadId] = (m[r.threadId] ?? 0) + 1;
    });
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((t) => activeCat === "all" || t.category === activeCat)
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [threads, activeCat, search]);

  const visible = filtered.slice(0, visibleCount);

  const toggleLike = (t: ForumThread) => {
    if (!user) {
      toast.info("Connecte-toi pour aimer une discussion");
      return;
    }
    const liked = likedIds.has(t.id);
    setLikedIds((s) => {
      const n = new Set(s);
      if (liked) n.delete(t.id);
      else n.add(t.id);
      return n;
    });
    setThreads((arr) =>
      arr.map((x) =>
        x.id === t.id ? { ...x, likes: x.likes + (liked ? -1 : 1) } : x,
      ),
    );
    if (!liked) {
      setBumpId(t.id);
      window.setTimeout(() => setBumpId(null), 350);
    }
  };

  const handleCreate = (data: {
    title: string;
    content: string;
    category: CategoryKey;
  }) => {
    const meta = (user?.user_metadata ?? {}) as { prenom?: string; nom?: string };
    const name =
      [profile?.prenom ?? meta.prenom, profile?.nom ?? meta.nom]
        .filter(Boolean)
        .join(" ") ||
      user?.email?.split("@")[0] ||
      "Scout";
    const newThread: ForumThread = {
      id: `local-${Date.now()}`,
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category,
      author: {
        id: user!.id,
        name,
        city: profile?.region ?? "Sénégal",
        postCount: 1,
        avatarColor: "#622599",
      },
      createdAt: new Date().toISOString(),
      likes: 0,
    };
    setThreads((arr) => [newThread, ...arr]);
    setOpenCreate(false);
    toast.success("Discussion publiée ! 🎉");
  };

  // Stats
  const stats = useMemo(() => {
    return {
      members: 524,
      threads: 1247,
      replies: 3891,
    };
  }, []);

  const topContributors = [...MOCK_USERS]
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER */}
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
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary/90"
            style={{ background: "#622599" }}
          >
            <Plus className="h-4 w-4" /> Nouvelle discussion
          </button>
        ) : (
          <Link
            to="/login"
            aria-label="Se connecter pour publier"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border-2 border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            style={{ borderColor: "#622599", color: "#622599" }}
          >
            <Plus className="h-4 w-4" /> Connectez-vous pour poster
          </Link>
        )}
      </header>

      {/* SEARCH */}
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

      {/* CATEGORY PILLS */}
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
        {/* THREAD LIST */}
        <section aria-label="Discussions">
          {visible.length === 0 ? (
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
                const trending = t.likes >= 10 || replies >= 5;
                const liked = likedIds.has(t.id);
                const grade = gradeFor(t.author.postCount);
                return (
                  <li key={t.id}>
                    <article
                      className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-5"
                      style={{ borderColor: undefined }}
                    >
                      <Link
                        to="/forum/$id"
                        params={{ id: t.id }}
                        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={t.author.name} color={t.author.avatarColor} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {t.author.name}
                              </span>
                              <span aria-hidden>·</span>
                              <span title={grade.label}>
                                {grade.emoji} {grade.label}
                              </span>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {t.author.city}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <CategoryBadge categoryKey={t.category} />
                              {t.pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  <Pin className="h-3 w-3" /> Épinglé
                                </span>
                              )}
                              {trending && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                  <Flame className="h-3 w-3" /> Tendance
                                </span>
                              )}
                            </div>

                            <h2 className="mt-2 text-[15px] font-bold leading-snug text-foreground sm:text-base">
                              {t.title}
                            </h2>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {t.content}
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
                          {t.likes}
                        </button>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" /> {replies}
                        </span>
                        <span className="ml-auto">{relativeTime(t.createdAt)}</span>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {visibleCount < filtered.length && (
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

        {/* SIDEBAR */}
        <aside className="hidden space-y-6 lg:block" aria-label="Statistiques et événements">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-bold text-foreground">
              Statistiques communautaires
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.members}</strong> membres actifs
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-primary" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.threads}</strong> discussions
                </span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" style={{ color: "#622599" }} />
                <span>
                  <strong className="text-foreground">{stats.replies}</strong> réponses
                </span>
              </li>
            </ul>
          </div>

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
                    <div className="truncate text-sm font-medium text-foreground">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {gradeFor(u.postCount).emoji} {u.postCount} contributions
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

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
  onSubmit: (data: { title: string; content: string; category: CategoryKey }) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CategoryKey>("scoutisme");
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const reset = () => {
    setTitle("");
    setContent("");
    setCategory("scoutisme");
    setErrors({});
  };

  const handle = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = () => {
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
    onSubmit({ title: t, content: c, category });
    reset();
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
            className="inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: "#622599" }}
          >
            Publier
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
