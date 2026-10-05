// FadeContent do React Bits (variante TS). Toca uma vez, quando o bloco entra na
// tela; dentro da ficha, que rola sozinha, o observador vê o recorte do painel.
// Sem biblioteca: element.animate() do navegador com os mesmos valores da versão
// com GSAP (de opacidade 0, 14px abaixo e blur(6px) até o normal, em 520 ms) e a
// curva expo.out do GSAP reproduzida ponto a ponto. No fim, nada fica no estilo
// do bloco, como o clearProps do GSAP.
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
};

// expo.out do GSAP (1 - 2^(-10t)); sem suporte a linear(), a aproximação clássica dela.
const EXPO_OUT = "linear(0.00000 0%, 0.03406 0.5%, 0.06697 1%, 0.09875 1.5%, 0.12945 2%, 0.15910 2.5%, 0.18775 3%, 0.21542 3.5%, 0.24214 4%, 0.26796 4.5%, 0.29289 5%, 0.31698 5.5%, 0.34025 6%, 0.36272 6.5%, 0.38443 7%, 0.40540 7.5%, 0.42565 8%, 0.44522 8.5%, 0.46411 9%, 0.48237 9.5%, 0.50000 10%, 0.51703 10.5%, 0.53348 11%, 0.54937 11.5%, 0.56472 12%, 0.57955 12.5%, 0.59387 13%, 0.60771 13.5%, 0.62107 14%, 0.63398 14.5%, 0.64645 15%, 0.65849 15.5%, 0.67012 16%, 0.68136 16.5%, 0.69221 17%, 0.70270 17.5%, 0.71283 18%, 0.72261 18.5%, 0.73206 19%, 0.74118 19.5%, 0.75000 20%, 0.75852 20.5%, 0.76674 21%, 0.77469 21.5%, 0.78236 22%, 0.78978 22.5%, 0.79694 23%, 0.80385 23.5%, 0.81054 24%, 0.81699 24.5%, 0.82322 25%, 0.82924 25.5%, 0.83506 26%, 0.84068 26.5%, 0.84611 27%, 0.85135 27.5%, 0.85641 28%, 0.86130 28.5%, 0.86603 29%, 0.87059 29.5%, 0.87500 30%, 0.87926 30.5%, 0.88337 31%, 0.88734 31.5%, 0.89118 32%, 0.89489 32.5%, 0.89847 33%, 0.90193 33.5%, 0.90527 34%, 0.90849 34.5%, 0.91161 35%, 0.91462 35.5%, 0.91753 36%, 0.92034 36.5%, 0.92305 37%, 0.92567 37.5%, 0.92821 38%, 0.93065 38.5%, 0.93301 39%, 0.93530 39.5%, 0.93750 40%, 0.94169 41%, 0.94559 42%, 0.94923 43%, 0.95263 44%, 0.95581 45%, 0.95877 46%, 0.96153 47%, 0.96410 48%, 0.96651 49%, 0.96875 50%, 0.97084 51%, 0.97280 52%, 0.97462 53%, 0.97632 54%, 0.97790 55%, 0.97938 56%, 0.98076 57%, 0.98205 58%, 0.98325 59%, 0.98438 60%, 0.98542 61%, 0.98640 62%, 0.98731 63%, 0.98816 64%, 0.98895 65%, 0.98969 66%, 0.99038 67%, 0.99103 68%, 0.99163 69%, 0.99219 70%, 0.99271 71%, 0.99320 72%, 0.99365 73%, 0.99408 74%, 0.99448 75%, 0.99485 76%, 0.99519 77%, 0.99551 78%, 0.99581 79%, 0.99609 80%, 0.99636 81%, 0.99660 82%, 0.99683 83%, 0.99704 84%, 0.99724 85%, 0.99742 86%, 0.99760 87%, 0.99776 88%, 0.99791 89%, 0.99805 90%, 0.99818 91%, 0.99830 92%, 0.99841 93%, 0.99852 94%, 0.99862 95%, 0.99871 96%, 0.99880 97%, 0.99888 98%, 0.99895 99%, 1.00000 100%)";
const CURVA = typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)")
  ? EXPO_OUT
  : "cubic-bezier(0.16, 1, 0.3, 1)";
const PROPRIEDADES = ["opacity", "visibility", "transform", "filter"] as const;

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
    const inicio = {
      opacity: String(initialOpacity),
      visibility: initialOpacity > 0 ? "visible" : "hidden",
      transform: "translateY(14px)",
      filter: blur ? "blur(6px)" : "blur(0px)",
    };
    const limpar = () => PROPRIEDADES.forEach((p) => el.style.removeProperty(p));
    Object.assign(el.style, inicio);
    let animacao: Animation | null = null;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observador.disconnect();
        animacao = el.animate(
          [inicio, { opacity: "1", visibility: "visible", transform: "translateY(0px)", filter: "blur(0px)" }],
          { duration, delay, easing: CURVA, fill: "backwards" },
        );
        // O preenchimento "backwards" segura o começo durante a espera; o estilo do bloco volta ao normal.
        limpar();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      animacao?.cancel();
      limpar();
    };
  }, [blur, duration, delay, initialOpacity]);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
