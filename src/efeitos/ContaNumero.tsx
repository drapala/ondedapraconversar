import { useEffect, useRef, useState } from "react";
import { fmt } from "../dados";

const suave = (t: number) => 1 - (1 - t) ** 4;

/** Conta do número anterior até o novo, uma vez, quando o valor muda. */
export default function ContaNumero({ valor, duracao = 900 }: { valor: number; duracao?: number }) {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(0);

  useEffect(() => {
    const inicio = anterior.current;
    anterior.current = valor;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || inicio === valor) {
      setMostrado(valor);
      return;
    }
    const t0 = performance.now();
    let quadro = requestAnimationFrame(function passo(agora) {
      const t = Math.min(1, (agora - t0) / duracao);
      setMostrado(Math.round(inicio + (valor - inicio) * suave(t)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    });
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return <span className="numero-vivo">{fmt(mostrado)}</span>;
}
