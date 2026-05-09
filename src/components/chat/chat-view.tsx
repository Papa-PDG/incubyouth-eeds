import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Send, ThumbsUp, ThumbsDown, Copy, Share2, Menu, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { streamChat } from "@/lib/chat-stream";
import { ConversationSidebar } from "./conversation-sidebar";
import { toast } from "sonner";

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

  // Load conversation
  useEffect(() => {
    setMessages([]);
    setTitre("Nouvelle conversation");
    if (!conversationId) return;
    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("titre")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv) setTitre(conv.titre);
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at, feedback")
        .eq("conversation_id", conversationId)
        .order("created_at");
      setMessages((data ?? []) as Msg[]);
    })();
  }, [conversationId]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("prenom")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setProfile(data));
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
    if (!text.trim() || streaming || !user) return;
    setInput("");
    setStreaming(true);
    lastUserMsgRef.current = text;

    let convId = conversationId;
    // Create conversation if first message
    if (!convId) {
      const titreAuto = text.split(/\s+/).slice(0, 5).join(" ").slice(0, 60);
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, titre: titreAuto })
        .select("id, titre")
        .single();
      if (error || !data) {
        toast.error("Impossible de créer la conversation");
        setStreaming(false);
        return;
      }
      convId = data.id;
      setTitre(data.titre);
      navigate({ to: "/chat/$conversationId", params: { conversationId: convId } });
    }

    const userMsg: Msg = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    // Persist user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: text,
    });

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
      },
      onDone: async () => {
        if (assistantText) {
          const { data } = await supabase
            .from("messages")
            .insert({
              conversation_id: convId!,
              role: "assistant",
              content: assistantText,
            })
            .select("id")
            .single();
          if (data) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], id: data.id };
              return copy;
            });
          }
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId!);
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

  const setFeedback = async (idx: number, value: "positive" | "negative") => {
    const msg = messages[idx];
    if (!msg.id) return;
    const newVal = msg.feedback === value ? null : value;
    await supabase.from("messages").update({ feedback: newVal }).eq("id", msg.id);
    setMessages((m) => m.map((x, i) => (i === idx ? { ...x, feedback: newVal } : x)));
  };

  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copié");
  };

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
            <div className="flex items-end gap-2 rounded-xl border border-[#E5E7EB] bg-white p-2 focus-within:border-[#622599]">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Pose ta question à Incub'Youth..."
                className="min-h-0 flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
              />
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-9 w-9 rounded-lg bg-[#622599] hover:bg-[#4f1d7a] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
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

function MessageBubble({
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
      <div className="flex flex-col items-end">
        <div className="max-w-[75%] rounded-[18px_18px_4px_18px] bg-[#622599] px-4 py-2.5 text-white">
          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
        </div>
        {time && <span className="mt-1 text-[10px] text-muted-foreground">{time}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#622599] text-xs font-bold text-white">
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
              className={`ml-2 rounded p-1 hover:bg-muted ${msg.feedback === "positive" ? "text-[#622599]" : ""}`}
              aria-label="Utile"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onFeedback("negative")}
              className={`rounded p-1 hover:bg-muted ${msg.feedback === "negative" ? "text-destructive" : ""}`}
              aria-label="Pas utile"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            <button onClick={onCopy} className="rounded p-1 hover:bg-muted" aria-label="Copier">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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