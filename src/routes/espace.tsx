import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MessageSquare, Trash2, Pencil, ShieldAlert, BadgeCheck,
  Compass, Search, Scale, Leaf, HeartPulse, Award, Lock,
  Tent, FileDown,
} from "lucide-react";
import { ProtectedRoute } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useCountUp } from "@/hooks/use-animations";

function CountUp({ target }: { target: number }) {
  const ref = useCountUp(target);
  return <span ref={ref as never}>0</span>;
}
import { exportCampPdf, type CampPlan } from "@/lib/camp-pdf";

export const Route = createFileRoute("/espace")({
  head: () => ({ meta: [{ title: "Mon Espace — Incub'Youth" }] }),
  component: () => (
    <ProtectedRoute>
      <EspacePage />
    </ProtectedRoute>
  ),
});

const REGIONS = [
  "Dakar", "Saint-Louis", "Thiès", "Diourbel", "Louga", "Fatick",
  "Kaolack", "Kaffrine", "Tambacounda", "Kédougou", "Kolda", "Sédhiou",
  "Ziguinchor", "Matam",
];

const THEME_KEYWORDS: Record<string, string[]> = {
  Scoutisme: ["scout", "scoutisme", "patrouille", "promesse", "loi"],
  Droits: ["droit", "droits", "enfant", "loi", "justice"],
  Environnement: ["environnement", "écolog", "nature", "planète", "climat", "déchet"],
  Santé: ["santé", "médica", "maladie", "hygiène", "alimentation", "sport"],
};

type Profile = {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  groupe_scout: string | null;
  region: string | null;
  created_at: string;
};
type ConvRow = { id: string; titre: string; updated_at: string };
type CampRow = {
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

function EspacePage() {
  const { user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userMsgs, setUserMsgs] = useState<{ content: string; created_at: string }[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [convMsgCounts, setConvMsgCounts] = useState<Record<string, number>>({});
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const editRef = useRef<HTMLDivElement | null>(null);

  // Form fields
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [groupe, setGroupe] = useState("");
  const [region, setRegion] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Delete account modal
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Charger profil et conversations en parallèle
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase
          .from("profiles")
          .select("prenom, nom, email, groupe_scout, region, created_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("conversations")
          .select("id, titre, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50),
      ]);
      const { data: campsData } = await supabase
        .from("camps")
        .select("id, nom_camp, duree, theme, effectif, age, region, plan_json, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setCamps(((campsData ?? []) as unknown) as CampRow[]);
      if (p) {
        setProfile(p);
        setPrenom(p.prenom ?? "");
        setNom(p.nom ?? "");
        setGroupe(p.groupe_scout ?? "");
        setRegion(p.region ?? "");
      }
      const conversations = (c ?? []) as ConvRow[];
      setConvs(conversations);

      const ids = conversations.map((x) => x.id);
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("conversation_id, role, content, created_at")
          .in("conversation_id", ids)
          .limit(1000);
        const counts: Record<string, number> = {};
        const userOnly: { content: string; created_at: string }[] = [];
        (msgs ?? []).forEach((m: any) => {
          counts[m.conversation_id] = (counts[m.conversation_id] ?? 0) + 1;
          if (m.role === "user") userOnly.push({ content: m.content, created_at: m.created_at });
        });
        setConvMsgCounts(counts);
        setUserMsgs(userOnly);
      }
    })();
  }, [user?.id]);

  const initials = useMemo(
    () => `${profile?.prenom?.[0] ?? ""}${profile?.nom?.[0] ?? ""}`.toUpperCase() || "?",
    [profile],
  );

  // Metrics
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = { Scoutisme: 0, Droits: 0, Environnement: 0, Santé: 0 };
    for (const m of userMsgs) {
      const lower = m.content.toLowerCase();
      for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
        if (kws.some((k) => lower.includes(k))) counts[theme]++;
      }
    }
    return counts;
  }, [userMsgs]);

  const favTheme = useMemo(() => {
    const max = Math.max(...Object.values(themeCounts));
    if (max === 0) return "—";
    return Object.entries(themeCounts).find(([, v]) => v === max)?.[0] ?? "—";
  }, [themeCounts]);

  const activeDays = useMemo(() => {
    const set = new Set(userMsgs.map((m) => m.created_at.slice(0, 10)));
    return set.size;
  }, [userMsgs]);

  const totalQuestions = userMsgs.length;

  const badges = useMemo(() => [
    { key: "explorer", icon: Compass, name: "Explorateur", desc: "1ère question posée", goal: 1, current: totalQuestions },
    { key: "curieux", icon: Search, name: "Curieux", desc: "10 questions posées", goal: 10, current: totalQuestions },
    { key: "defenseur", icon: Scale, name: "Défenseur", desc: "5 questions sur les droits", goal: 5, current: themeCounts["Droits"] },
    { key: "ecologiste", icon: Leaf, name: "Écologiste", desc: "5 questions environnement", goal: 5, current: themeCounts["Environnement"] },
    { key: "medecin", icon: HeartPulse, name: "Médecin", desc: "5 questions sur la santé", goal: 5, current: themeCounts["Santé"] },
    { key: "expert", icon: Award, name: "Expert Scout", desc: "50 questions posées", goal: 50, current: totalQuestions },
  ], [totalQuestions, themeCounts]);

  const handleSave = async () => {
    if (!user) return;
    if (!prenom.trim() || !nom.trim()) {
      toast.error("Prénom et nom sont obligatoires");
      return;
    }
    setSaving(true);
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        prenom: prenom.trim(),
        nom: nom.trim(),
        groupe_scout: groupe.trim() || null,
        region: region || null,
      })
      .eq("id", user.id)
      .select("prenom, nom, email, groupe_scout, region, created_at")
      .maybeSingle();

    if (newPwd) {
      if (newPwd.length < 8) {
        toast.error("Mot de passe trop court (min 8)");
        setSaving(false);
        return;
      }
      if (newPwd !== confirmPwd) {
        toast.error("Les mots de passe ne correspondent pas");
        setSaving(false);
        return;
      }
      const { error: pErr } = await supabase.auth.updateUser({ password: newPwd });
      if (pErr) {
        toast.error(pErr.message);
        setSaving(false);
        return;
      }
      setNewPwd("");
      setConfirmPwd("");
    }

    setSaving(false);
    if (error) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
      return;
    }
    toast.success("Profil mis à jour");
    if (updated) {
      setProfile(updated as Profile);
      setPrenom(updated.prenom ?? "");
      setNom(updated.nom ?? "");
      setGroupe(updated.groupe_scout ?? "");
      setRegion(updated.region ?? "");
    }
    // Sync the global auth profile so navbar & other consumers reflect changes
    await refreshProfile();
    setEditOpen(false);
  };

  const removeConv = async (id: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");
    setConvs((c) => c.filter((x) => x.id !== id));
    toast.success("Conversation supprimée");
  };

  const removeCamp = async (id: string) => {
    const { error } = await supabase.from("camps").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");
    setCamps((c) => c.filter((x) => x.id !== id));
    toast.success("Camp supprimé");
  };

  const deleteAccount = async () => {
    if (!user) return;
    // Delete profile (auth user removal requires admin; we sign out + delete profile data)
    await supabase.from("conversations").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    toast.success("Compte supprimé");
    navigate({ to: "/" });
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="skeleton h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* HEADER PROFILE */}
      <Card className="anim-fade-up border-[#E5E7EB] bg-gradient-to-br from-[#FAF5FF] to-white p-6">
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
          <div className="anim-pop flex h-20 w-20 flex-none items-center justify-center rounded-full bg-[#622599] text-[28px] font-bold text-white shadow-lg shadow-[#622599]/20 transition-transform hover:scale-105">
            {initials}
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl font-bold">
              {profile.prenom} {profile.nom}
            </h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.groupe_scout && (
                <Badge className="bg-[#F3E8FF] text-[#622599] hover:bg-[#F3E8FF]">
                  {profile.groupe_scout}
                </Badge>
              )}
              {profile.region && (
                <Badge className="bg-[#F3E8FF] text-[#622599] hover:bg-[#F3E8FF]">
                  {profile.region}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <BadgeCheck className="mr-1 h-3 w-3" />
                Membre depuis {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setEditOpen(true);
              setTimeout(() => {
                editRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className="btn-bounce border-[#622599] text-[#622599] hover:bg-[#F3E8FF] hover:text-[#622599]"
          >
            <Pencil className="mr-2 h-4 w-4" /> Modifier mon profil
          </Button>
        </div>
      </Card>

      {/* METRICS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Questions posées", value: totalQuestions },
          { label: "Conversations", value: convs.length },
          { label: "Thème favori", value: favTheme },
          { label: "Jours actif", value: activeDays },
        ].map((m, i) => (
          <Card
            key={m.label}
            className="card-hover anim-fade-up border-[#E5E7EB] p-5"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="text-3xl font-bold text-[#622599]">
              {typeof m.value === "number" ? <CountUp target={m.value} /> : m.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{m.label}</div>
          </Card>
        ))}
      </section>

      {/* BADGES */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold">Tes badges Incub'Youth</h3>
        {/* XP bar = pourcentage badges débloqués */}
        {badges.length > 0 && (() => {
          const unlockedCount = badges.filter((b) => b.current >= b.goal).length;
          const pct = Math.round((unlockedCount / badges.length) * 100);
          return (
            <div className="anim-fade-up space-y-2 rounded-xl border border-[#E5E7EB] bg-[#FAF5FF] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#622599]">
                  Progression : <CountUp target={unlockedCount} />/{badges.length} badges
                </span>
                <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div className="xp-bar-fill" style={{ ["--target-width" as never]: `${pct}%` }} />
              </div>
            </div>
          );
        })()}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {badges.map((b, i) => {
            const unlocked = b.current >= b.goal;
            const Icon = b.icon;
            return (
              <Card
                key={b.key}
                className={`card-hover anim-fade-up border p-4 text-center ${
                  unlocked ? "border-[#E5E7EB] bg-[#F3E8FF]" : "border-[#E5E7EB] bg-[#F9FAFB]"
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white">
                  {unlocked && <span className="badge-ring" aria-hidden />}
                  <Icon
                    className={`h-6 w-6 transition-transform ${
                      unlocked ? "text-[#622599] anim-pop" : "text-muted-foreground/40"
                    }`}
                  />
                  {!unlocked && (
                    <Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5 text-muted-foreground" />
                  )}
                </div>
                <div className={`text-sm font-semibold ${unlocked ? "text-[#622599]" : "text-muted-foreground"}`}>
                  {b.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {unlocked ? b.desc : `${Math.min(b.current, b.goal)}/${b.goal} pour débloquer`}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* MES CAMPS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <Tent className="h-5 w-5 text-[#622599]" /> Mes camps
          </h3>
          <Button asChild variant="outline" size="sm" className="border-[#622599] text-[#622599] hover:bg-[#F3E8FF] hover:text-[#622599]">
            <Link to="/camp">Nouveau camp →</Link>
          </Button>
        </div>
        {camps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun camp sauvegardé. <Link to="/camp" className="font-medium text-[#622599] hover:underline">Créer ton premier plan de camp →</Link>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map((c) => (
              <Card key={c.id} className="flex flex-col border-[#E5E7EB] p-4">
                <div className="flex items-start gap-2">
                  <Tent className="mt-0.5 h-4 w-4 flex-none text-[#622599]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.nom_camp}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.theme} · {c.duree} j · {c.region}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(c.created_at), "d MMM yyyy", { locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      exportCampPdf(
                        {
                          nomCamp: c.nom_camp,
                          duree: c.duree,
                          theme: c.theme,
                          effectif: c.effectif,
                          age: c.age,
                          region: c.region,
                        },
                        c.plan_json,
                        "all",
                      )
                    }
                    className="flex-1 bg-[#622599] hover:bg-[#4f1d7a]"
                  >
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => removeCamp(c.id)}
                    aria-label="Supprimer le camp"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CONVERSATIONS */}
      <section className="space-y-3">
        <h3 className="text-xl font-bold">Conversations récentes</h3>
        {convs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune conversation pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {convs.slice(0, 6).map((c) => (
              <Card key={c.id} className="flex items-center gap-3 border-[#E5E7EB] p-3">
                <MessageSquare className="h-5 w-5 flex-none text-[#622599]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.titre}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: fr })} ·{" "}
                    {convMsgCounts[c.id] ?? 0} messages
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-[#622599]">
                  <Link to="/chat/$conversationId" params={{ conversationId: c.id }}>
                    Reprendre →
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeConv(c.id)}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
        {convs.length > 6 && (
          <Link to="/chat" className="text-sm font-medium text-[#622599] hover:underline">
            Voir tout l'historique →
          </Link>
        )}
      </section>

      {/* EDIT PROFILE */}
      <Accordion
        ref={editRef as any}
        type="single"
        collapsible
        value={editOpen ? "edit" : ""}
        onValueChange={(v) => setEditOpen(v === "edit")}
      >
        <AccordionItem value="edit" className="rounded-lg border border-[#E5E7EB]">
          <AccordionTrigger className="px-4">Modifier mes informations</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input id="email" value={profile.email ?? ""} disabled className="bg-muted" />
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <BadgeCheck className="mr-1 h-3 w-3" /> Vérifié
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="groupe">Groupe scout</Label>
                <Input id="groupe" value={groupe} onChange={(e) => setGroupe(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Région</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] pt-4">
              <h4 className="mb-3 text-sm font-semibold">Changer le mot de passe</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newPwd">Nouveau mot de passe</Label>
                  <Input id="newPwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPwd">Confirmer</Label>
                  <Input id="confirmPwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-[#622599] hover:bg-[#4f1d7a]">
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </Button>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* DANGER */}
      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-destructive" />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-destructive">Zone de danger</h3>
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. Toutes tes conversations seront supprimées.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer définitivement ton compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toutes tes données seront supprimées. Pour confirmer, tape <strong>SUPPRIMER</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="SUPPRIMER"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "SUPPRIMER"}
                    onClick={deleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </main>
  );
}