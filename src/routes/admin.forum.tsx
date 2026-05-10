import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flag, Pin, Trash2, MessageSquare, CheckCircle2, AlertTriangle, Lock,
} from "lucide-react";

export const Route = createFileRoute("/admin/forum")({
  head: () => ({ meta: [{ title: "Forum — Admin Incub'Youth" }] }),
  component: AdminForumPage,
});

const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

type Thread = {
  id: string; titre: string; categorie: string; user_id: string;
  est_epingle: boolean; est_resolu: boolean; est_ferme: boolean;
  nb_vues: number; nb_likes: number; created_at: string;
};
type Signalement = {
  id: string; user_id: string; thread_id: string | null; reply_id: string | null;
  raison: string; created_at: string;
};

function AdminForumPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [stats, setStats] = useState({ threads: 0, replies: 0, resolus: 0, signalements: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }, { count: rCount }] = await Promise.all([
      db.from("forum_threads").select("*").order("created_at", { ascending: false }),
      db.from("forum_signalements").select("*").order("created_at", { ascending: false }),
      supabase.from("forum_replies").select("id", { count: "exact", head: true }),
    ]);
    const ts = (t ?? []) as Thread[];
    const ss = (s ?? []) as Signalement[];
    setThreads(ts);
    setSignalements(ss);
    setStats({
      threads: ts.length,
      replies: rCount ?? 0,
      resolus: ts.filter((x) => x.est_resolu).length,
      signalements: ss.length,
    });
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-forum")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_signalements" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_threads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const togglePin = async (t: Thread) => {
    await db.from("forum_threads").update({ est_epingle: !t.est_epingle }).eq("id", t.id);
    toast.success(t.est_epingle ? "Désépinglé" : "Épinglé");
  };
  const toggleLock = async (t: Thread) => {
    await db.from("forum_threads").update({ est_ferme: !t.est_ferme }).eq("id", t.id);
  };
  const deleteThread = async (t: Thread) => {
    if (!confirm(`Supprimer "${t.titre}" ?`)) return;
    await db.from("forum_threads").delete().eq("id", t.id);
    toast.success("Discussion supprimée");
  };
  const dismissSignalement = async (s: Signalement) => {
    await db.from("forum_signalements").delete().eq("id", s.id);
    toast.success("Signalement traité");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1F1535]">Forum</h1>
      <p className="mt-1 text-sm text-muted-foreground">Modération et statistiques du forum communautaire.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Discussions" value={stats.threads} Icon={MessageSquare} bg="#F3E8FF" fg="#622599" />
        <Stat label="Réponses" value={stats.replies} Icon={MessageSquare} bg="#E6F1FB" fg="#0C447C" />
        <Stat label="Résolus" value={stats.resolus} Icon={CheckCircle2} bg="#E1F5EE" fg="#085041" />
        <Stat label="Signalements" value={stats.signalements} Icon={Flag} bg="#FEE2E2" fg="#B91C1C" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-foreground">Signalements en attente</h2>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : signalements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun signalement en attente.
          </div>
        ) : (
          <div className="space-y-2">
            {signalements.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("fr-FR")} · {s.thread_id ? "Discussion" : "Réponse"}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{s.raison}</p>
                  {s.thread_id && (
                    <Link to="/forum" className="mt-2 inline-block text-xs text-primary hover:underline">
                      Voir le forum →
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => dismissSignalement(s)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium hover:border-emerald-400 hover:text-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Traiter
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Toutes les discussions</h2>
        {loading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Titre</th>
                  <th className="p-3 text-left">Catégorie</th>
                  <th className="p-3 text-left">État</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {threads.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{t.titre}</td>
                    <td className="p-3 text-muted-foreground">{t.categorie}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {t.est_epingle && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">Épinglé</span>}
                        {t.est_resolu && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Résolu</span>}
                        {t.est_ferme && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Fermé</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => togglePin(t)} title={t.est_epingle ? "Désépingler" : "Épingler"}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary">
                          <Pin className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleLock(t)} title={t.est_ferme ? "Rouvrir" : "Fermer"}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary">
                          <Lock className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteThread(t)} title="Supprimer"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {threads.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucune discussion.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, Icon, bg, fg }: { label: string; value: number; Icon: typeof Flag; bg: string; fg: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: bg, color: fg }}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
