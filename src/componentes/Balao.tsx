// Balão de conversa: símbolo do site, no logo, no favicon e como enfeite.

type Props = { tamanho?: number; cor?: string; className?: string };

const CONTORNO = "M7 4.5h18a4.5 4.5 0 0 1 4.5 4.5v11a4.5 4.5 0 0 1-4.5 4.5H15l-6.2 5v-5H7A4.5 4.5 0 0 1 2.5 20V9A4.5 4.5 0 0 1 7 4.5Z";

export default function Balao({ tamanho = 28, cor = "currentColor", className }: Props) {
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden focusable="false">
      <path fill={cor} d={CONTORNO} />
    </svg>
  );
}
