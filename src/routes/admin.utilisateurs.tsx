import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MoreVertical, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/utilisateurs")({
  component: AdminUsers,
});

type Profile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  region: string | null;
  groupe_scout: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Map<string, "admin" | "user">>(new Map());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30" | "90">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setUsers((profs ?? []) as Profile[]);
    const map = new Map<string, "admin" | "user">();
    (rs ?? []).forEach((r) => {
      if (r.role === "admin") map.set(r.user_id, "admin");
      else if (!map.has(r.user_id)) map.set(r.user_id, "user");
    });
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(
    () => Array.from(new Set(users.map((u) => u.region).filter(Boolean))).sort() as string[],
    [users],
  );

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const now = Date.now();
    return users.filter((u) => {
      if (s) {
        const txt = `${u.prenom ?? ""} ${u.nom ?? ""} ${u.email ?? ""}`.toLowerCase();
        if (!txt.includes(s)) return false;
      }
      if (roleFilter !== "all" && (roles.get(u.id) ?? "user") !== roleFilter) return false;
      if (regionFilter !== "all" && u.region !== regionFilter) return false;
      if (dateFilter !== "all") {
        const days = parseInt(dateFilter, 10);
        if (now - new Date(u.created_at).getTime() > days * 86400000) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, regionFilter, dateFilter, roles]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const rows = [
      ["Prénom", "Nom", "Email", "Région", "Groupe scout", "Rôle", "Inscription"],
      ...filtered.map((u) => [
        u.prenom ?? "",
        u.nom ?? "",
        u.email ?? "",
        u.region ?? "",
        u.groupe_scout ?? "",
        roles.get(u.id) ?? "user",
        new Date(u.created_at).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const promote = async (id: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("Utilisateur passé administrateur");
    load();
  };

  const demote = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Administrateur rétrogradé");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer définitivement cet utilisateur et ses données ?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Profil supprimé");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} résultat(s)</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Exporter CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par nom ou email…"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as typeof roleFilter);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Tous les rôles</option>
          <option value="admin">Admin</option>
          <option value="user">Utilisateur</option>
        </select>
        <select
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value as typeof dateFilter);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Toute période</option>
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-14 px-4 py-3"></th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Région</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="w-14 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              pageItems.map((u) => {
                const role = roles.get(u.id) ?? "user";
                const isSelf = currentUser?.id === u.id;
                const init =
                  ((u.prenom?.[0] ?? "") + (u.nom?.[0] ?? "")).toUpperCase() ||
                  (u.email?.[0] ?? "?").toUpperCase();
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#622599] text-xs font-semibold text-white">
                        {init}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {(u.prenom ?? "") + " " + (u.nom ?? "")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">{u.region ?? "—"}</td>
                    <td className="px-4 py-3">
                      {role === "admin" ? (
                        <span className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-xs font-semibold text-[#622599]">
                          Admin
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          Utilisateur
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info(u.email ?? "")}>
                            Voir profil
                          </DropdownMenuItem>
                          {role !== "admin" ? (
                            <DropdownMenuItem onClick={() => promote(u.id)}>
                              Passer admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => demote(u.id)}
                              disabled={isSelf}
                            >
                              Rétrograder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => remove(u.id)}
                            disabled={isSelf}
                            className="text-destructive"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {pageCount}
          </span>
          <button
            disabled={page === pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}