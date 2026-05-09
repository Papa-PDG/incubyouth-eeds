import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Users, MessageCircle, ThumbsUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const THEMES: Record<string, string[]> = {
  Scoutisme: ["scout", "éclaireur", "éclaireuse", "promesse", "loi", "patrouille", "totem"],
  Citoyenneté: ["citoyen", "vote", "démocratie", "droit", "engagement"],
  Environnement: ["environnement", "nature", "écolog", "climat", "déchet", "arbre"],
  Santé: ["santé", "hygiène", "secourisme", "premiers soins"],
  Éducation: ["école", "étude", "apprendre", "leçon", "devoir"],
  Autre: [],
};

function classify(content: string): string {
  const c = content.toLowerCase();
  for (const [theme, keys] of Object.entries(THEMES)) {
    if (keys.some((k) => c.includes(k))) return theme;
  }
  return "Autre";
}

type Alert = { id: string; conversation_id: string; created_at: string; user: string };

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersGrowth: 0,
    monthConvs: 0,
    convsGrowth: 0,
    todayQuestions: 0,
    satisfaction: 0,
    totalFeedbacks: 0,
  });
  const [chart, setChart] = useState<{ date: string; value: number }[]>([]);
  const [topThemes, setTopThemes] = useState<{ theme: string; count: number }[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const start30 = new Date(now.getTime() - 29 * 86400000);
      start30.setHours(0, 0, 0, 0);

      const [usersAll, usersThisMonth, usersPrevMonth, convsThisMonth, convsPrevMonth, msgs30, fbs, negFbs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startMonth),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startPrevMonth).lt("created_at", startMonth),
        supabase.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", startMonth),
        supabase.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", startPrevMonth).lt("created_at", startMonth),
        supabase.from("messages").select("created_at,role,content,feedback,conversation_id,id").gte("created_at", start30.toISOString()).order("created_at"),
        supabase.from("messages").select("id", { count: "exact", head: true }).not("feedback", "is", null),
        supabase.from("messages").select("id,conversation_id,created_at").eq("feedback", "negative").order("created_at", { ascending: false }).limit(20),
      ]);

      const allMsgs = msgs30.data ?? [];
      const userQs = allMsgs.filter((m) => m.role === "user");
      const todayQs = userQs.filter((m) => m.created_at >= startToday).length;

      // chart by day (user messages = questions)
      const buckets = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(start30.getTime() + i * 86400000);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      const seenConvs = new Map<string, Set<string>>();
      userQs.forEach((m) => {
        const day = m.created_at.slice(0, 10);
        if (!seenConvs.has(day)) seenConvs.set(day, new Set());
        seenConvs.get(day)!.add(m.conversation_id);
      });
      buckets.forEach((_, day) => buckets.set(day, seenConvs.get(day)?.size ?? 0));
      const chartData = Array.from(buckets.entries()).map(([date, value]) => ({
        date: date.slice(5),
        value,
      }));

      // top themes
      const themeCounts = new Map<string, number>();
      userQs.forEach((m) => {
        const t = classify(m.content);
        themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
      });
      const top = Array.from(themeCounts.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // satisfaction
      const totalFb = fbs.count ?? 0;
      const positives = allMsgs.filter((m) => m.feedback === "positive").length;
      const negatives = allMsgs.filter((m) => m.feedback === "negative").length;
      const totFbMsgs = positives + negatives;
      const satisfaction = totFbMsgs > 0 ? Math.round((positives / totFbMsgs) * 100) : 0;

      // growth
      const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

      setStats({
        totalUsers: usersAll.count ?? 0,
        usersGrowth: pct(usersThisMonth.count ?? 0, usersPrevMonth.count ?? 0),
        monthConvs: convsThisMonth.count ?? 0,
        convsGrowth: pct(convsThisMonth.count ?? 0, convsPrevMonth.count ?? 0),
        todayQuestions: todayQs,
        satisfaction,
        totalFeedbacks: totalFb,
      });
      setChart(chartData);
      setTopThemes(top);

      const negList = (negFbs.data ?? []) as { id: string; conversation_id: string; created_at: string }[];
      const convIds = Array.from(new Set(negList.map((n) => n.conversation_id)));
      let convUserMap = new Map<string, string>();
      if (convIds.length) {
        const { data: convs } = await supabase.from("conversations").select("id,user_id").in("id", convIds);
        const userIds = Array.from(new Set((convs ?? []).map((c) => c.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id,prenom,nom,email").in("id", userIds);
        const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
        (convs ?? []).forEach((c) => {
          const p = profMap.get(c.user_id);
          const label = p ? `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || p.email || "Utilisateur" : "Utilisateur";
          convUserMap.set(c.id, label);
        });
      }
      setAlerts(
        negList.slice(0, 8).map((n) => ({
          id: n.id,
          conversation_id: n.conversation_id,
          created_at: n.created_at,
          user: convUserMap.get(n.conversation_id) ?? "Utilisateur",
        })),
      );
      setLoading(false);
    })();
  }, []);

  const maxTheme = useMemo(() => Math.max(1, ...topThemes.map((t) => t.count)), [topThemes]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité Incub'Youth</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Utilisateurs totaux" value={stats.totalUsers} delta={stats.usersGrowth} />
        <Metric icon={MessageCircle} label="Conversations ce mois" value={stats.monthConvs} delta={stats.convsGrowth} />
        <Metric icon={TrendingUp} label="Questions aujourd'hui" value={stats.todayQuestions} />
        <SatisfactionCard value={stats.satisfaction} total={stats.totalFeedbacks} />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Activité (30 derniers jours)</h2>
        <div className="h-64 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Chargement…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3E8FF" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#622599" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Top 5 thèmes</h2>
          {topThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore de données.</p>
          ) : (
            <ol className="space-y-3">
              {topThemes.map((t, i) => (
                <li key={t.theme} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-xs font-medium text-[#622599]">
                    {t.theme}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-[#622599]"
                        style={{ width: `${(t.count / maxTheme) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums">{t.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Alertes récentes
            </h2>
            {alerts.length > 5 && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun retour négatif. </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.user}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: a.conversation_id }}
                    className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    Voir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-[#622599]" />
      </div>
      <div className="text-3xl font-bold text-[#622599]">{value.toLocaleString("fr-FR")}</div>
      {delta !== undefined && (
        <div className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}% ce mois
        </div>
      )}
    </div>
  );
}

function SatisfactionCard({ value, total }: { value: number; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Satisfaction</span>
        <ThumbsUp className="h-4 w-4 text-[#622599]" />
      </div>
      <div className="text-3xl font-bold text-[#622599]">{value}%</div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-[#622599]" style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{total} retours</div>
    </div>
  );
}