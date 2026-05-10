import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialCount?: number;
  onToggle?: (liked: boolean) => void | Promise<void>;
  className?: string;
}

export function LikeButton({ initialCount = 0, onToggle, className }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [hearts, setHearts] = useState<{ id: number; x: number; delay: number }[]>([]);

  const handleClick = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    if (next) {
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 30 - 15,
        delay: i * 80,
      }));
      setHearts(newHearts);
      setTimeout(() => setHearts([]), 950);
    }
    await onToggle?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        liked
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground hover:text-destructive",
        className,
      )}
    >
      <Heart
        className={cn("h-4 w-4 transition-transform", liked && "fill-current anim-pop")}
      />
      <span>{count}</span>
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart-float"
          style={{
            left: `calc(50% + ${h.x}px)`,
            top: 0,
            animationDelay: `${h.delay}ms`,
          }}
        >
          ❤
        </span>
      ))}
    </button>
  );
}

export default LikeButton;