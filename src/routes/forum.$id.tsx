import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Flag,
  Send,
  CheckCircle2,
  MapPin,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  MOCK_THREADS,
  MOCK_REPLIES,
  getCategory,
  gradeFor,
  initialsOf,
  relativeTime,
  type ForumReply,
} from "@/data/forumData";

export const Route = createFileRoute("/forum/$id")({
  head: ({ params }) => {
    const t = MOCK_THREADS.find((x) => x.id === params.id);
    return {
      meta: [
        {
          title: t ? `${t.title} — Forum Incub'Youth` : "Discussion — Forum Incub'Youth",
        },
        {
          name: "description",
          content: t?.content.slice(0, 150) ?? "Discussion du forum scout EEDS.",
        },
      ],
    };
  },
  component: ThreadDetailPage,
});

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
  const thread = useMemo(() => MOCK_THREADS.find((t) => t.id === id), [id]);
  const [replies, setReplies] = useState<ForumReply[]>(
    MOCK_REPLIES.filter((r) => r.threadId === id),
  );
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());

  if (!thread) {
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

  const cat = getCategory(thread.category);
  const grade = gradeFor(thread.author.postCount);

  const sortedReplies = [...replies].sort((a, b) => {
    if (b.helpfulVotes !== a.helpfulVotes) return b.helpfulVotes - a.helpfulVotes;
    return a.createdAt.localeCompare(b.createdAt);
  });
  const bestReply = sortedReplies[0]?.helpfulVotes >= 5 ? sortedReplies[0] : null;

  const submitReply = () => {
    const text = draft.trim();
    if (!text) return;
    if (text.length < 5) {
      toast.error("Votre réponse est trop courte");
      return;
    }
    const meta = (user?.user_metadata ?? {}) as { prenom?: string; nom?: string };
    const name =
      [meta.prenom, meta.nom].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0] ||
      "Scout";
    const r: ForumReply = {
      id: `local-${Date.now()}`,
      threadId: thread.id,
      author: {
        id: user!.id,
        name,
        city: "Sénégal",
        postCount: 1,
        avatarColor: "#622599",
      },
      content: text,
      createdAt: new Date().toISOString(),
      likes: 0,
      helpfulVotes: 0,
    };
    setReplies((arr) => [...arr, r]);
    setDraft("");
    toast.success("Réponse publiée ! 🎉");
  };

  const toggleReplyLike = (rid: string) => {
    if (!user) {
      toast.info("Connecte-toi pour aimer une réponse");
      return;
    }
    setLikedReplies((s) => {
      const n = new Set(s);
      const liked = n.has(rid);
      if (liked) n.delete(rid);
      else n.add(rid);
      setReplies((arr) =>
        arr.map((r) =>
          r.id === rid ? { ...r, likes: r.likes + (liked ? -1 : 1) } : r,
        ),
      );
      return n;
    });
  };

  const toggleHelpful = (rid: string) => {
    if (!user) {
      toast.info("Connecte-toi pour voter");
      return;
    }
    setHelpfulVotes((s) => {
      const n = new Set(s);
      const voted = n.has(rid);
      if (voted) n.delete(rid);
      else n.add(rid);
      setReplies((arr) =>
        arr.map((r) =>
          r.id === rid
            ? { ...r, helpfulVotes: r.helpfulVotes + (voted ? -1 : 1) }
            : r,
        ),
      );
      return n;
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au forum
      </Link>

      {/* Thread header */}
      <article className="mt-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.bg} ${cat.text}`}
          >
            {cat.emoji} {cat.label}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {thread.title}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <Avatar name={thread.author.name} color={thread.author.avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {thread.author.name}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {grade.emoji} {grade.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {thread.author.city} · {relativeTime(thread.createdAt)}
            </div>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
          {thread.content}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ActionButton
            active={liked}
            onClick={() => {
              if (!user) {
                toast.info("Connecte-toi pour aimer");
                return;
              }
              setLiked((v) => !v);
            }}
            icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />}
            label={liked ? "Aimé" : "Aimer"}
            activeColor="text-rose-600"
          />
          <ActionButton
            active={saved}
            onClick={() => {
              if (!user) {
                toast.info("Connecte-toi pour sauvegarder");
                return;
              }
              setSaved((v) => !v);
              toast.success(saved ? "Retiré des favoris" : "Sauvegardé");
            }}
            icon={<Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />}
            label="Sauvegarder"
            activeColor="text-primary"
          />
          <ActionButton
            active={false}
            onClick={() => toast.success("Signalement envoyé aux modérateurs")}
            icon={<Flag className="h-4 w-4" />}
            label="Signaler"
            activeColor="text-destructive"
          />
        </div>
      </article>

      {/* Replies */}
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
              const rGrade = gradeFor(r.author.postCount);
              const isBest = bestReply?.id === r.id;
              const isLiked = likedReplies.has(r.id);
              const isHelpful = helpfulVotes.has(r.id);
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
                      <Avatar name={r.author.name} color={r.author.avatarColor} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">
                          {r.author.name}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            · {rGrade.emoji} {rGrade.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relativeTime(r.createdAt)}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {r.content}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleReplyLike(r.id)}
                        aria-label="Aimer la réponse"
                        className={`inline-flex items-center gap-1 transition-colors ${
                          isLiked ? "text-rose-600" : "text-muted-foreground hover:text-rose-600"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                        {r.likes}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHelpful(r.id)}
                        aria-label="Marquer comme utile"
                        className={`inline-flex items-center gap-1 transition-colors ${
                          isHelpful
                            ? "text-emerald-700"
                            : "text-muted-foreground hover:text-emerald-700"
                        }`}
                      >
                        <ThumbsUp className={`h-4 w-4 ${isHelpful ? "fill-current" : ""}`} />
                        {r.helpfulVotes} utile{r.helpfulVotes > 1 ? "s" : ""}
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Reply form */}
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
                disabled={!draft.trim()}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#622599" }}
              >
                <Send className="h-4 w-4" /> Publier la réponse
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline"
                style={{ color: "#622599" }}
              >
                Connectez-vous pour répondre →
              </Link>
            </p>
          </div>
        )}
      </section>
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
