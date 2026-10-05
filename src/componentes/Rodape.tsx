// Aviso de que o site é iniciativa independente, sem vínculo com a campanha,
// e o perfil do projeto no Instagram.
//
// Autor: Matheus C. Pestana

import { INSTAGRAM_ARROBA, INSTAGRAM_URL, IconeInstagram } from "./Instagram";

export default function Rodape() {
  return (
    <footer className="rodape">
      <a className="rodape-instagram" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
        <IconeInstagram />
        <span>
          Siga <b>{INSTAGRAM_ARROBA}</b> no Instagram
        </span>
      </a>
      <p>
        Este site é uma iniciativa independente e voluntária. Não pertence à campanha de Lula, ao Partido dos Trabalhadores nem à
        coligação, e não tem vínculo com nenhum deles.
      </p>
      <p className="rodape-assinatura">Responsável pelo conteúdo: Matheus C. Pestana</p>
    </footer>
  );
}
