import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Settings, LogOut } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import logo from "@/assets/logo-eeds.webp";

type Conv = { id: string; titre: string; updated_at: string };

export function ConversationSidebar({
  activeId,
  onPick,
  refreshKey,
}: {
  activeId?: string;
  onPick?: () => void;
  refreshKey?: number;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [profile, setProfile] = useState<{ prenom?: string; nom?: string } | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, titre, updated_at")
      .order("updated_at", { ascending: false });
    setConvs((data ?? []) as Conv[]);
  };

  useEffect(() => {
    load();
    if (user) {
      supabase
        .from("profiles")
        .select("prenom, nom")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => setProfile(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshKey]);

  const remove = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible");
      return;
    }
    setConvs((c) => c.filter((x) => x.id !== id));
    if (activeId === id) navigate({ to: "/chat" });
  };

  const groups: Record<string, Conv[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "Cette semaine": [],
    "Plus ancien": [],
  };
  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (isToday(d)) groups["Aujourd'hui"].push(c);
    else if (isYesterday(d)) groups["Hier"].push(c);
    else if (differenceInDays(new Date(), d) < 7) groups["Cette semaine"].push(c);
    else groups["Plus ancien"].push(c);
  }

  const initials = `${profile?.prenom?.[0] ?? ""}${profile?.nom?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#E5E7EB] bg-[#FAF5FF]">
      <div className="border-b border-[#E5E7EB] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 rounded-full" />
          <span className="font-bold text-[#622599]">Incub'Youth</span>
        </div>
        <Button
          asChild
          className="h-10 w-full rounded-[10px] bg-[#622599] hover:bg-[#4f1d7a]"
          onClick={onPick}
        >
          <Link to="/chat">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle conversation
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label} className="mb-4">
              <div className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                {label}
              </div>
              {items.map((c) => {
                const active = c.id === activeId;
                return (
                  <Link
                    key={c.id}
                    to="/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    onClick={onPick}
                    className={`group relative flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
                      active
                        ? "border-l-[3px] border-[#622599] bg-[#F3E8FF]"
                        : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 flex-none text-[#622599]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-foreground">{c.titre}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: fr })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => remove(c.id, e)}
                      className="invisible flex-none rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                );
              })}
            </div>
          ),
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[#E5E7EB] p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#622599] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <div className="truncate font-medium">
            {profile?.prenom} {profile?.nom}
          </div>
        </div>
        <Link to="/espace" className="rounded p-1.5 text-muted-foreground hover:bg-white" aria-label="Espace">
          <Settings className="h-4 w-4" />
        </Link>
        <button
          onClick={() => signOut().then(() => navigate({ to: "/" }))}
          className="rounded p-1.5 text-muted-foreground hover:bg-white"
          aria-label="Déconnexion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}