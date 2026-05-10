import { type ReactNode } from "react";
import { useInView } from "@/hooks/use-animations";
import { cn } from "@/lib/utils";

type Animation = "fade-up" | "fade-in" | "scale-in" | "slide-r";

const map: Record<Animation, string> = {
  "fade-up": "anim-fade-up",
  "fade-in": "anim-fade-in",
  "scale-in": "anim-scale-in",
  "slide-r": "anim-slide-r",
};

interface Props {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  className?: string;
}

export function AnimateOnScroll({
  children,
  animation = "fade-up",
  delay = 0,
  className,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={cn(inView && map[animation], className)}
      style={{ animationDelay: inView ? `${delay}s` : undefined, opacity: inView ? undefined : 0 }}
    >
      {children}
    </div>
  );
}

export default AnimateOnScroll;