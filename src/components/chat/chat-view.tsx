import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Send, ThumbsUp, ThumbsDown, Copy, Check, Share2, Menu, RefreshCw, BookOpen, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { streamChat } from "@/lib/chat-stream";
import { ConversationSidebar } from "./conversation-sidebar";
import { toast } from "sonner";
import { sanitizeUserText, MAX_CHAT_MESSAGE_LENGTH } from "@/lib/sanitize";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  feedback?: "positive" | "negative" | null;
};

const SUGGESTIONS = [
  "C'est quoi le scoutisme ?",
  "Quels sont mes droits ?",
  "Comment protéger l'environnement ?",
  "Conseils santé pour scouts",
];

export function ChatView({ conversationId }: { conversationId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [titre, setTitre] = useState("Nouvelle conversation");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [profile, setProfile] = useState<{ prenom: string | null } | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMsgRef = useRef<string>("");
  const justCreatedIdRef = useRef<string | null>(null);

  // Read pre-filled prompt from camp page (or other entry points)
  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("chat-prefill");
      if (pre) {
        setInput(pre);
        sessionStorage.removeItem("chat-prefill");
      }
    } catch {}
  }, []);

  // Load conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setTitre("Nouvelle conversation");
      return;
    }
    // Skip reload if we just created this conversation locally
    // (messages are already in state and a stream may be in progress).
    if (justCreatedIdRef.current === conversationId) {
      justCreatedIdRef.current = null;
      return;
    }
    setMessages([]);
    setTitre("Nouvelle conversation");
    (async () => {
      try {
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .select("titre")
          .eq("id", conversationId)
          .maybeSingle();
        if (convErr) throw convErr;
        if (conv) setTitre(conv.titre);
        const { data, error: msgErr } = await supabase
          .from("messages")
          .select("id, role, content, created_at, feedback")
          .eq("conversation_id", conversationId)
          .order("created_at")
          .limit(100);
        if (msgErr) throw msgErr;
        setMessages((data ?? []) as Msg[]);
      } catch (e) {
        console.error("Chargement conversation:", e);
        toast.error("Impossible de charger cette discussion.");
      }
    })();
  }, [conversationId]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("prenom")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error("Chargement profil:", error);
            return;
          }
          setProfile(data);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 5 * 24) + "px";
  }, [input]);

  const send = async (text: string) => {
    if (streaming) return;
    if (!user) {
      toast.error("Tu dois être connecté pour discuter.");
      navigate({ to: "/login" });
      return;
    }
    const safe = sanitizeUserText(text);
    if (!safe) {
      toast.error("Message vide ou invalide.");
      return;
    }
    setInput("");
    setStreaming(true);
    lastUserMsgRef.current = safe;
    text = safe;

    let convId = conversationId;
    // Create conversation if first message
    if (!convId) {
      const titreAuto = text.split(/\s+/).slice(0, 5).join(" ").slice(0, 60);
      let data: { id: string; titre: string } | null = null;
      try {
        const res = await supabase
          .from("conversations")
          .insert({ user_id: user.id, titre: titreAuto })
          .select("id, titre")
          .single();
        if (res.error) throw res.error;
        data = res.data;
      } catch (e) {
        console.error("Création conversation:", e);
        toast.error("Impossible de créer la conversation. Réessaie.");
        setStreaming(false);
        return;
      }
      if (!data) {
        toast.error("Impossible de créer la conversation. Réessaie.");
        setStreaming(false);
        return;
      }
      convId = data.id;
      setTitre(data.titre);
      justCreatedIdRef.current = convId;
      navigate({ to: "/chat/$conversationId", params: { conversationId: convId } });
    }

    const userMsg: Msg = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    // Persist user message
    try {
      const { error: insErr } = await supabase.from("messages").insert({
        conversation_id: convId,
        role: "user",
        content: text,
      });
      if (insErr) throw insErr;
    } catch (e) {
      console.error("Enregistrement du message:", e);
      toast.error("Ton message n'a pas pu être enregistré, mais la réponse continue.");
    }

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    let assistantText = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    await streamChat({
      messages: history,
      onDelta: (chunk) => {
        assistantText += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: assistantText };
          return copy;
        });
      },
      onError: (msg) => {
        toast.error(msg);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `__ERROR__${msg}` };
          return copy;
        });
        setStreaming(false);
      },
      onDone: async () => {
        if (assistantText) {
          try {
            const { data, error: insErr } = await supabase
              .from("messages")
              .insert({
                conversation_id: convId!,
                role: "assistant",
                content: assistantText,
              })
              .select("id")
              .single();
            if (insErr) throw insErr;
            if (data) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], id: data.id };
                return copy;
              });
            }
            const { error: updErr } = await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", convId!);
            if (updErr) throw updErr;
          } catch (e) {
            console.error("Sauvegarde de la réponse:", e);
            toast.warning("La réponse n'a pas pu être archivée.");
          }
        }
        setSidebarKey((k) => k + 1);
        setStreaming(false);
      },
    });
  };

  const retry = () => {
    if (streaming || !lastUserMsgRef.current) return;
    // Retire la dernière paire user+erreur pour éviter le doublon
    setMessages((m) => {
      const copy = [...m];
      if (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
      if (copy.length && copy[copy.length - 1].role === "user") copy.pop();
      return copy;
    });
    send(lastUserMsgRef.current);
  };

  const setFeedback = useCallback(async (idx: number, value: "positive" | "negative") => {
    const msg = messages[idx];
    if (!msg.id) return;
    const newVal = msg.feedback === value ? null : value;
    try {
      const { error } = await supabase
        .from("messages")
        .update({ feedback: newVal })
        .eq("id", msg.id);
      if (error) throw error;
      setMessages((m) => m.map((x, i) => (i === idx ? { ...x, feedback: newVal } : x)));
    } catch (e) {
      console.error("Feedback:", e);
      toast.error("Impossible d'enregistrer ton avis.");
    }
  }, [messages]);

  const copyText = useCallback((t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copié");
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">
      <div className="hidden w-[260px] flex-none md:block">
        <ConversationSidebar activeId={conversationId} refreshKey={sidebarKey} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-[#E5E7EB] px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <ConversationSidebar
                activeId={conversationId}
                refreshKey={sidebarKey}
                onPick={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <h1 className="flex-1 truncate font-semibold">{titre}</h1>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Share2 className="mr-1.5 h-4 w-4" /> Partager
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
          {messages.length === 0 ? (
            <EmptyState prenom={profile?.prenom ?? ""} onPick={send} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                  onFeedback={(v) => setFeedback(i, v)}
                  onCopy={() => copyText(m.content)}
                  onRetry={
                    i === messages.length - 1 &&
                    m.role === "assistant" &&
                    m.content.startsWith("__ERROR__")
                      ? retry
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-[#E5E7EB] bg-white p-2 transition-all duration-200 focus-within:border-[#622599] focus-within:ring-2 focus-within:ring-[#622599]/15">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))}
                onKeyDown={onKey}
                rows={1}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
                placeholder="Pose ta question à Incub'Youth..."
                className="min-h-0 flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
              />
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                size="icon"
                className="btn-bounce h-9 w-9 rounded-lg bg-[#622599] hover:bg-[#4f1d7a] disabled:opacity-40"
              >
                {streaming ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Incub'Youth peut faire des erreurs. Vérifie les informations importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ prenom, onPick }: { prenom: string; onPick: (s: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#622599] text-2xl font-bold text-white">
        IY
      </div>
      <h2 className="text-2xl font-bold">Bonjour{prenom ? `, ${prenom}` : ""} !</h2>
      <p className="mt-2 text-muted-foreground">
        Je suis Incub'Youth, ton assistant scout. Comment puis-je t'aider ?
      </p>
      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-left text-sm text-foreground transition-colors hover:border-[#622599] hover:bg-[#FAF5FF]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  msg,
  streaming,
  onFeedback,
  onCopy,
  onRetry,
}: {
  msg: Msg;
  streaming: boolean;
  onFeedback: (v: "positive" | "negative") => void;
  onCopy: () => void;
  onRetry?: () => void;
}) {
  const isUser = msg.role === "user";
  const isError = msg.content.startsWith("__ERROR__");
  const time = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";

  if (isUser) {
    return (
      <div className="anim-scale-in flex flex-col items-end">
        <div className="max-w-[75%] rounded-[18px_18px_4px_18px] bg-[#622599] px-4 py-2.5 text-white shadow-sm">
          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
        </div>
        {time && <span className="mt-1 text-[10px] text-muted-foreground">{time}</span>}
      </div>
    );
  }

  return (
    <div className="anim-fade-up flex items-start gap-2">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#622599] text-xs font-bold text-white anim-pop">
        IY
      </div>
      <div className="flex max-w-[80%] flex-col">
        {isError ? (
          <div className="rounded-[18px_18px_18px_4px] border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <p>{msg.content.replace("__ERROR__", "")}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-white px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Réessayer
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-[18px_18px_18px_4px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-sm text-[#1F2937]">
            {msg.content === "" && streaming ? (
              <TypingDots />
            ) : (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
        {!isError && msg.content && !streaming && (
          <div className="mt-1 flex items-center gap-1 text-muted-foreground">
            {time && <span className="text-[10px]">{time}</span>}
            <button
              onClick={() => onFeedback("positive")}
              className={`ml-2 rounded p-1 transition-transform hover:bg-muted active:scale-90 ${msg.feedback === "positive" ? "text-[#622599] anim-pop" : ""}`}
              aria-label="Utile"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onFeedback("negative")}
              className={`rounded p-1 transition-transform hover:bg-muted active:scale-90 ${msg.feedback === "negative" ? "text-destructive anim-pop" : ""}`}
              aria-label="Pas utile"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            <CopyButton onCopy={onCopy} />
          </div>
        )}
        {!isError && msg.content && !streaming && mentionsEedsDoc(msg.content) && (
          <Link
            to="/bibliotheque"
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-[#622599]/30 bg-[#F3E8FF] px-2.5 py-1.5 text-xs font-semibold text-[#622599] hover:bg-[#622599] hover:text-white"
          >
            <BookOpen className="h-3.5 w-3.5" /> Voir dans la bibliothèque
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
});

const EEDS_DOC_KEYWORDS = [
  "règlement",
  "reglement",
  "chant",
  "hymne",
  "programme louveteaux",
  "programme éclaireurs",
  "programme eclaireurs",
  "programme routiers",
  "code de conduite",
  "guide du chef",
  "premiers secours",
  "nœuds scouts",
  "noeuds scouts",
  "convention onu",
  "droits de l'enfant",
  "droits de l enfant",
  "bibliothèque",
  "bibliotheque",
];

function mentionsEedsDoc(text: string): boolean {
  const t = text.toLowerCase();
  return EEDS_DOC_KEYWORDS.some((k) => t.includes(k));
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-2 w-2 animate-bounce rounded-full bg-[#622599]"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1 transition-transform hover:bg-muted active:scale-90"
      aria-label="Copier"
    >
      {copied ? (
        <Check className="h-3 w-3 text-[#16A34A] anim-pop" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}