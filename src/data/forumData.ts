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

export function getCategory(key: CategoryKey): Category {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export interface ForumUser {
  id: string;
  name: string;
  city: string;
  postCount: number;
  avatarColor: string;
}

export interface ForumReply {
  id: string;
  threadId: string;
  author: ForumUser;
  content: string;
  createdAt: string;
  likes: number;
  helpfulVotes: number;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  category: CategoryKey;
  author: ForumUser;
  createdAt: string;
  likes: number;
  pinned?: boolean;
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

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
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

export const MOCK_USERS: ForumUser[] = [
  { id: "u1", name: "Aïssatou Diop", city: "Dakar", postCount: 52, avatarColor: "#622599" },
  { id: "u2", name: "Moussa Ndiaye", city: "Saint-Louis", postCount: 27, avatarColor: "#1d4ed8" },
  { id: "u3", name: "Fatou Sarr", city: "Thiès", postCount: 14, avatarColor: "#be123c" },
  { id: "u4", name: "Cheikh Bâ", city: "Ziguinchor", postCount: 8, avatarColor: "#15803d" },
  { id: "u5", name: "Mariama Sow", city: "Kaolack", postCount: 31, avatarColor: "#c2410c" },
  { id: "u6", name: "Ibrahima Faye", city: "Mbour", postCount: 4, avatarColor: "#a16207" },
  { id: "u7", name: "Awa Mbaye", city: "Tambacounda", postCount: 18, avatarColor: "#0f766e" },
  { id: "u8", name: "Ousmane Kane", city: "Louga", postCount: 2, avatarColor: "#7c2d12" },
];

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

export const MOCK_THREADS: ForumThread[] = [
  {
    id: "t1",
    title: "Comment préparer un feu de camp sans allumettes ?",
    content:
      "Lors de notre dernière sortie à Popenguine, nous avons oublié les allumettes. J'ai entendu parler de la technique du silex ou de l'arc à feu. Quelqu'un a-t-il déjà essayé en conditions réelles au Sénégal ? Quel bois utiliser ?",
    category: "scoutisme",
    author: MOCK_USERS[0],
    createdAt: ago(2),
    likes: 24,
    pinned: true,
  },
  {
    id: "t2",
    title: "Quels sont mes droits si un adulte me frappe à l'école ?",
    content:
      "Un de mes camarades subit régulièrement des violences d'un enseignant. Vers qui se tourner concrètement au Sénégal ? Existe-t-il une ligne d'écoute officielle ?",
    category: "droits",
    author: MOCK_USERS[2],
    createdAt: ago(5),
    likes: 41,
  },
  {
    id: "t3",
    title: "Comment réduire les déchets plastiques dans mon quartier ?",
    content:
      "Avec ma patrouille, on veut lancer une campagne de ramassage et de sensibilisation à la Médina. Avez-vous des idées d'actions concrètes qui marchent vraiment ?",
    category: "environnement",
    author: MOCK_USERS[3],
    createdAt: ago(9),
    likes: 12,
  },
  {
    id: "t4",
    title: "Que faire en cas de malaise pendant une randonnée ?",
    content:
      "Pendant la marche vers le lac Rose, un éclaireur a fait un malaise. Quelle est la bonne procédure : PLS, hydratation, appel des secours ? Quelle trousse minimale prévoir ?",
    category: "sante",
    author: MOCK_USERS[4],
    createdAt: ago(14),
    likes: 19,
  },
  {
    id: "t5",
    title: "Mon expérience au camp national EEDS 2024",
    content:
      "Retour sur 10 jours inoubliables à Toubab Dialaw : veillées, services communautaires, cérémonie de la Promesse. Je partage mes meilleurs souvenirs et conseils pour les prochains.",
    category: "general",
    author: MOCK_USERS[1],
    createdAt: ago(26),
    likes: 38,
  },
  {
    id: "t6",
    title: "Devenir un citoyen engagé : par où commencer à 15 ans ?",
    content:
      "Je veux m'impliquer dans la vie de mon quartier mais je ne sais pas par où commencer. Vous avez des exemples d'initiatives portées par des jeunes scouts au Sénégal ?",
    category: "citoyennete",
    author: MOCK_USERS[6],
    createdAt: ago(32),
    likes: 7,
  },
  {
    id: "t7",
    title: "Check-list complète pour un camp de 5 jours en brousse",
    content:
      "Je prépare mon premier camp en tant que CP. Quelqu'un aurait une check-list éprouvée (matériel collectif, individuel, cuisine, secours) adaptée au climat sénégalais ?",
    category: "camp",
    author: MOCK_USERS[5],
    createdAt: ago(48),
    likes: 16,
  },
  {
    id: "t8",
    title: "Astuce : nœud de cabestan rapide expliqué simplement",
    content:
      "Petit tuto en 3 étapes pour réussir le nœud de cabestan à tous les coups. Idéal pour les installations de camp.",
    category: "scoutisme",
    author: MOCK_USERS[0],
    createdAt: ago(72),
    likes: 9,
  },
];

export const MOCK_REPLIES: ForumReply[] = [
  {
    id: "r1", threadId: "t1", author: MOCK_USERS[1],
    content: "On a testé l'arc à feu avec du bois de fromager bien sec : ça marche mais demande de l'entraînement. Le silex et un morceau d'acier (dos d'un couteau) sont plus fiables sur le terrain.",
    createdAt: ago(1), likes: 12, helpfulVotes: 18,
  },
  {
    id: "r2", threadId: "t1", author: MOCK_USERS[4],
    content: "Pense aussi à préparer un nid d'amadou (herbe sèche, écorce effilochée) avant d'allumer. Sans bon combustible, aucune méthode ne marche.",
    createdAt: ago(0.5), likes: 7, helpfulVotes: 5,
  },
  {
    id: "r3", threadId: "t2", author: MOCK_USERS[0],
    content: "Tu peux contacter l'AEMO (Action Éducative en Milieu Ouvert) ou appeler le 116, ligne d'écoute pour enfants au Sénégal. Garde des traces (dates, témoins) si possible.",
    createdAt: ago(4), likes: 22, helpfulVotes: 27,
  },
];

export interface ScoutEvent {
  id: string;
  title: string;
  date: string; // human readable
  location: string;
}
export const UPCOMING_EVENTS: ScoutEvent[] = [
  { id: "e1", title: "Rassemblement régional Dakar", date: "22 nov. 2026", location: "Stade Léopold-Senghor" },
  { id: "e2", title: "Camp formation chefs de patrouille", date: "5–7 déc. 2026", location: "Toubab Dialaw" },
  { id: "e3", title: "Journée environnement EEDS", date: "13 déc. 2026", location: "Île de Gorée" },
];
