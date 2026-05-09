import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-side-panel";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — Incub'Youth" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places the recovery token in the URL hash and emits a
    // PASSWORD_RECOVERY event after detectSessionInUrl processes it.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Impossible de mettre à jour le mot de passe. Réessaie.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/login" }), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choisis un nouveau mot de passe">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre ton nouveau mot de passe ci-dessous
          </p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-sm text-foreground">
              Mot de passe mis à jour. Redirection vers la connexion…
            </p>
          </div>
        ) : !ready ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            Lien invalide ou expiré. Demande un nouveau lien depuis la page{" "}
            <Link to="/forgot-password" className="font-medium underline">
              mot de passe oublié
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="pwd"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Afficher le mot de passe"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && password.length < 8 && (
                <p className="text-xs text-destructive">Minimum 8 caractères</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
              {confirm && confirm !== password && (
                <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || !valid}
              className="w-full bg-[#622599] hover:bg-[#4f1d7a]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour le mot de passe
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}