import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, MessageSquare, Bot, FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoEeds from "@/assets/logo-eeds.webp";

const items = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { to: "/admin/conversations", label: "Conversations", icon: MessageSquare, disabled: true },
  { to: "/admin/config", label: "Config du bot", icon: Bot },
  { to: "/admin/rapports", label: "Rapports", icon: FileText, disabled: true },
] as const;

function initials(prenom?: string | null, nom?: string | null, email?: string | null) {
  const p = (prenom?.[0] ?? "").toUpperCase();
  const n = (nom?.[0] ?? "").toUpperCase();
  if (p || n) return `${p}${n}`;
  return (email?.[0] ?? "?").toUpperCase();
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const meta = (user?.user_metadata ?? {}) as { prenom?: string; nom?: string };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#F9FAFB]">
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-[240px] flex-col bg-[#1F1535] text-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={logoEeds} alt="" className="h-8 w-8 rounded-full" />
          <span className="text-lg font-bold">Incub'Youth</span>
        </div>
        <div className="px-5 pb-4">
          <span className="inline-block rounded-full bg-[#622599]/40 px-3 py-1 text-xs font-semibold text-[#E9D5FF]">
            Administration
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((it) => {
            const Icon = it.icon;
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const disabled = "disabled" in it && it.disabled;
            const className = `relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-[3px] before:rounded-r before:bg-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`;
            if (disabled) {
              return (
                <span key={it.to} className={className} title="Bientôt disponible">
                  <Icon className="h-4 w-4" />
                  {it.label}
                </span>
              );
            }
            return (
              <Link key={it.to} to={it.to} className={className}>
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#622599] text-sm font-semibold">
              {initials(meta.prenom, meta.nom, user?.email)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{meta.prenom ?? "Admin"}</div>
              <div className="truncate text-xs text-white/60">{user?.email}</div>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
        </div>
      </aside>
      <main className="flex-1 md:ml-[240px]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}