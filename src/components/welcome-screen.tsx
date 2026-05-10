import { useState } from "react";
import { MessageCircle, BookOpen, Users, Calendar } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: MessageCircle, label: "Chat IA", bg: "#F3E8FF", color: "#622599" },
  { icon: BookOpen, label: "Bibliothèque", bg: "#EAF3DE", color: "#27500A" },
  { icon: Users, label: "Communauté", bg: "#E1F5EE", color: "#085041" },
  { icon: Calendar, label: "Calendrier", bg: "#FAEEDA", color: "#633806" },
];

export function WelcomeScreen({
  prenom,
  onClose,
}: {
  prenom: string;
  onClose: () => void;
}) {
  const [confetti, setConfetti] = useState(true);
  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 px-4 anim-fade-in">
      <Confetti trigger={confetti} onDone={() => setConfetti(false)} />
      <div className="w-full max-w-lg rounded-2xl bg-card p-8 text-center shadow-2xl anim-scale-in">
        <div className="mx-auto mb-4 text-6xl anim-welcome">👋</div>
        <h2 className="text-2xl font-bold text-foreground anim-fade-up delay-1">
          Bienvenue, {prenom} !
        </h2>
        <p className="mt-2 text-sm text-muted-foreground anim-fade-up delay-2">
          Tu rejoins la communauté des scouts sénégalais sur Incub'Youth.
        </p>
        <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex flex-col items-center gap-2 anim-fade-up"
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: f.bg }}
                >
                  <Icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <span className="text-xs font-medium text-foreground">{f.label}</span>
              </div>
            );
          })}
        </div>
        <Button onClick={onClose} className="btn-bounce w-full anim-fade-up delay-6">
          Commencer l'aventure →
        </Button>
      </div>
    </div>
  );
}

export default WelcomeScreen;