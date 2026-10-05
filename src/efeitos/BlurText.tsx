// BlurText do React Bits (variante TS + CSS), com movimento reduzido respeitado.
// Sem biblioteca: usa element.animate() do navegador, a mesma API que a Motion
// usava por baixo, com os mesmos valores. Cada palavra sai de blur(10px),
// opacidade 0 e 24px abaixo, passa por blur(4px), 0,6 e -3px na metade do
// tempo e chega ao normal, com a curva cubic-bezier(0.22, 1, 0.36, 1). Como na
// Motion, para desfoque e opacidade a curva vale para a animação inteira; para o
// deslocamento, que a Motion calculava em JavaScript, vale para cada metade.
import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

type Props = {
  text: string;
  as?: ElementType;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  stepDuration?: number;
};

const CURVA = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function BlurText({
  text,
  as: Tag = "p",
  delay = 120,
  className = "",
  animateBy = "words",
  direction = "bottom",
  stepDuration = 0.32,
}: Props) {
  const [reduzir] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const partes = animateBy === "words" ? text.split(" ") : text.split("");
  const ref = useRef<HTMLElement>(null);
  const sinal = direction === "top" ? -1 : 1;
  const de = { filter: "blur(10px)", opacity: 0, transform: `translateY(${24 * sinal}px)` };

  useEffect(() => {
    const el = ref.current;
    if (!el || reduzir) return;
    const animacoes: Animation[] = [];
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observador.disconnect();
        el.querySelectorAll<HTMLElement>(".blur-parte").forEach((parte, i) => {
          const tempo = { duration: stepDuration * 2 * 1000, delay: i * delay, fill: "both" as const };
          animacoes.push(
            parte.animate(
              [
                { filter: de.filter, opacity: de.opacity, offset: 0 },
                { filter: "blur(4px)", opacity: 0.6, offset: 0.5 },
                { filter: "blur(0px)", opacity: 1, offset: 1 },
              ],
              { ...tempo, easing: CURVA },
            ),
            parte.animate(
              [
                { transform: de.transform, offset: 0, easing: CURVA },
                { transform: `translateY(${-3 * sinal}px)`, offset: 0.5, easing: CURVA },
                { transform: "translateY(0px)", offset: 1 },
              ],
              tempo,
            ),
          );
        });
      },
      { threshold: 0.1 },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      animacoes.forEach((a) => a.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduzir, delay, stepDuration, sinal, text]);

  if (reduzir) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {partes.map((parte, i) => (
        <span key={i} aria-hidden className="blur-parte" style={de as CSSProperties}>
          {parte === " " ? " " : parte}
          {animateBy === "words" && i < partes.length - 1 && " "}
        </span>
      ))}
    </Tag>
  );
}
