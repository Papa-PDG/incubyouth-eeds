import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Tent,
  Sparkles,
  Loader2,
  Package,
  Calendar,
  Soup,
  ShieldCheck,
  Check,
  Phone,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ArrowRight,
  History,
  Trash2,
  FileDown,
} from "lucide-react";
import { ProtectedRoute } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportCampPdf } from "@/lib/camp-pdf";

export const Route = createFileRoute("/camp")({
  head: () => ({
    meta: [
      { title: "Planificateur de camp — Incub'Youth" },
      {
        name: "description",
        content:
          "Génère automatiquement programme, matériel, recettes et checklist sécurité pour ton camp scout sénégalais.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <CampPage />
    </ProtectedRoute>
  ),
});

const DUREES = ["3", "5", "7", "10", "14"] as const;
const THEMES = [
  "Nature & Environnement",
  "Citoyenneté & Droits",
  "Aventure & Survie",
  "Culture sénégalaise",
  "Santé & Bien-être",
  "Scoutisme & Technique",
] as const;
const EFFECTIFS = ["10-20", "20-40", "40-60", "60+"] as const;
const AGES = [
  "Louveteaux (8-11 ans)",
  "Éclaireurs (12-16 ans)",
  "Routiers (17-21 ans)",
  "Mixte",
] as const;
const REGIONS = [
  "Dakar","Saint-Louis","Thiès","Diourbel","Louga","Fatick","Kaolack",
  "Tambacounda","Kédougou","Kolda","Sédhiou","Ziguinchor","Matam",
] as const;

type CampPlan = {
  resume: string;
  materiel: Record<string, string[]>;
  programme: { jour: string; activites: { heure: string; activite: string; duree: string; type: string }[] }[];
  recettes: { nom: string; repas: string; temps: string; ingredients: string[]; etapes: string[] }[];
  securite: { checklist: string[]; contacts_urgence: string[]; regles_camp: string[] };
  conseils: string[];
};

const PROGRESS_STEPS = [
  "Analyse du thème...",
  "Création du programme...",
  "Sélection des recettes...",
  "Vérification sécurité...",
];

const ACTIVITY_BADGE: Record<string, string> = {
  installation: "bg-gray-100 text-gray-700",
  atelier: "bg-purple-100 text-purple-700",
  sport: "bg-green-100 text-green-700",
  repas: "bg-amber-100 text-amber-700",
  cérémonie: "bg-blue-100 text-blue-700",
  ceremonie: "bg-blue-100 text-blue-700",
  veillée: "bg-pink-100 text-pink-700",
  veillee: "bg-pink-100 text-pink-700",
};

const MATERIEL_LABELS: Record<string, { label: string; icon: string }> = {
  hebergement: { label: "Hébergement & Couchage", icon: "🛖" },
  cuisine: { label: "Cuisine & Alimentation", icon: "🍲" },
  activites: { label: "Activités & Animation", icon: "🎯" },
  sante: { label: "Santé & Premiers secours", icon: "⛑️" },
  hygiene: { label: "Hygiène & Nettoyage", icon: "🧼" },
};

type SavedCamp = {
  id: string;
  nom_camp: string;
  duree: number;
  theme: string;
  effectif: string;
  age: string;
  region: string;
  plan_json: CampPlan;
  created_at: string;
};

function CampPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<{
    nomCamp: string;
    duree: string;
    theme: string;
    effectif: string;
    age: string;
    region: string;
    besoinsSpeciaux: string;
  }>({
    nomCamp: "",
    duree: "5",
    theme: THEMES[0] as string,
    effectif: "20-40",
    age: AGES[1] as string,
    region: REGIONS[0] as string,
    besoinsSpeciaux: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [nomError, setNomError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [result, setResult] = useState<CampPlan | null>(null);
  const [activeTab, setActiveTab] = useState<"materiel" | "programme" | "recettes" | "securite">("materiel");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [savedCamps, setSavedCamps] = useState<SavedCamp[]>([]);

  // Animated progress while generating
  useEffect(() => {
    if (!isGenerating) return;
    setProgressIdx(0);
    const i = setInterval(() => {
      setProgressIdx((p) => (p + 1) % PROGRESS_STEPS.length);
    }, 800);
    return () => clearInterval(i);
  }, [isGenerating]);

  // Load history
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("camps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setSavedCamps(((data ?? []) as unknown) as SavedCamp[]);
    })();
  }, [user?.id]);

  const totals = useMemo(() => {
    if (!result) return { total: 0, done: 0 };
    const ids: string[] = [];
    Object.entries(result.materiel).forEach(([k, items]) =>
      items.forEach((_, i) => ids.push(`mat-${k}-${i}`)),
    );
    result.securite.checklist.forEach((_, i) => ids.push(`sec-${i}`));
    const done = ids.filter((id) => checkedItems[id]).length;
    return { total: ids.length, done };
  }, [result, checkedItems]);

  const generate = async () => {
    setError(null);
    if (!form.nomCamp.trim()) {
      setNomError(true);
      toast.error("Donne un nom à ton camp");
      return;
    }
    setNomError(false);
    setIsGenerating(true);
    setResult(null);
    setCheckedItems({});

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-camp",
        { body: form },
      );
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      if (!data?.plan) throw new Error("Réponse vide");
      setResult(data.plan as CampPlan);
      toast.success("Plan de camp généré !");
    } catch (e) {
      const msg = (e as Error).message || "Erreur inconnue";
      setError(msg);
      toast.error("Échec de la génération", { description: msg });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItem = (id: string) =>
    setCheckedItems((c) => ({ ...c, [id]: !c[id] }));

  const saveCamp = async () => {
    if (!result || !user) return;
    const { data, error: insErr } = await supabase
      .from("camps")
      .insert({
        user_id: user.id,
        nom_camp: form.nomCamp,
        duree: parseInt(form.duree, 10),
        theme: form.theme,
        effectif: form.effectif,
        age: form.age,
        region: form.region,
        plan_json: result as unknown as never,
      })
      .select()
      .single();
    if (insErr) {
      toast.error("Impossible de sauvegarder", { description: insErr.message });
      return;
    }
    toast.success("Camp sauvegardé");
    setSavedCamps((s) => [(data as unknown) as SavedCamp, ...s]);
  };

  const reload = (c: SavedCamp) => {
    setForm({
      nomCamp: c.nom_camp,
      duree: String(c.duree),
      theme: c.theme,
      effectif: c.effectif,
      age: c.age,
      region: c.region,
      besoinsSpeciaux: "",
    });
    setResult(c.plan_json);
    setCheckedItems({});
    setActiveTab("materiel");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCamp = async (id: string) => {
    const { error: delErr } = await supabase.from("camps").delete().eq("id", id);
    if (delErr) {
      toast.error("Suppression impossible");
      return;
    }
    setSavedCamps((s) => s.filter((c) => c.id !== id));
  };

  const sendToChatWithPrompt = (prompt: string) => {
    try {
      sessionStorage.setItem("chat-prefill", prompt);
    } catch {}
    navigate({ to: "/chat" });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF5FF] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-[#622599]">
            <Tent className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Planificateur de camp
            </h1>
          </div>
          <p className="mt-2 text-base text-muted-foreground">
            Remplis les informations — Incub'Youth génère tout automatiquement
          </p>
        </div>

        {/* FORM */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Label htmlFor="nomCamp">Nom du camp *</Label>
              <Input
                id="nomCamp"
                value={form.nomCamp}
                onChange={(e) => {
                  setForm({ ...form, nomCamp: e.target.value });
                  if (e.target.value.trim()) setNomError(false);
                }}
                placeholder="Ex: Camp Teranga 2024"
                className={cn("mt-1.5", nomError && "border-red-500 focus-visible:ring-red-500")}
              />
              {nomError && (
                <p className="mt-1 text-xs text-red-600">Le nom du camp est requis.</p>
              )}
            </div>

            <FieldSelect
              label="Durée"
              value={form.duree}
              onChange={(v) => setForm({ ...form, duree: v })}
              options={DUREES.map((d) => ({ value: d, label: `${d} jours` }))}
            />
            <FieldSelect
              label="Thème principal"
              value={form.theme}
              onChange={(v) => setForm({ ...form, theme: v })}
              options={THEMES.map((t) => ({ value: t, label: t }))}
            />
            <FieldSelect
              label="Nombre de scouts"
              value={form.effectif}
              onChange={(v) => setForm({ ...form, effectif: v })}
              options={EFFECTIFS.map((e) => ({ value: e, label: e }))}
            />
            <FieldSelect
              label="Tranche d'âge"
              value={form.age}
              onChange={(v) => setForm({ ...form, age: v })}
              options={AGES.map((a) => ({ value: a, label: a }))}
            />
            <FieldSelect
              label="Région du Sénégal"
              value={form.region}
              onChange={(v) => setForm({ ...form, region: v })}
              options={REGIONS.map((r) => ({ value: r, label: r }))}
            />

            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="besoins">Besoins spéciaux (optionnel)</Label>
              <Textarea
                id="besoins"
                value={form.besoinsSpeciaux}
                onChange={(e) => setForm({ ...form, besoinsSpeciaux: e.target.value })}
                placeholder="Allergies, contraintes religieuses, équipement manquant..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={isGenerating}
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#622599] px-6 text-[16px] font-semibold text-white transition-colors hover:bg-[#4f1d7a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Incub'Youth prépare ton camp... · {PROGRESS_STEPS[progressIdx]}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Générer mon plan de camp avec Incub'Youth
              </>
            )}
          </button>
        </div>

        {/* ERROR */}
        {error && !isGenerating && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                Incub'Youth n'a pas pu générer le plan.
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button onClick={generate} className="bg-[#622599] hover:bg-[#4f1d7a]">
              <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
            </Button>
          </div>
        )}

        {/* SKELETONS */}
        {isGenerating && <SkeletonResults />}

        {/* RESULTS */}
        {result && !isGenerating && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{form.nomCamp}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge>{form.duree} jours</Badge>
                    <Badge variant="muted">{form.theme}</Badge>
                    <Badge variant="muted">{form.effectif} scouts</Badge>
                    <Badge variant="muted">{form.region}</Badge>
                    <Badge variant="muted">{form.age}</Badge>
                  </div>
                </div>
                <Button
                  onClick={saveCamp}
                  className="bg-[#622599] hover:bg-[#4f1d7a]"
                >
                  <Save className="mr-2 h-4 w-4" /> Sauvegarder ce plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportCampPdf(
                      {
                        nomCamp: form.nomCamp,
                        duree: form.duree,
                        theme: form.theme,
                        effectif: form.effectif,
                        age: form.age,
                        region: form.region,
                      },
                      result,
                      "all",
                    )
                  }
                  className="border-[#622599] text-[#622599] hover:bg-[#F3E8FF] hover:text-[#622599]"
                >
                  <FileDown className="mr-2 h-4 w-4" /> Exporter en PDF
                </Button>
              </div>
              <p className="mt-4 italic text-muted-foreground">{result.resume}</p>

              {totals.total > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Préparation</span>
                    <span>
                      {totals.done} / {totals.total} éléments cochés
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3E8FF]">
                    <div
                      className="h-full bg-[#622599] transition-all"
                      style={{
                        width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TABS */}
            <div className="rounded-2xl border border-[#E5E7EB] bg-white">
              <div className="flex overflow-x-auto border-b border-[#E5E7EB]">
                {([
                  { id: "materiel", label: "Matériel", Icon: Package },
                  { id: "programme", label: "Programme", Icon: Calendar },
                  { id: "recettes", label: "Recettes", Icon: Soup },
                  { id: "securite", label: "Sécurité", Icon: ShieldCheck },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "flex flex-none items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors",
                      activeTab === id
                        ? "border-[#622599] text-[#622599]"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportCampPdf(
                        {
                          nomCamp: form.nomCamp,
                          duree: form.duree,
                          theme: form.theme,
                          effectif: form.effectif,
                          age: form.age,
                          region: form.region,
                        },
                        result,
                        activeTab,
                      )
                    }
                    className="border-[#622599] text-[#622599] hover:bg-[#F3E8FF] hover:text-[#622599]"
                  >
                    <FileDown className="mr-2 h-3.5 w-3.5" /> Exporter cette section en PDF
                  </Button>
                </div>
                {activeTab === "materiel" && (
                  <MaterielTab
                    materiel={result.materiel}
                    checked={checkedItems}
                    onToggle={toggleItem}
                  />
                )}
                {activeTab === "programme" && (
                  <ProgrammeTab programme={result.programme} />
                )}
                {activeTab === "recettes" && (
                  <RecettesTab recettes={result.recettes} effectif={form.effectif} />
                )}
                {activeTab === "securite" && (
                  <SecuriteTab
                    securite={result.securite}
                    checked={checkedItems}
                    onToggle={toggleItem}
                  />
                )}
              </div>
            </div>

            {/* CONSEILS */}
            {result.conseils?.length > 0 && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-[#622599]">
                  Conseils Incub'Youth
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {result.conseils.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-none text-[#622599]" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ACTIONS */}
            <div className="grid gap-3 sm:grid-cols-3">
              <ActionButton
                label="Budget estimé"
                onClick={() =>
                  sendToChatWithPrompt(
                    `Génère un budget détaillé pour ${form.nomCamp} : ${form.duree} jours, ${form.effectif} scouts, région ${form.region}.`,
                  )
                }
              />
              <ActionButton
                label="Lettre aux parents"
                onClick={() =>
                  sendToChatWithPrompt(
                    `Rédige une lettre de demande d'autorisation parentale pour ${form.nomCamp} sur le thème ${form.theme}, ${form.duree} jours, pour des ${form.age}.`,
                  )
                }
              />
              <ActionButton
                label="Chants & animations"
                onClick={() =>
                  sendToChatWithPrompt(
                    `Propose 5 chants scouts et 3 jeux d'animation adaptés au thème ${form.theme} pour des ${form.age}.`,
                  )
                }
              />
            </div>
          </div>
        )}

        {/* HISTORY */}
        {savedCamps.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-[#622599]" />
              <h2 className="text-xl font-semibold">Tes camps précédents</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedCamps.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-5"
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {c.nom_camp}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.theme} · {c.duree} jours · {c.region}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => reload(c)}
                      className="flex-1 bg-[#622599] hover:bg-[#4f1d7a]"
                    >
                      Recharger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCamp(c.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Badge({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variant === "primary"
          ? "bg-[#622599] text-white"
          : "bg-[#F3E8FF] text-[#622599]",
      )}
    >
      {children}
    </span>
  );
}

function CheckItem({
  id,
  text,
  checked,
  onToggle,
  tone = "default",
}: {
  id: string;
  text: string;
  checked: boolean;
  onToggle: (id: string) => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={() => onToggle(id)}
      className="group flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-[#FAF5FF]"
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border-2 transition-colors",
          checked
            ? "border-[#622599] bg-[#622599] text-white"
            : tone === "danger"
              ? "border-red-300"
              : "border-gray-300",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span
        className={cn(
          "text-sm leading-relaxed",
          checked
            ? "text-muted-foreground line-through"
            : tone === "danger"
              ? "text-red-700"
              : "text-foreground",
        )}
      >
        {text}
      </span>
    </button>
  );
}

function MaterielTab({
  materiel,
  checked,
  onToggle,
}: {
  materiel: Record<string, string[]>;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const sections = Object.entries(materiel);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {sections.map(([key, items]) => {
        const meta = MATERIEL_LABELS[key] ?? { label: key, icon: "📦" };
        return (
          <div
            key={key}
            className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span>{meta.icon}</span> {meta.label}
            </h3>
            <div className="space-y-1">
              {items.map((item, i) => {
                const id = `mat-${key}-${i}`;
                return (
                  <CheckItem
                    key={id}
                    id={id}
                    text={item}
                    checked={!!checked[id]}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgrammeTab({
  programme,
}: {
  programme: { jour: string; activites: { heure: string; activite: string; duree: string; type: string }[] }[];
}) {
  return (
    <div className="space-y-5">
      {programme.map((day, di) => (
        <div
          key={di}
          className="overflow-hidden rounded-xl border border-[#E5E7EB]"
        >
          <div className="bg-[#FAF5FF] px-5 py-3">
            <h3 className="text-sm font-semibold text-[#622599]">{day.jour}</h3>
          </div>
          <ul className="divide-y divide-[#F1F1F1]">
            {day.activites.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
              >
                <span className="w-16 flex-none font-mono text-xs font-semibold text-[#622599]">
                  {a.heure}
                </span>
                <span className="flex-1 text-foreground">{a.activite}</span>
                <span className="text-xs text-muted-foreground">{a.duree}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    ACTIVITY_BADGE[a.type?.toLowerCase()] ??
                      "bg-gray-100 text-gray-700",
                  )}
                >
                  {a.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecettesTab({
  recettes,
  effectif,
}: {
  recettes: { nom: string; repas: string; temps: string; ingredients: string[]; etapes: string[] }[];
  effectif: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recettes.map((r, i) => {
        const open = openIdx === i;
        return (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground">{r.nom}</h3>
              <Badge variant="muted">{r.repas}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ⏱ {r.temps} · pour {effectif} scouts
            </p>

            {open && (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase text-[#622599]">
                    Ingrédients
                  </h4>
                  <ul className="list-disc space-y-1 pl-5">
                    {r.ingredients.map((ing, k) => (
                      <li key={k}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase text-[#622599]">
                    Préparation
                  </h4>
                  <ol className="list-decimal space-y-1 pl-5">
                    {r.etapes.map((s, k) => (
                      <li key={k}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <button
              onClick={() => setOpenIdx(open ? null : i)}
              className="mt-4 inline-flex items-center text-sm font-medium text-[#622599] hover:underline"
            >
              {open ? "Masquer la recette" : "Voir la recette complète ↗"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SecuriteTab({
  securite,
  checked,
  onToggle,
}: {
  securite: { checklist: string[]; contacts_urgence: string[]; regles_camp: string[] };
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" /> Checklist obligatoire
        </h3>
        <div className="space-y-1">
          {securite.checklist.map((item, i) => {
            const id = `sec-${i}`;
            return (
              <CheckItem
                key={id}
                id={id}
                text={item}
                checked={!!checked[id]}
                onToggle={onToggle}
                tone="danger"
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
          <Phone className="h-4 w-4" /> Contacts d'urgence
        </h3>
        <ul className="space-y-2 text-sm text-red-900">
          {securite.contacts_urgence.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 flex-none" /> {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Règles du camp
        </h3>
        <ul className="space-y-2 text-sm text-green-900">
          {securite.regles_camp.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none" /> {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between rounded-xl border-2 border-[#622599] bg-white px-5 py-3.5 text-sm font-semibold text-[#622599] transition-colors hover:bg-[#FAF5FF]"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function SkeletonResults() {
  return (
    <div className="mt-8 space-y-4">
      <div className="h-32 animate-pulse rounded-2xl bg-white/60 border border-[#E5E7EB]" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-white/60 border border-[#E5E7EB]"
          />
        ))}
      </div>
    </div>
  );
}