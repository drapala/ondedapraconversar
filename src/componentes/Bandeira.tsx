// Bandeirinha do Brasil simplificada: ícone do logo e do favicon (public/bandeira.svg).

type Props = { largura?: number; className?: string };

export default function Bandeira({ largura = 30, className }: Props) {
  return (
    <svg className={className} width={largura} height={(largura * 14) / 20} viewBox="0 0 20 14" aria-hidden focusable="false">
      <rect width="20" height="14" rx="2" fill="#009c3b" />
      <path fill="#ffdf00" d="M10 1.4 18.4 7 10 12.6 1.6 7Z" />
      <circle cx="10" cy="7" r="3.5" fill="#002776" />
      <path fill="none" stroke="#fff" strokeWidth="0.7" d="M6.6 6.3c2.3-.5 4.8-.1 6.7 1.2" />
    </svg>
  );
}
