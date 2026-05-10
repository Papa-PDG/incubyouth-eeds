import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
];

/**
 * Déconnecte automatiquement l'utilisateur après 30 minutes d'inactivité.
 * Le timer est réarmé à chaque interaction (souris, clavier, tactile, scroll).
 */
export function useInactivityLogout() {
  const { session, signOut } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        toast.info("Session expirée après 30 minutes d'inactivité.");
        await signOut();
      }, INACTIVITY_MS);
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, reset, { passive: true }),
    );
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => document.removeEventListener(evt, reset));
    };
  }, [session, signOut]);
}