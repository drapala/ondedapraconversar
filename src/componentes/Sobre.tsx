import type { Indice } from "../dados";
import FadeContent from "../efeitos/FadeContent";
import Estrela from "./Estrela";

export default function Sobre({ indice }: { indice: Indice | null }) {
  const atualizado = indice
    ? new Date(indice.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" })
    : null;
  return (
    <article className="pagina corpo">
      <p className="sobretitulo">Sobre</p>
      <h1 className="titulo-campanha titulo-pagina">O segundo turno se decide na conversa, na virada de voto, com uma pessoa de cada vez.</h1>
      <p className="chamada">Este site mostra, perto de você, onde ainda tem gente que pode votar Lula no dia 25, e que não votou nele no primeiro turno.</p>

      <FadeContent>
        <section className="destaque-conta">
          <Estrela className="destaque-estrela" tamanho={220} />
          <h2>A conta que vira a eleição</h2>
          <p>
            No primeiro turno, muita gente votou em branco, anulou ou ficou em casa. Cada uma dessas pessoas que escolher o Lula no dia 25 é
            um passo a mais na frente para um Brasil melhor.
          </p>
          <p>
            Por isso o site mostra todas as regiões, inclusive onde o Flávio Bolsonaro ganhou. Em muitas delas, só quem votou em branco, anulou ou não
            foi votar já é mais gente que a diferença entre os dois. É ali que uma boa conversa muda o resultado. É ali que podemos mudar o resultado da eleição.
          </p>
        </section>
      </FadeContent>

      <h2>Como funciona</h2>
      <p>
        Você escolhe um ponto: onde está agora, onde você trabalha, um endereço onde frequenta, ou então toque no mapa. O site junta as seções de votação que ficam a até 1
        quilômetro dali e mostra quantos votos dá pra tentar virar para Lula no segundo turno. Entram nessa conta quem votou em branco, quem anulou, quem
        não foi votar e quem votou em outros nomes. Ah, e fique tranquilo: nenhuma informação fica salva. 
      </p>
      <p>
        Seções que funcionam no mesmo lugar viram uma região só. A conversa acontece no entorno: na rua, na feira, na padaria, no ponto de
        ônibus. É para conversar com o povo, ouvir suas preocupações, suas esperanças, suas angustias. É para entender o que o povo quer para o Brasil, e mostrar como Lula vai realizar essas promessas.
      </p>

      <h2>De onde vêm os números</h2>
      <p>
        Dos boletins de urna do primeiro turno, publicados pelo TSE em{" "}
        <a href="https://resultados.tse.jus.br" target="_blank" rel="noreferrer">
          resultados.tse.jus.br
        </a>
        , e do cadastro de locais de votação do TSE, que traz endereço e bairro de cada seção. O próprio boletim diz quantas pessoas
        podiam votar naquela urna e quantas compareceram; a diferença é quem não foi votar. Cada boletim passa por uma conferência: os
        votos para presidente precisam fechar com o número de pessoas que compareceram. As propostas vêm dos programas de
        governo registrados no TSE, sempre com a página.
      </p>
      {indice && (
        <p className="miudo">
          Dados atualizados em {atualizado}, com {indice.boletinsLidos.toLocaleString("pt-BR")} boletins de urna.
        </p>
      )}

      <h2>Quem vai conversar</h2>
      <p>
        Quando você toca em “Vou conversar por aqui”, a região ganha mais uma pessoa. Não pedimos nome, e-mail nem telefone: conta uma vez
        por aparelho. Assim a militância se espalha melhor pela cidade e ninguém fica sozinho no mesmo quarteirão.
      </p>

      <h2>Créditos</h2>
      <p>
        A ideia nasceu inspirada no projeto {" "}
        <a href="https://comomeusvizinhosvotam.com.br/" target="_blank" rel="noreferrer">
          Como meus vizinhos votam
        </a>
        , que permite entender como os votos se distribuem por local de votação. O código dele está aberto no{" "}
        <a href="https://github.com/juliosaulo/como-meus-vizinhos-votam" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
      <p>
        Mapa: colaboradores do{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        , estilo do Humanitarian OpenStreetMap Team, servido pela OSM France. Busca de endereço: Nominatim. Locais de votação que o TSE publicou sem coordenada foram localizados com o Cadastro Nacional de
        Endereços para Fins Estatísticos (CNEFE) do Censo 2022, do IBGE. Efeitos de texto: React Bits.
      </p>
      <p className="assinatura">Feito por MACAPE Pesquisas e Consultoria em Tecnologia Ltda.</p>
    </article>
  );
}
