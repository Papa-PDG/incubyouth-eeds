import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/bibliotheque")({
  component: AdminBibliotheque,
});

const CATEGORIES = [
  { key: "reglements", label: "Règlements" },
  { key: "programmes", label: "Programmes" },
  { key: "techniques", label: "Techniques scouts" },
  { key: "chants", label: "Chants" },
  { key: "sante", label: "Santé & Bien-être" },
  { key: "droits", label: "Droits de l'enfant" },
] as const;

type Ressource = {
  id: string;
  titre: string;
  categorie: string;
  nb_pages: number;
  nb_telechargements: number;
  visible: boolean;
  fichier_url: string | null;
};

function AdminBibliotheque() {
  const { user } = useAuth();
  const [items, setItems] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState<string>("reglements");
  const [nbPages, setNbPages] = useState<number>(0);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [estNouveau, setEstNouveau] = useState(false);
  const [estPopulaire, setEstPopulaire] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ressources")
      .select("id, titre, categorie, nb_pages, nb_telechargements, visible, fichier_url")
      .order("created_at", { ascending: false });
    setItems((data as Ressource[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitre("");
    setDescription("");
    setCategorie("reglements");
    setNbPages(0);
    setPdfFile(null);
    setCoverFile(null);
    setEstNouveau(false);
    setEstPopulaire(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!titre.trim()) return toast.error("Titre obligatoire");
    setUploading(true);
    try {
      const ressourceId = crypto.randomUUID();
      let pdfUrl: string | null = null;
      let coverUrl: string | null = null;
      let tailleMo = 0;

      if (pdfFile) {
        const path = `pdfs/${ressourceId}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("ressources-eeds")
          .upload(path, pdfFile, { contentType: "application/pdf", upsert: true });
        if (upErr) throw upErr;
        pdfUrl = supabase.storage.from("ressources-eeds").getPublicUrl(path).data.publicUrl;
        tailleMo = Math.round((pdfFile.size / (1024 * 1024)) * 10) / 10;
      }
      if (coverFile) {
        const path = `covers/${ressourceId}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("ressources-eeds")
          .upload(path, coverFile, { contentType: coverFile.type, upsert: true });
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("ressources-eeds").getPublicUrl(path).data.publicUrl;
      }

      const { error: insErr } = await supabase.from("ressources").insert({
        id: ressourceId,
        titre: titre.trim(),
        description: description.trim() || null,
        categorie,
        nb_pages: nbPages || 0,
        fichier_url: pdfUrl,
        couverture_url: coverUrl,
        est_nouveau: estNouveau,
        est_populaire: estPopulaire,
        taille_mo: tailleMo,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast.success("Document ajouté à la bibliothèque !");
      resetForm();
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const toggleVisible = async (r: Ressource) => {
    await supabase.from("ressources").update({ visible: !r.visible }).eq("id", r.id);
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, visible: !r.visible } : x)));
  };

  const remove = async (r: Ressource) => {
    if (!confirm(`Supprimer « ${r.titre} » ?`)) return;
    const { error } = await supabase.from("ressources").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Document supprimé");
    setItems((prev) => prev.filter((x) => x.id !== r.id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bibliothèque EEDS</h1>
        <p className="text-sm text-muted-foreground">
          Ajoute et gère les documents officiels de la bibliothèque.
        </p>
      </div>

      {/* Formulaire */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Ajouter un document</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre *">
            <input
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#622599]"
            />
          </Field>
          <Field label="Catégorie *">
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#622599]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-[#622599]"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nombre de pages">
            <input
              type="number"
              min={0}
              value={nbPages}
              onChange={(e) => setNbPages(Number(e.target.value))}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-[#622599]"
            />
          </Field>
          <Field label="Fichier PDF">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#F3E8FF] file:px-2 file:py-1 file:text-[#622599]"
            />
          </Field>
          <Field label="Couverture (optionnel)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#F3E8FF] file:px-2 file:py-1 file:text-[#622599]"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={estNouveau}
              onChange={(e) => setEstNouveau(e.target.checked)}
            />
            Marquer comme nouveau
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={estPopulaire}
              onChange={(e) => setEstPopulaire(e.target.checked)}
            />
            Marquer comme populaire
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-md bg-[#622599] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4f1d7a] disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Ajouter à la bibliothèque
        </button>
      </form>

      {/* Liste */}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-semibold">Documents existants ({items.length})</h2>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> Rafraîchir
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Titre</th>
                  <th className="px-5 py-3">Catégorie</th>
                  <th className="px-5 py-3">Pages</th>
                  <th className="px-5 py-3">Téléch.</th>
                  <th className="px-5 py-3">Visible</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{r.titre}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {CATEGORIES.find((c) => c.key === r.categorie)?.label ?? r.categorie}
                    </td>
                    <td className="px-5 py-3">{r.nb_pages}</td>
                    <td className="px-5 py-3">{r.nb_telechargements}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleVisible(r)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.visible
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {r.visible ? "Visible" : "Masqué"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => remove(r)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      Aucun document. Ajoute le premier ci-dessus.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}