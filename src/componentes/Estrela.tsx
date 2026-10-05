const PONTAS = Array.from({ length: 10 }, (_, i) => {
  const raio = i % 2 === 0 ? 15 : 15 * 0.382;
  const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${(16 + raio * Math.cos(angulo)).toFixed(2)},${(16.6 + raio * Math.sin(angulo)).toFixed(2)}`;
}).join(" ");

type Props = { tamanho?: number; cor?: string; className?: string };

export default function Estrela({ tamanho = 28, cor = "currentColor", className }: Props) {
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden focusable="false">
      <polygon fill={cor} points={PONTAS} strokeLinejoin="round" stroke={cor} strokeWidth="1.2" />
    </svg>
  );
}
