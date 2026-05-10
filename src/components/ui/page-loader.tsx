import { useEffect, useState } from "react";

const MESSAGES = [
  "Préparation en cours...",
  "Installation de la tente...",
  "Allumage du feu...",
  "Presque prêt !",
];

export function PageLoader({ message }: { message?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIndex((p) => Math.min(p + 1, MESSAGES.length - 1));
      setProgress((p) => Math.min(p + 25, 95));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm">
      <svg viewBox="0 0 120 100" className="h-24 w-32" aria-hidden="true">
        <g style={{ animation: "iy-tentRise 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <path d="M10 90 L60 20 L110 90 Z" fill="#622599" />
          <path d="M60 20 L60 90" stroke="#1F1535" strokeWidth="2" />
          <path d="M52 90 L60 70 L68 90 Z" fill="#1F1535" />
        </g>
        <circle cx="60" cy="14" r="3.5" fill="#FFD700" className="anim-pulse-soft" />
      </svg>
      <p className="text-sm font-medium text-foreground anim-fade-in">
        {message ?? MESSAGES[msgIndex]}
      </p>
      <div className="h-2 w-56 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default PageLoader;