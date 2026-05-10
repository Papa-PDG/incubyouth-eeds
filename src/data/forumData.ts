import {
  Shield,
  Scale,
  Trees,
  HeartPulse,
  Globe2,
  Backpack,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey =
  | "scoutisme"
  | "droits"
  | "environnement"
  | "sante"
  | "citoyennete"
  | "camp"
  | "general";

export interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
  text: string;
}

export const CATEGORIES: Category[] = [
  { key: "scoutisme", label: "Scoutisme & Techniques", emoji: "🏕️", Icon: Shield, color: "#622599", bg: "bg-purple-100", text: "text-purple-800" },
  { key: "droits", label: "Droits de l'enfant", emoji: "⚖️", Icon: Scale, color: "#1d4ed8", bg: "bg-blue-100", text: "text-blue-800" },
  { key: "environnement", label: "Environnement", emoji: "🌿", Icon: Trees, color: "#15803d", bg: "bg-green-100", text: "text-green-800" },
  { key: "sante", label: "Santé & Bien-être", emoji: "❤️", Icon: HeartPulse, color: "#be123c", bg: "bg-rose-100", text: "text-rose-800" },
  { key: "citoyennete", label: "Citoyenneté", emoji: "🌍", Icon: Globe2, color: "#c2410c", bg: "bg-orange-100", text: "text-orange-800" },
  { key: "camp", label: "Préparation de camp", emoji: "🎒", Icon: Backpack, color: "#a16207", bg: "bg-yellow-100", text: "text-yellow-800" },
  { key: "general", label: "Discussion libre", emoji: "💬", Icon: MessageSquare, color: "#475569", bg: "bg-slate-100", text: "text-slate-800" },
];

const FALLBACK_CATEGORY: Category = CATEGORIES[CATEGORIES.length - 1];

export function getCategory(key: string): Category {
  return CATEGORIES.find((c) => c.key === key) ?? FALLBACK_CATEGORY;
}

export interface Grade {
  emoji: string;
  label: string;
  min: number;
}
export const GRADES: Grade[] = [
  { min: 0, emoji: "🌱", label: "Nouveau scout" },
  { min: 3, emoji: "⚜️", label: "Éclaireur" },
  { min: 10, emoji: "🏅", label: "Pionnier" },
  { min: 25, emoji: "🦅", label: "Ranger" },
  { min: 50, emoji: "🌟", label: "Chef scout" },
];

export function gradeFor(postCount: number): Grade {
  let g = GRADES[0];
  for (const candidate of GRADES) if (postCount >= candidate.min) g = candidate;
  return g;
}

const PALETTE = ["#622599", "#1d4ed8", "#be123c", "#15803d", "#c2410c", "#a16207", "#0f766e", "#7c2d12"];
export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export interface ForumAuthor {
  id: string;
  name: string;
  city: string;
  postCount: number;
  avatarColor: string;
}

export function buildAuthor(
  id: string,
  prenom: string | null,
  nom: string | null,
  region: string | null,
  postCount: number,
): ForumAuthor {
  const name = [prenom, nom].filter(Boolean).join(" ").trim() || "Membre EEDS";
  return {
    id,
    name,
    city: region?.trim() || "Sénégal",
    postCount,
    avatarColor: colorForId(id),
  };
}

export interface ScoutEvent {
  id: string;
  title: string;
  date: string;
  location: string;
}
export const UPCOMING_EVENTS: ScoutEvent[] = [
  { id: "e1", title: "Rassemblement régional Dakar", date: "22 nov. 2026", location: "Stade Léopold-Senghor" },
  { id: "e2", title: "Camp formation chefs de patrouille", date: "5–7 déc. 2026", location: "Toubab Dialaw" },
  { id: "e3", title: "Journée environnement EEDS", date: "13 déc. 2026", location: "Île de Gorée" },
];
