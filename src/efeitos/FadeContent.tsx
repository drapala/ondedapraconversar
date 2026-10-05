// FadeContent do React Bits (variante TS). Toca uma vez, quando o bloco entra na
// tela; dentro da ficha, que rola sozinha, o observador vê o recorte do painel.
import { gsap } from "gsap";
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
};

export default function FadeContent({
  children,
  blur = true,
  duration = 520,
  delay = 0,
  initialOpacity = 0,
  ...props
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set(el, { autoAlpha: initialOpacity, y: 14, filter: blur ? "blur(6px)" : "blur(0px)" });
    let tween: gsap.core.Tween | null = null;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observador.disconnect();
        tween = gsap.to(el, {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: duration / 1000,
          delay: delay / 1000,
          ease: "expo.out",
          clearProps: "filter,transform,opacity,visibility",
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      tween?.kill();
      gsap.set(el, { clearProps: "all" });
    };
  }, [blur, duration, delay, initialOpacity]);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
