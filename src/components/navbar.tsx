import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoEeds from "@/assets/logo-incubyouth.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Accueil" },
  { to: "/chat", label: "Discussion" },
  { to: "/espace", label: "Mon Espace" },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-primary">
      <img
        src={logoEeds}
        alt="Logo EEDS"
        className="h-9 w-9 rounded-full object-contain"
      />
      <span className="text-[22px] font-bold tracking-tight">Incub'Youth</span>
    </Link>
  );
}

function initials(prenom?: string | null, nom?: string | null, email?: string | null) {
  const p = (prenom?.[0] ?? "").toUpperCase();
  const n = (nom?.[0] ?? "").toUpperCase();
  if (p || n) return `${p}${n}`;
  return (email?.[0] ?? "?").toUpperCase();
}

export function Navbar() {
  const { session, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const meta = (user?.user_metadata ?? {}) as { prenom?: string; nom?: string };

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{
                className:
                  "text-primary underline underline-offset-8 decoration-2",
              }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary underline underline-offset-8 decoration-2" }}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  {initials(meta.prenom, meta.nom, user?.email)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/espace" })}>
                  <UserIcon className="mr-2 h-4 w-4" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-[10px] border-2 border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-background p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-[15px] font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary"
                  activeProps={{ className: "bg-primary-soft text-primary" }}
                  activeOptions={{ exact: l.to === "/" }}
                >
                  {l.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-[15px] font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary"
                >
                  Admin
                </Link>
              )}
            </nav>
            <div className="mt-8 flex flex-col gap-3">
              {session ? (
                <button
                  onClick={() => { setOpen(false); handleSignOut(); }}
                  className="inline-flex h-11 items-center justify-center rounded-[10px] bg-destructive px-5 text-sm font-semibold text-destructive-foreground"
                >
                  Déconnexion
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-[10px] border-2 border-primary px-5 text-sm font-semibold text-primary"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}