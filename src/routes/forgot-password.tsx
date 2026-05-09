import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-side-panel";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié — Incub'Youth" }],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <AuthLayout title="On t'aide à retrouver l'accès">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre ton email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {sent ? (
          <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
            <div>
              <p className="font-medium">Email envoyé !</p>
              <p>Vérifie ta boîte mail pour réinitialiser ton mot de passe.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#622599] hover:bg-[#4f1d7a]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-[#622599] hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}