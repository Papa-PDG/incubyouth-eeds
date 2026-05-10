import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 800, trigger = true) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!trigger || !ref.current) return;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const step = target / steps;
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      if (ref.current) {
        ref.current.textContent =
          target > 999
            ? Math.round(current).toLocaleString("fr-FR")
            : String(Math.round(current));
      }
      if (current >= target) clearInterval(iv);
    }, stepTime);
    return () => clearInterval(iv);
  }, [target, duration, trigger]);
  return ref;
}

export function useInView<T extends Element = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}