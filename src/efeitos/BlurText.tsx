// BlurText do React Bits (variante TS + CSS), com movimento reduzido respeitado.
import { motion, useReducedMotion, type Transition } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ElementType } from "react";

type Quadro = Record<string, string | number>;

type Props = {
  text: string;
  as?: ElementType;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  stepDuration?: number;
};

function quadrosChave(de: Quadro, passos: Quadro[]) {
  const chaves = new Set([...Object.keys(de), ...passos.flatMap((p) => Object.keys(p))]);
  const saida: Record<string, (string | number)[]> = {};
  chaves.forEach((k) => {
    saida[k] = [de[k], ...passos.map((p) => p[k])];
  });
  return saida;
}

export default function BlurText({
  text,
  as: Tag = "p",
  delay = 120,
  className = "",
  animateBy = "words",
  direction = "bottom",
  stepDuration = 0.32,
}: Props) {
  const reduzir = useReducedMotion();
  const partes = animateBy === "words" ? text.split(" ") : text.split("");
  const [visivel, setVisivel] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const de = useMemo<Quadro>(
    () => ({ filter: "blur(10px)", opacity: 0, y: direction === "top" ? -24 : 24 }),
    [direction],
  );
  const para = useMemo<Quadro[]>(
    () => [
      { filter: "blur(4px)", opacity: 0.6, y: direction === "top" ? 3 : -3 },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction],
  );

  if (reduzir) {
    return <Tag className={className}>{text}</Tag>;
  }

  const passos = para.length + 1;
  const tempos = Array.from({ length: passos }, (_, i) => i / (passos - 1));
  const quadros = quadrosChave(de, para);

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {partes.map((parte, i) => {
        const transicao: Transition = {
          duration: stepDuration * (passos - 1),
          times: tempos,
          delay: (i * delay) / 1000,
          ease: [0.22, 1, 0.36, 1],
        };
        return (
          <motion.span
            key={i}
            aria-hidden
            initial={de}
            animate={visivel ? quadros : de}
            transition={transicao}
            style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
          >
            {parte === " " ? "\u00A0" : parte}
            {animateBy === "words" && i < partes.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Tag>
  );
}
