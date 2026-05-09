import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { streamChat } from "@/lib/chat-stream";

export const Route = createFileRoute("/admin/config")({
  component: AdminConfig,
});

const DEFAULT_PROMPT =
  "Tu es Incub'Youth, un assistant éducatif et bienveillant pour les Éclaireuses et Éclaireurs du Sénégal.";
const DEFAULT_WELCOME =
  "Bonjour ! Je suis Incub'Youth, ton assistant scout. Comment puis-je t'aider aujourd'hui ?";
const ALL_THEMES = ["scoutisme", "droits", "environnement", "sante", "education", "citoyennete"];
const THEME_LABELS: Record<string, string> = {
  scoutisme: "Scoutisme",
  droits: "Droits",
  environnement: "Environnement",
  sante: "Santé",
  education: "Éducation",
  citoyennete: "Citoyenneté",
};

function AdminConfig() {
  const [id, setId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [themes, setThemes] = useState<string[]>(["scoutisme", "education", "citoyennete"]);
  const [strict, setStrict] = useState(true);
  const [ton, setTon] = useState<"educatif" | "amical" | "formel">("educatif");
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config_bot").select("*").limit(1).maybeSingle();
      if (data) {
        setId(data.id);
        setPrompt(data.prompt_system);
        setThemes(data.themes_actifs);
        setStrict(data.mode_strict);
        setTon((data.ton as typeof ton) || "educatif");
        setWelcome(data.message_bienvenue);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      prompt_system: prompt,
      themes_actifs: themes,
      mode_strict: strict,
      ton,
      message_bienvenue: welcome,
      updated_at: new Date().toISOString(),
    };
    const { error } = id
      ? await supabase.from("config_bot").update(payload).eq("id", id)
      : await supabase.from("config_bot").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuration sauvegardée");
  };

  const reset = () => {
    setPrompt(DEFAULT_PROMPT);
    toast.info("Prompt réinitialisé (non sauvegardé)");
  };

  const toggleTheme = (t: string) => {
    setThemes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration du bot</h1>
        <p className="text-sm text-muted-foreground">Personnalise le comportement d'Incub'Youth</p>
      </div>

      <Card title="Prompt système">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[200px] w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Sauvegarder
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Réinitialiser par défaut
          </button>
        </div>
      </Card>

      <Card title="Thèmes autorisés">
        <div className="space-y-2">
          {ALL_THEMES.map((t) => (
            <label key={t} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm font-medium">{THEME_LABELS[t]}</span>
              <Toggle checked={themes.includes(t)} onChange={() => toggleTheme(t)} />
            </label>
          ))}
          <label className="mt-3 flex items-center justify-between rounded-md border border-[#622599]/30 bg-[#F3E8FF]/50 px-3 py-2">
            <span className="text-sm font-medium">Mode strict — refuser les questions hors thèmes</span>
            <Toggle checked={strict} onChange={() => setStrict((s) => !s)} />
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Sauvegarder
          </button>
        </div>
      </Card>

      <Card title="Ton de réponse">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["educatif", "amical", "formel"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                ton === t ? "border-[#622599] bg-[#F3E8FF]" : "border-border bg-white hover:border-muted-foreground/30"
              }`}
            >
              <input
                type="radio"
                name="ton"
                checked={ton === t}
                onChange={() => setTon(t)}
                className="sr-only"
              />
              <div className="text-2xl">{t === "educatif" ? "📘" : t === "amical" ? "🤝" : "🎓"}</div>
              <div className="mt-2 text-sm font-semibold capitalize">{t}</div>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Sauvegarder
          </button>
        </div>
      </Card>

      <Card title="Message de bienvenue">
        <input
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Aperçu</span>
          <div className="mt-1 rounded-2xl bg-white p-3 shadow-sm">{welcome}</div>
        </div>
        <div className="mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            Sauvegarder
          </button>
        </div>
      </Card>

      <TestBot prompt={prompt} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-[#622599]" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

type TestMsg = { role: "user" | "assistant"; content: string };

function TestBot({ prompt }: { prompt: string }) {
  const [msgs, setMsgs] = useState<TestMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const next: TestMsg[] = [...msgs, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMsgs(next);
    setSending(true);
    await streamChat({
      messages: [{ role: "user", content: `[Prompt système actuel: ${prompt}]\n\n${text}` }],
      onDelta: (c) => {
        setMsgs((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + c };
          return copy;
        });
      },
      onDone: () => setSending(false),
      onError: (err) => {
        toast.error(err);
        setSending(false);
      },
    });
  };

  return (
    <Card title="Test du bot">
      <div className="mb-3 flex max-h-80 min-h-[200px] flex-col gap-2 overflow-y-auto rounded-lg bg-muted p-3">
        {msgs.length === 0 && (
          <p className="m-auto text-sm text-muted-foreground">Pose une question pour tester la configuration.</p>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-[#622599] text-white" : "mr-auto bg-white"
            }`}
          >
            {m.content || (sending && i === msgs.length - 1 ? "…" : "")}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Pose une question test…"
          className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </Card>
  );
}