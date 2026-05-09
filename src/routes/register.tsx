import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicOnlyRoute } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/auth-side-panel";
import { toast } from "sonner";

const REGIONS = [
  "Dakar", "Saint-Louis", "Thiès", "Diourbel", "Louga", "Fatick",
  "Kaolack", "Kaffrine", "Tambacounda", "Kédougou", "Kolda", "Sédhiou",
  "Ziguinchor", "Matam",
];

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Incub'Youth" },
      { name: "description", content: "Rejoins la communauté Incub'Youth des EEDS." },
    ],
  }),
  component: () => (
    <PublicOnlyRoute>
      <RegisterPage />
    </PublicOnlyRoute>
  ),
});

function passwordStrength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: 1, label: "Faible", color: "bg-red-500" };
  if (s === 2) return { score: 2, label: "Moyen", color: "bg-orange-500" };
  if (s === 3) return { score: 3, label: "Bon", color: "bg-yellow-500" };
  return { score: 4, label: "Fort", color: "bg-green-500" };
}

function RegisterPage() {
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [groupe, setGroupe] = useState("");
  const [region, setRegion] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwdValid = password.length >= 8;
  const matches = password === confirm && confirm.length > 0;
  const strength = passwordStrength(password);
  const canSubmit =
    prenom && nom && emailValid && pwdValid && matches && accept && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
          data: { prenom, nom, groupe_scout: groupe || null, region: region || null },
        },
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) {
          setError("Un compte existe déjà avec cet email. Connecte-toi.");
        } else if (m.includes("password")) {
          setError("Le mot de passe doit contenir au moins 8 caractères.");
        } else {
          setError("Erreur lors de la création du compte. Réessaie.");
        }
        return;
      }
      setSuccess(true);
      toast.success("Compte créé ! Vérifie ta boîte mail.");
      setTimeout(() => navigate({ to: "/login" }), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Bienvenue dans la communauté">
        <div className="space-y-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
          <h1 className="text-2xl font-bold text-foreground">Compte créé !</h1>
          <p className="text-sm text-muted-foreground">
            Compte créé avec succès ! Vérifie ta boîte mail pour confirmer ton compte avant de te connecter.
          </p>
          <p className="text-xs text-muted-foreground">
            Redirection vers la connexion dans 5 secondes…
          </p>
          <Link to="/login" className="inline-block font-medium text-[#622599] hover:underline">
            Aller à la connexion →
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Rejoins Incub'Youth">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Créer un compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rejoins la communauté des scouts sénégalais
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={email && !emailValid ? "border-destructive" : ""}
              required
            />
            {email && !emailValid && <p className="text-xs text-destructive">Adresse email invalide</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`pr-10 ${password && !pwdValid ? "border-destructive" : ""}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex h-1.5 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded ${
                        i <= strength.score ? strength.color : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Force : {strength.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer le mot de passe *</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={confirm && !matches ? "border-destructive" : ""}
              required
            />
            {confirm && !matches && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="groupe">Groupe scout</Label>
            <Input id="groupe" value={groupe} onChange={(e) => setGroupe(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="region">Région</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Sélectionne ta région" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="cgu"
              checked={accept}
              onCheckedChange={(c) => setAccept(c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="cgu" className="text-sm font-normal leading-snug">
              J'accepte les{" "}
              <Link to="/conditions-utilisation" className="text-[#622599] hover:underline">
                conditions d'utilisation
              </Link>
            </Label>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-[#622599] hover:bg-[#4f1d7a]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-medium text-[#622599] hover:underline">
            Se connecter →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}