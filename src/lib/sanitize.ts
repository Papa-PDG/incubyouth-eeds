// Validation & sanitisation des entrées utilisateur (anti-XSS, anti-injection)
// Utilisé côté client avant envoi ; revérifié côté serveur (Edge Function).

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

/**
 * Nettoie une chaîne saisie par l'utilisateur :
 * - supprime les caractères de contrôle invisibles
 * - retire les balises <script>...</script> et leur contenu
 * - neutralise les balises HTML restantes (échappe < et >)
 * - normalise les espaces et limite la longueur
 */
export function sanitizeUserText(input: string, maxLength = MAX_CHAT_MESSAGE_LENGTH): string {
  if (typeof input !== "string") return "";
  let s = input;
  // Retire caractères de contrôle (sauf \n, \r, \t)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Retire scripts complets
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Retire balises iframe/object/embed
  s = s.replace(/<\/?(iframe|object|embed|link|meta|style)\b[^>]*>/gi, "");
  // Échappe < et > restants
  s = s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Trim et limite
  s = s.trim().slice(0, maxLength);
  return s;
}

export function isSafeChatInput(input: string): boolean {
  const cleaned = sanitizeUserText(input);
  return cleaned.length > 0 && cleaned.length <= MAX_CHAT_MESSAGE_LENGTH;
}