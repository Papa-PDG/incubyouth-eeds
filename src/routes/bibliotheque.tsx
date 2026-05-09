import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Star,
  Eye,
  Download,
  Gavel,
  Calendar,
  Wrench,
  Music,
  Heart,
  Scale,
  X,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ProtectedRoute } from "@/components/route-guards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/bibliotheque")({
  head: () => ({
    meta: [
      { title: "Bibliothèque EEDS — Incub'Youth" },
      {
        name: "description",
        content:
          "Tous les documents officiels EEDS : règlements, programmes, techniques, chants, santé et droits de l'enfant.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <BiblioPage />
    </ProtectedRoute>
  ),
});

type Ressource = {
  id: string;
  titre: string;
  description: string | null;
  categorie: string;
  fichier_url: string | null;
  couverture_url: string | null;
  nb_pages: number;
  nb_telechargements: number;
  taille_mo: number;
  annee: number;
  est_nouveau: boolean;
  est_populaire: boolean;
  tags: string[] | null;
};

const CATEGORIES = [
  { key: "all", label: "Tous", Icon: BookOpen, bg: "#F3E8FF", fg: "#622599" },
  { key: "reglements", label: "Règlements", Icon: Gavel, bg: "#EEEDFE", fg: "#3C3489" },
  { key: "programmes", label: "Programmes", Icon: Calendar, bg: "#EAF3DE", fg: "#27500A" },
  { key: "techniques", label: "Techniques scouts", Icon: Wrench, bg: "#FAEEDA", fg: "#633806" },
  { key: "chants", label: "Chants", Icon: Music, bg: "#FBEAF0", fg: "#72243E" },
  { key: "sante", label: "Santé & Bien-être", Icon: Heart, bg: "#E1F5EE", fg: "#085041" },
  { key: "droits", label: "Droits de l'enfant", Icon: Scale, bg: "#E6F1FB", fg: "#0C447C" },
] as const;

function catMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}

function BiblioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "alpha" | "popular">("recent");
  const [favoris, setFavoris] = useState<Set<string>>(new Set());
  const [selectedDoc, setSelectedDoc] = useState<Ressource | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: docs }, { data: favs }] = await Promise.all([
        supabase
          .from("ressources")
          .select("*")
          .eq("visible", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("ressources_favoris")
          .select("ressource_id")
          .eq("user_id", user.id),
      ]);
      setRessources((docs as Ressource[]) ?? []);
      setFavoris(new Set((favs ?? []).map((f) => f.ressource_id)));
      setIsLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let result = [...ressources];
    if (activeCategory !== "all") result = result.filter((r) => r.categorie === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.titre.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q),
      );
    }
    if (sortBy === "alpha") result.sort((a, b) => a.titre.localeCompare(b.titre));
    if (sortBy === "popular") result.sort((a, b) => b.nb_telechargements - a.nb_telechargements);
    return result;
  }, [ressources, activeCategory, searchQuery, sortBy]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: ressources.length };
    for (const r of ressources) map[r.categorie] = (map[r.categorie] ?? 0) + 1;
    return map;
  }, [ressources]);

  const toggleFavori = async (ressourceId: string) => {
    if (!user) return;
    const isFav = favoris.has(ressourceId);
    if (isFav) {
      await supabase
        .from("ressources_favoris")
        .delete()
        .eq("user_id", user.id)
        .eq("ressource_id", ressourceId);
      setFavoris((prev) => {
        const s = new Set(prev);
        s.delete(ressourceId);
        return s;
      });
    } else {
      await supabase
        .from("ressources_favoris")
        .insert({ user_id: user.id, ressource_id: ressourceId });
      setFavoris((prev) => new Set([...prev, ressourceId]));
    }
  };

  const handleDownload = async (r: Ressource) => {
    if (!user) return;
    await supabase
      .from("ressources_telechargements")
      .insert({ user_id: user.id, ressource_id: r.id });
    await supabase
      .from("ressources")
      .update({ nb_telechargements: r.nb_telechargements + 1 })
      .eq("id", r.id);
    setRessources((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, nb_telechargements: x.nb_telechargements + 1 } : x)),
    );
    if (r.fichier_url) {
      window.open(r.fichier_url, "_blank");
    } else {
      toast.info("Document bientôt disponible");
    }
  };

  const askIncubYouth = (r: Ressource) => {
    sessionStorage.setItem("chat-prefill", `Explique-moi le contenu du document : ${r.titre}`);
    navigate({ to: "/chat" });
  };

  return (
    <div className="min-h-screen bg-[#FAF5FF]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#622599] text-white shadow-md">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Bibliothèque EEDS
            </h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Tous les documents officiels des Éclaireuses et Éclaireurs du Sénégal
            </p>
          </div>
        </div>

        {/* Métriques */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="Documents" value={String(ressources.length)} />
          <Metric label="Catégories" value="6" />
          <Metric label="Mes favoris" value={String(favoris.size)} />
          <Metric label="Tarif" value="100% gratuit" />
        </div>

        {/* Recherche & tri */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un règlement, chant, technique…"
              className="h-12 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#622599]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-12 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#622599]"
          >
            <option value="recent">Plus récents</option>
            <option value="alpha">A → Z</option>
            <option value="popular">Plus téléchargés</option>
          </select>
        </div>

        {/* Filtres catégories */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.key;
            const Icon = c.Icon;
            const n = counts[c.key] ?? 0;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-[#622599] bg-[#622599] text-white"
                    : "border-border bg-white text-foreground hover:border-[#622599]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {c.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grille */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[280px] w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-20 text-center">
              <Search className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucun document trouvé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Essaie un autre mot-clé ou catégorie
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((r) => (
                <DocCard
                  key={r.id}
                  r={r}
                  isFav={favoris.has(r.id)}
                  onFav={() => toggleFavori(r.id)}
                  onPreview={() => setSelectedDoc(r)}
                  onDownload={() => handleDownload(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedDoc && (
        <DocModal
          r={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDownload={() => handleDownload(selectedDoc)}
          onAsk={() => askIncubYouth(selectedDoc)}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function DocCard({
  r,
  isFav,
  onFav,
  onPreview,
  onDownload,
}: {
  r: Ressource;
  isFav: boolean;
  onFav: () => void;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const meta = catMeta(r.categorie);
  const Icon = meta.Icon;
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#622599] hover:shadow-md">
      {/* Badges */}
      <div className="absolute right-3 top-3 flex gap-1">
        {r.est_nouveau && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
            Nouveau
          </span>
        )}
        {r.est_populaire && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Populaire
          </span>
        )}
      </div>

      {/* Icône */}
      <div
        className="flex h-12 w-10 items-center justify-center rounded-md"
        style={{ background: meta.bg, color: meta.fg }}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Titre */}
      <h3 className="mt-4 line-clamp-2 min-h-[2.5rem] text-[14px] font-semibold leading-snug text-foreground">
        {r.titre}
      </h3>

      {/* Méta */}
      <p className="mt-2 text-[12px] text-muted-foreground">
        {r.nb_pages} pages · {r.nb_telechargements} téléch. · {r.annee}
      </p>

      {/* Tag */}
      <div className="mt-3">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ background: meta.bg, color: meta.fg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <button
          onClick={onFav}
          aria-label="Favori"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            isFav
              ? "border-[#622599] bg-[#622599] text-white"
              : "border-border bg-white text-muted-foreground hover:border-[#622599] hover:text-[#622599]"
          }`}
        >
          <Star className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={onPreview}
          aria-label="Aperçu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:border-[#622599] hover:text-[#622599]"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onDownload}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#622599] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4f1d7a]"
        >
          <Download className="h-4 w-4" /> PDF
        </button>
      </div>
    </div>
  );
}

function DocModal({
  r,
  onClose,
  onDownload,
  onAsk,
}: {
  r: Ressource;
  onClose: () => void;
  onDownload: () => void;
  onAsk: () => void;
}) {
  const meta = catMeta(r.categorie);
  const Icon = meta.Icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-10 flex-none items-center justify-center rounded-md"
              style={{ background: meta.bg, color: meta.fg }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight text-foreground">{r.titre}</h2>
              <span
                className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ background: meta.bg, color: meta.fg }}
              >
                {meta.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aperçu */}
        <div className="min-h-[280px] flex-1 overflow-auto bg-[#FAF5FF] p-6">
          {r.fichier_url ? (
            <iframe
              src={r.fichier_url}
              className="h-[400px] w-full rounded-lg border border-border bg-white"
              title={r.titre}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText className="h-20 w-20 text-[#622599]" strokeWidth={1.2} />
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                {r.description ?? "Aperçu PDF bientôt disponible."}
              </p>
            </div>
          )}
        </div>

        {/* Méta */}
        <div className="grid grid-cols-2 gap-3 border-t border-border bg-white p-6 sm:grid-cols-4">
          <MetaItem label="Pages" value={String(r.nb_pages)} />
          <MetaItem label="Téléchargements" value={String(r.nb_telechargements)} />
          <MetaItem label="Taille" value={r.taille_mo > 0 ? `${r.taille_mo} Mo` : "—"} />
          <MetaItem label="Année" value={String(r.annee)} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-border bg-white p-4 sm:flex-row">
          {r.fichier_url && (
            <a
              href={r.fichier_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#622599] bg-white px-4 text-sm font-semibold text-[#622599] hover:bg-[#F3E8FF]"
            >
              <Eye className="h-4 w-4" /> Consulter en ligne
            </a>
          )}
          <button
            onClick={onDownload}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#622599] px-4 text-sm font-semibold text-white hover:bg-[#4f1d7a]"
          >
            <Download className="h-4 w-4" /> Télécharger PDF
          </button>
          <button
            onClick={onAsk}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" /> Demander à Incub'Youth
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}