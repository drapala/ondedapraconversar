// Horário de Brasília (UTC-3, sem horário de verão desde 2019).
// Datas de premissa, a confirmar na Res. TSE 23.760/2026.

export type Fase = "antes" | "conversa" | "pausa" | "votacao" | "encerrada";

const brasilia = (dia: number, hora: number) => Date.UTC(2026, 9, dia, hora + 3);

export const INICIO_CONVERSA = brasilia(5, 17);
export const FIM_CONVERSA = brasilia(24, 22);
export const INICIO_VOTACAO = brasilia(25, 0);
export const FIM_DIA_VOTACAO = brasilia(26, 0);

export function faseEm(agora: number): Fase {
  if (agora < INICIO_CONVERSA) return "antes";
  if (agora < FIM_CONVERSA) return "conversa";
  if (agora < INICIO_VOTACAO) return "pausa";
  if (agora < FIM_DIA_VOTACAO) return "votacao";
  return "encerrada";
}

export function podeMarcar(fase: Fase): boolean {
  switch (fase) {
    case "antes":
    case "conversa":
      return true;
    case "pausa":
    case "votacao":
    case "encerrada":
      return false;
    default: {
      const nunca: never = fase;
      return nunca;
    }
  }
}

export function avisoDaFase(fase: Fase): string | null {
  switch (fase) {
    case "antes":
    case "conversa":
      return null;
    case "pausa":
      return "A conversa na rua terminou no sábado, às 22h. Amanhã é dia de votação.";
    case "votacao":
      return "É dia de votação; não aborde eleitor.";
    case "encerrada":
      return "A votação terminou. Obrigado por cada conversa.";
    default: {
      const nunca: never = fase;
      return nunca;
    }
  }
}
