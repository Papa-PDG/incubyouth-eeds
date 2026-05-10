import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Flag,
  Send,
  CheckCircle2,
  MapPin,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildAuthor,
  getCategory,
  gradeFor,
  initialsOf,
  relativeTime,
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
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/forum/$id")({
  head: () => ({
    meta: [
      { title: "Discussion — Forum Incub'Youth" },
      { name: "description", content: "Discussion du forum scout EEDS." },
    ],
  }),
  component: ThreadDetailPage,
});

interface ThreadRow {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  user_id: string;
  est_resolu: boolean;
  nb_likes: number;
  nb_vues: number;
  created_at: string;
}

interface ReplyRow {
  id: string;
  thread_id: string;
  user_id: string;
  contenu: string;
  est_meilleure_reponse: boolean;
  nb_likes: number;
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

function ThreadDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, ForumAuthor>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const loadAuthors = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase.rpc("get_forum_authors" as never, { _ids: ids } as never);
    const map: Record<string, ForumAuthor> = {};
    ((data ?? []) as AuthorRow[]).forEach((a) => {
      map[a.id] = buildAuthor(a.id, a.prenom, a.nom, a.region, a.post_count ?? 0);
    });
    setAuthors((prev) => ({ ...prev, ...map }));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: t } = await db
      .from("forum_threads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!t) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const threadRow = t as ThreadRow;
    setThread(threadRow);

    // Increment view count (fire-and-forget)
    void db
      .from("forum_threads")
      .update({ nb_vues: (threadRow.nb_vues ?? 0) + 1 })
      .eq("id", threadRow.id);

    const { data: r } = await db
      .from("forum_replies")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    const replyRows = (r ?? []) as ReplyRow[];
    setReplies(replyRows);

    const ids = Array.from(new Set([threadRow.user_id, ...replyRows.map((x) => x.user_id)]));
    await loadAuthors(ids);

    if (user) {
      const [{ data: tlike }, { data: save }, { data: rlikes }] = await Promise.all([
        db
          .from("forum_likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("thread_id", id)
          .maybeSingle(),
        db
          .from("forum_saves")
          .select("id")
          .eq("user_id", user.id)
          .eq("thread_id", id)
          .maybeSingle(),
        replyRows.length
          ? db
              .from("forum_likes")
              .select("reply_id")
              .eq("user_id", user.id)
              .in("reply_id", replyRows.map((x) => x.id))
          : Promise.resolve({ data: [] as { reply_id: string }[] }),
      ]);
      setLiked(!!tlike);
      setSaved(!!save);
      setLikedReplyIds(
        new Set(((rlikes ?? []) as { reply_id: string }[]).map((x) => x.reply_id)),
      );
    } else {
      setLiked(false);
      setSaved(false);
      setLikedReplyIds(new Set());
    }

    setLoading(false);
  }, [id, loadAuthors, user]);

  useEffect(() => {
    void loadAll();
    const ch = supabase
      .channel(`forum-thread-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_replies", filter: `thread_id=eq.${id}` },
        (payload) => {
          const r = payload.new as ReplyRow;
          setReplies((arr) => (arr.some((x) => x.id === r.id) ? arr : [...arr, r]));
          void loadAuthors([r.user_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forum_replies", filter: `thread_id=eq.${id}` },
        (payload) => {
          const r = payload.new as ReplyRow;
          setReplies((arr) => arr.map((x) => (x.id === r.id ? { ...x, ...r } : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_replies", filter: `thread_id=eq.${id}` },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old.id) setReplies((arr) => arr.filter((x) => x.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, loadAll, loadAuthors]);

  const sortedReplies = useMemo(() => {
    return [...replies].sort((a, b) => {
      if (a.est_meilleure_reponse !== b.est_meilleure_reponse) {
        return a.est_meilleure_reponse ? -1 : 1;
      }
      return a.created_at.localeCompare(b.created_at);
    });
  }, [replies]);

  const isOwner = !!user && !!thread && thread.user_id === user.id;

  const submitReply = async () => {
    if (!user || !thread) return;
    const text = draft.trim();
    if (text.length < 5) {
      toast.error("Votre réponse est trop courte");
      return;
    }
    if (text.length > 2000) {
      toast.error("Maximum 2000 caractères");
      return;
    }
    setPosting(true);
    const { data, error } = await db
      .from("forum_replies")
      .insert({ thread_id: thread.id, user_id: user.id, contenu: text })
      .select("*")
      .maybeSingle();
    setPosting(false);
    if (error || !data) {
      toast.error("Impossible de publier la réponse");
      return;
    }
    setReplies((arr) => (arr.some((x) => x.id === (data as ReplyRow).id) ? arr : [...arr, data as ReplyRow]));
    void loadAuthors([user.id]);
    setDraft("");
    toast.success("Réponse publiée ! 🎉");
  };

  const toggleLikeThread = async () => {
    if (!user || !thread) {
      toast.info("Connecte-toi pour aimer");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setThread((t) =>
      t ? { ...t, nb_likes: Math.max(0, t.nb_likes + (wasLiked ? -1 : 1)) } : t,
    );
    if (wasLiked) {
      await db
        .from("forum_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("thread_id", thread.id);
      await db
        .from("forum_threads")
        .update({ nb_likes: Math.max(0, thread.nb_likes - 1) })
        .eq("id", thread.id);
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, thread_id: thread.id });
      await db
        .from("forum_threads")
        .update({ nb_likes: thread.nb_likes + 1 })
        .eq("id", thread.id);
    }
  };

  const toggleSave = async () => {
    if (!user || !thread) {
      toast.info("Connecte-toi pour sauvegarder");
      return;
    }
    const wasSaved = saved;
    setSaved(!wasSaved);
    if (wasSaved) {
      await db
        .from("forum_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("thread_id", thread.id);
      toast.success("Retiré des favoris");
    } else {
      const { error } = await db
        .from("forum_saves")
        .insert({ user_id: user.id, thread_id: thread.id });
      if (error) {
        setSaved(false);
        toast.error("Impossible de sauvegarder");
      } else {
        toast.success("Sauvegardé");
      }
    }
  };

  const toggleLikeReply = async (r: ReplyRow) => {
    if (!user) {
      toast.info("Connecte-toi pour aimer");
      return;
    }
    const wasLiked = likedReplyIds.has(r.id);
    setLikedReplyIds((s) => {
      const n = new Set(s);
      if (wasLiked) n.delete(r.id);
      else n.add(r.id);
      return n;
    });
    setReplies((arr) =>
      arr.map((x) =>
        x.id === r.id ? { ...x, nb_likes: Math.max(0, x.nb_likes + (wasLiked ? -1 : 1)) } : x,
      ),
    );
    if (wasLiked) {
      await db
        .from("forum_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("reply_id", r.id);
      await db
        .from("forum_replies")
        .update({ nb_likes: Math.max(0, r.nb_likes - 1) })
        .eq("id", r.id);
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, reply_id: r.id });
      await db
        .from("forum_replies")
        .update({ nb_likes: r.nb_likes + 1 })
        .eq("id", r.id);
    }
  };

  const markBest = async (r: ReplyRow) => {
    if (!isOwner || !thread) return;
    // Unmark all, then mark this one
    await db
      .from("forum_replies")
      .update({ est_meilleure_reponse: false })
      .eq("thread_id", thread.id);
    const { error } = await db
      .from("forum_replies")
      .update({ est_meilleure_reponse: true })
      .eq("id", r.id);
    if (error) {
      toast.error("Action impossible");
      return;
    }
    await db.from("forum_threads").update({ est_resolu: true }).eq("id", thread.id);
    setReplies((arr) =>
      arr.map((x) => ({ ...x, est_meilleure_reponse: x.id === r.id })),
    );
    setThread((t) => (t ? { ...t, est_resolu: true } : t));
    toast.success("Meilleure réponse choisie ✅");
  };

  const submitReport = async () => {
    if (!user || !thread) return;
    const reason = reportReason.trim();
    if (reason.length < 5) {
      toast.error("Indiquez un motif (5 caractères minimum)");
      return;
    }
    const { error } = await db
      .from("forum_signalements")
      .insert({ user_id: user.id, thread_id: thread.id, raison: reason });
    if (error) {
      toast.error("Signalement impossible");
      return;
    }
    setReportOpen(false);
    setReportReason("");
    toast.success("Signalement envoyé aux modérateurs");
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
        <Skeleton className="mt-6 h-32 w-full rounded-xl" />
      </main>
    );
  }

  if (notFound || !thread) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Discussion introuvable</h1>
        <p className="mt-2 text-muted-foreground">
          Cette discussion n'existe pas ou a été supprimée.
        </p>
        <Link
          to="/forum"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold text-white"
          style={{ background: "#622599" }}
        >
          <ArrowLeft className="h-4 w-4" /> Retour au forum
        </Link>
      </main>
    );
  }

  const cat = getCategory(thread.categorie);
  const author = authors[thread.user_id] ?? buildAuthor(thread.user_id, null, null, null, 0);
  const grade = gradeFor(author.postCount);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au forum
      </Link>

      <article className="mt-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.bg} ${cat.text}`}
          >
            {cat.emoji} {cat.label}
          </span>
          {thread.est_resolu && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Résolu
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {thread.titre}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <Avatar name={author.name} color={author.avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {author.name}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {grade.emoji} {grade.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {author.city} · {relativeTime(thread.created_at)}
            </div>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
          {thread.contenu}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ActionButton
            active={liked}
            onClick={toggleLikeThread}
            icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />}
            label={`${liked ? "Aimé" : "Aimer"} (${thread.nb_likes})`}
            activeColor="text-rose-600"
          />
          <ActionButton
            active={saved}
            onClick={toggleSave}
            icon={<Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />}
            label={saved ? "Sauvegardé" : "Sauvegarder"}
            activeColor="text-primary"
          />
          <ActionButton
            active={false}
            onClick={() => {
              if (!user) {
                toast.info("Connecte-toi pour signaler");
                return;
              }
              setReportOpen(true);
            }}
            icon={<Flag className="h-4 w-4" />}
            label="Signaler"
            activeColor="text-destructive"
          />
        </div>
      </article>

      <section className="mt-8" aria-label="Réponses">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {replies.length} réponse{replies.length > 1 ? "s" : ""}
        </h2>

        {sortedReplies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucune réponse pour l'instant. Soyez le premier à répondre !
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedReplies.map((r) => {
              const rAuthor =
                authors[r.user_id] ?? buildAuthor(r.user_id, null, null, null, 0);
              const rGrade = gradeFor(rAuthor.postCount);
              const isBest = r.est_meilleure_reponse;
              const isLiked = likedReplyIds.has(r.id);
              return (
                <li key={r.id}>
                  <article
                    className={`rounded-xl border bg-card p-4 sm:p-5 ${
                      isBest ? "border-emerald-300 ring-1 ring-emerald-200" : "border-border"
                    }`}
                  >
                    {isBest && (
                      <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Meilleure réponse
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Avatar name={rAuthor.name} color={rAuthor.avatarColor} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">
                          {rAuthor.name}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            · {rGrade.emoji} {rGrade.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(r.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {r.contenu}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleLikeReply(r)}
                        aria-label="Aimer la réponse"
                        className={`inline-flex items-center gap-1 transition-colors ${
                          isLiked
                            ? "text-rose-600"
                            : "text-muted-foreground hover:text-rose-600"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                        {r.nb_likes}
                      </button>
                      {isOwner && !isBest && (
                        <button
                          type="button"
                          onClick={() => markBest(r)}
                          className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Marquer comme meilleure
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-label="Écrire une réponse">
        {user ? (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <label htmlFor="reply" className="mb-2 block text-sm font-medium">
              Votre réponse
            </label>
            <textarea
              id="reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Écrire une réponse..."
              maxLength={2000}
              className="w-full resize-none rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{draft.length}/2000</span>
              <button
                type="button"
                onClick={submitReply}
                disabled={!draft.trim() || posting}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#622599" }}
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publier la réponse
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <Link
              to="/login"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#622599" }}
            >
              Connectez-vous pour répondre →
            </Link>
          </div>
        )}
      </section>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler la discussion</DialogTitle>
            <DialogDescription>
              Décrivez brièvement le problème. Les modérateurs examineront le signalement.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Ex : contenu inapproprié, spam, propos déplacés..."
            className="w-full resize-none rounded-[10px] border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={submitReport}
              className="inline-flex h-10 items-center justify-center rounded-[10px] bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:opacity-90"
            >
              Envoyer le signalement
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ActionButton({
  active,
  onClick,
  icon,
  label,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted ${
        active ? activeColor : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
