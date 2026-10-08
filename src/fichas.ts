// Material de conversa. Toda citação é trecho literal, com a página do PDF,
// conferida por scripts/conferir_citacoes.py. Ponte só existe quando há as duas
// citações. Fontes em dados/fichas/. Os fatos da ficha "lula" vêm de
// dados/fichas/registro_lula.json, conferidos por scripts/conferir_fontes.py.

import REGISTRO_LULA from "../dados/fichas/registro_lula.json";

export type Fonte = { texto: string; url: string };
export type Citacao = { quem: string; texto: string; fonte: Fonte };
export type Ponte = { tema: string; tipo: "igual" | "aproximado"; candidato: Citacao; flavio: Citacao; emComum: string };

export type FichaCandidato = {
  tipo: "candidato";
  chave: string;
  titulo: string;
  nome: string;
  abertura: string;
  pontes: Ponte[];
};

export type FichaVoto = {
  tipo: "voto";
  chave: string;
  titulo: string;
  frase: string;
  apoio: string;
  explicacao: string[];
  roteiro: string[];
  cuidado: string;
};

export type PontoLula = { tema: string; fato: Citacao; flavio: Citacao; comoDizer: string; contexto?: Citacao[] };

export type FichaLula = {
  tipo: "lula";
  chave: string;
  titulo: string;
  abertura: string;
  pontos: PontoLula[];
  roteiro: string[];
  cuidado: string;
};

export type Ficha = FichaCandidato | FichaVoto | FichaLula;

const PDF_FLAVIO = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/diretrizesplanodegovernoflaviobolsonaro20272030versaofinal.pdf";
const PDF_CURY = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governoo_brasil_dos_nossos_sonhos.pdf";
const PDF_RENAN = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governo_missao_2026_finalcompressed.pdf";
const PDF_CAIADO = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governo_ronaldo_caiado_presidente.pdf";
const PDF_ZEMA = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/planogoverno10120.pdf";

const flavio = (texto: string, pagina: string): Citacao => ({
  quem: "Flávio Bolsonaro",
  texto,
  fonte: { texto: `Plano de governo de Flávio Bolsonaro (PL), registrado no TSE, p. ${pagina}`, url: PDF_FLAVIO },
});

const FLAVIO_FACCOES = flavio(
  "PCC, CV, milícias e todas as outras facções serão declaradas como organizações narcoterroristas.",
  "13",
);
const FLAVIO_DINHEIRO_CRIME = flavio(
  "Vamos seguir o dinheiro do crime: bloquearemos ativos e desarticularemos a lavagem de dinheiro que sustenta as facções.",
  "13",
);
const FLAVIO_MAIORIDADE = flavio(
  "O novo governo do Brasil vai apoiar e sancionar a redução da maioridade penal de 18 para 16 anos. Vamos punir também maiores de 14 anos que cometerem crimes graves, como estupro, tráfico, tortura e assassinato.",
  "13",
);
const FLAVIO_FRONTEIRA = flavio(
  "Vamos criar o Sistema Nacional de Fronteira, uma tropa de elite do Exército, da Marinha e da Força Aérea Brasileira, equipada com armas de guerra, inteligência e tecnologia, responsável por criar um paredão na fronteira.",
  "13-14",
);
const FLAVIO_ARMAS_DROGAS = flavio(
  "Fuzis e drogas que abastecem 100% das facções serão interceptados por terra, pelos portos e pelo espaço aéreo.",
  "14",
);
const FLAVIO_PRESIDIOS = flavio(
  "O Brasil terá 5 novos presídios de segurança máxima no modelo adotado por El Salvador. Junto com os atuais 5 presídios federais, eles formarão o Complexo Federal de Segurança Máxima.",
  "14",
);
const FLAVIO_TORNOZELEIRA = flavio(
  "E vamos monitorar por tornozeleira eletrônica os agressores sob medida protetiva de maior risco, alertando de imediato as autoridades e a vítima em caso de descumprimento da ordem judicial ou de aproximação indevida.",
  "19",
);
const FLAVIO_PENA_INTEGRAL_MULHER = flavio(
  "Vamos endurecer a lei e obrigar assassinos e agressores de mulheres a cumprir integralmente suas penas.",
  "14",
);
const FLAVIO_PROGRESSAO = flavio(
  "Por isso, o novo Governo do Brasil vai usar toda a sua força para acabar com a progressão de regime de quem comete crimes hediondos.",
  "15",
);
const FLAVIO_RECONHECIMENTO = flavio(
  "Vamos implantar o Muralha Brasileira - um sistema nacional de reconhecimento facial integrado a bancos de dados criminais, inspirado no Smart Sampa, da Prefeitura de São Paulo, e no Muralha Paulista, do Governo do Estado.",
  "15",
);
const FLAVIO_CELULAR = flavio(
  "Criminoso que for pego roubando celular vai ficar preso. Quem furta ou revende um aparelho fruto de crime vai ter a pena inicial quadruplicada, também sem benefícios.",
  "16",
);
const FLAVIO_PRONTUARIO = flavio(
  "Vamos implantar o prontuário eletrônico único, vinculado ao CPF e integrado ao Gov.br, interoperável entre as redes pública e privada, com histórico completo de consultas, exames, vacinas e prescrições, sempre observados o consentimento do paciente, a LGPD, o sigilo médico e os protocolos de segurança",
  "26",
);
const FLAVIO_AGENDA_IA = flavio(
  "Junto disso, vamos completar a digitalização do SUS e usar inteligência artificial para agilizar o agendamento de consultas e exames, ajudando a encaixar o paciente na primeira vaga disponível, para que ninguém mais fique meses aguardando uma marcação que poderia ser resolvida em muito menos tempo.",
  "26",
);
const FLAVIO_TELESSAUDE = flavio(
  "Com a telessaúde e o teleatendimento por aplicativo, médicos de regiões com baixa demanda poderão atender pacientes onde as filas são longas, aproximando o cuidado de quem vive longe de um grande centro.",
  "38",
);
const FLAVIO_SAUDE_MENTAL = flavio(
  "Vamos fortalecer e ampliar a atenção à saúde mental, chegando às famílias que muitas vezes enfrentam tudo sozinhas: o diagnóstico precoce e o apoio às crianças com TDAH; a atenção à depressão e à ansiedade; e o cuidado com os idosos que enfrentam o Alzheimer e outras doenças neurológicas, e com quem cuida deles.",
  "39",
);
const FLAVIO_TEA = flavio(
  "Nossas políticas serão transversais, atravessando todas as áreas do governo, voltadas a ações concretas de garantia de direitos, inclusão e integração social, entre elas a implantação de Centros de Referência em Transtorno do Espectro Autista.",
  "39",
);
const FLAVIO_TEMPO_INTEGRAL = flavio(
  "Apoiamos a escola em tempo integral, para que a criança tenha mais tempo de aprendizado, reforço e atividades formativas, e não fique entregue à própria sorte no contraturno.",
  "35",
);
const FLAVIO_ALFABETIZAR = flavio(
  "O começo de tudo é alfabetizar direito. Vamos priorizar o método fônico, que é o de melhor resultado comprovado pela ciência, ensinando a criança a ligar cada som à sua letra, em vez das abordagens que fracassaram por décadas.",
  "35",
);
const FLAVIO_TECNICO = flavio(
  "Vamos ampliar a oferta de educação técnica para os alunos do ensino médio, para que o jovem saia da escola já com uma profissão na mão, e não apenas com um diploma.",
  "36",
);
const FLAVIO_SANEAMENTO = flavio(
  "E rio limpo também depende de esgoto tratado: uma das maiores agendas ambientais da nossa história foi o Marco Legal do Saneamento, aprovado no governo Bolsonaro, cuja universalização vamos levar adiante, como já detalhado no Brasil que Prospera.",
  "57",
);
const FLAVIO_SEGURO_RURAL = flavio(
  "Vamos ampliar o Seguro Rural e trazer ferramentas de securitização e reorganização das dívidas do setor, dando ao produtor o horizonte de mais de um ano que ele precisa para planejar.",
  "54",
);
const FLAVIO_MINERAIS = flavio(
  "Em vez de somente exportar a pedra bruta e comprar de volta o produto acabado, vamos agregar valor no Brasil, conectando nossa riqueza mineral, nossa energia e a demanda dos data centers e das novas tecnologias numa estratégia única.",
  "55",
);
const FLAVIO_LICENCIAMENTO = flavio(
  "Quando o empreendedor cumpre a lei e apresenta tudo o que a norma exige, o órgão responsável deve ter um prazo definido para concluir a análise.",
  "50",
);
const FLAVIO_REELEICAO = flavio("E propomos o fim da reeleição para o cargo de Presidente da República.", "66");
const FLAVIO_ENXUGAR = flavio(
  "Isso inclui o corte de no mínimo 10 ministérios, a redução de cargos comissionados e de despesas administrativas e o combate aos penduricalhos e supersalários que corroem o orçamento, tudo com um objetivo: mais eficiência e racionalidade para servir à sociedade.",
  "69",
);
const FLAVIO_OCDE = flavio(
  "O passo mais urgente é retomar o cronograma interrompido de adesão à OCDE, incluindo o fim gradual do IOF sobre o câmbio, que é condição obrigatória do processo.",
  "63",
);
const FLAVIO_PROGRAMAS_SOCIAIS = flavio(
  "Por isso, o compromisso é claro e vem em primeiro lugar: vamos manter os programas sociais existentes, com aperfeiçoamento da gestão, correção de distorções e combate às fraudes.",
  "42",
);

const FLAVIO_DIVIDA = flavio(
  "A meta é alcançar, no menor prazo possível, a estabilidade e depois a queda da relação Dívida/PIB, o que puxa os juros para a média internacional e leva a inflação ao centro da meta.",
  "71",
);
const FLAVIO_GASTO_NO_ORCAMENTO = flavio(
  "Vamos fazer o oposto: faremos nossos gastos caberem no orçamento, o que permitirá cobrar menos impostos e não empurrará dívida para as próximas gerações.",
  "71",
);
const FLAVIO_MENOS_IMPOSTO = flavio(
  "Vamos promover a revisão e o redimensionamento da reforma tributária em curso e da majoração de impostos efetuada pelo atual governo, com o objetivo de reduzir efetivamente a carga sobre a produção e o consumo.",
  "30",
);
const FLAVIO_COMIDA = flavio(
  "Vamos criar os Corredores Logísticos Inteligentes, com foco direto na redução do custo de transporte, e ampliar o Seguro Rural, dando previsibilidade a quem planta: safra protegida é oferta garantida, e oferta garantida é preço estável.",
  "31",
);
const FLAVIO_ANTIFRAUDE = flavio(
  "Reeditaremos um pacote antifraude na Previdência, nos moldes do que fizemos em 2019, e não pouparemos esforços para coibir qualquer nova tentativa de roubar o dinheiro de quem já deu sua contribuição ao país.",
  "72",
);

type FatoRegistrado = {
  id: string;
  tema: string;
  orgao: string;
  afirmacao: string;
  publicacao: string;
  fonte: string;
  trecho: string;
  data: string;
  tipo: "dado oficial" | "decisao judicial" | "orgao de controle" | "imprensa";
  fonteImprensa?: string;
  trechoImprensa?: string;
};

// Fato do registro do governo Lula, pelo id. O texto é o trecho literal da fonte primária.
const registro = (id: string): Citacao => {
  const fato = (REGISTRO_LULA as FatoRegistrado[]).find((f) => f.id === id);
  if (!fato) throw new Error(`Fato fora do registro: ${id}`);
  const [ano, mes, dia] = fato.data.split("-");
  return { quem: fato.orgao, texto: fato.trecho, fonte: { texto: `${fato.publicacao}, ${dia}/${mes}/${ano}`, url: fato.fonte } };
};

const citacao = (quem: string, programa: string, url: string) => (texto: string, pagina: string): Citacao => ({
  quem,
  texto,
  fonte: { texto: `${programa}, registrado no TSE, p. ${pagina}`, url },
});

const cury = citacao("Augusto Cury", "Programa de governo de Augusto Cury (Avante)", PDF_CURY);
const renan = citacao("Renan Santos", "Livro Amarelo, programa de governo de Renan Santos (Missão)", PDF_RENAN);
const caiado = citacao("Ronaldo Caiado", "Plano de governo de Ronaldo Caiado (PSD)", PDF_CAIADO);
const zema = citacao("Romeu Zema", "Plano Implacável, programa de governo de Romeu Zema (Novo)", PDF_ZEMA);

export const COMO_PUXAR = [
  "Comece pelo que a pessoa gostou no candidato dela. Quem se sente respeitado baixa a guarda.",
  "Mostre um ponto em comum, com os dois trechos lado a lado. Cada um tem fonte e página, é só tocar.",
  "Não fale mal do candidato dela. Ela quer um país melhor, igual a você. A pergunta agora é quem leva isso adiante no dia 25.",
  "Se ela não decidir na hora, tudo bem. Agradeça e deixe a porta aberta. Voto se decide com tempo.",
];

export const FICHAS: Ficha[] = [
  {
    tipo: "voto",
    chave: "abstencao",
    titulo: "Quem não foi votar",
    frase: "Seu voto vale o mesmo que o de qualquer pessoa no Brasil. Mas só vale dentro da urna. O segundo turno se decide com você.",
    apoio: "No dia 25 o país inteiro escolhe. Quem fica em casa deixa a escolha para os outros, logo cada voto é uma vitória para um Brasil melhor.",
    explicacao: [
      "No segundo turno só contam os votos em Flávio e Lula. Quem não aparece fica fora da conta, e o resultado sai de quem foi.",
      "Faltou no primeiro turno? Pode votar normalmente no dia 25. A falta de agora dá pra justificar depois, pelo aplicativo e-Título.",
    ],
    roteiro: [
      "Pergunte como foi o domingo. Muita gente não votou por causa do trabalho, de um filho doente, da distância, da falta de tempo ou de esperança.",
      "Deixe a pessoa falar. Quem se sente ouvido escuta de volta.",
      "Conte que ela pode votar no dia 25, mesmo tendo faltado agora.",
      "Pergunte o que mais pesa no mês dela: o preço da comida, a fila do posto, a escola das crianças. Abra as Propostas e mostre o que o Flávio vai fazer sobre isso.",
      "Na despedida, um convite simples: dia 25, vai lá. Sua voz faz falta. Se você não votar, a gente não pode reclamar com quem ganhou.",
    ],
    cuidado: "Nunca ofereça carona, comida, dinheiro ou favor em troca do voto. É crime, e a conversa perde todo o valor. E se a pessoa não quiser votar, não force.",
  },
  {
    tipo: "voto",
    chave: "branco",
    titulo: "Quem votou em branco",
    frase: "Voto em branco é uma página que outra pessoa vai escrever por você.",
    apoio: "No dia 25 são só dois nomes. Escolher um deles é o jeito de a sua opinião entrar na conta.",
    explicacao: [
      "O voto em branco não vai para ninguém. Nem para quem está ganhando, nem para quem está perdendo. Ele simplesmente fica fora da conta.",
      "Quem decide o segundo turno é quem escolhe o Flávio ou o Lula. Cada voto em branco deixa a decisão do país na mão de menos gente.",
    ],
    roteiro: [
      "Pergunte, com curiosidade de verdade, por que a pessoa votou em branco.",
      "Quase sempre é cansaço. Diga que você entende: política cansa mesmo. Não ser ouvido cansa. Não ter esperança cansa. Mas votar branco não resolve nada. A escolha fica com os outros.",
      "Conte, do jeito mais simples que puder, que o branco não soma para ninguém e que a escolha fica com os outros.",
      "Pergunte o que ela quer ver mudar e mostre a proposta do Flávio sobre isso, na página de Propostas.",
      "Feche com calma: dessa vez, escreve você.",
    ],
    cuidado: "Não diga que o branco vai para quem está ganhando. Não é verdade, e a pessoa passa a desconfiar de todo o resto.",
  },
  {
    tipo: "voto",
    chave: "nulo",
    titulo: "Quem anulou o voto",
    frase: "Sua raiva tem motivo. No voto nulo, ela fica sem endereço.",
    apoio: "No dia 25 dá pra transformar essa raiva em escolha.",
    explicacao: [
      "O voto nulo não conta para ninguém e não cancela a eleição, por mais nulos que haja. Essa história de que muito nulo anula tudo é boato antigo.",
      "O segundo turno sai só dos votos no Flávio e no Lula. Quem anula sai da conta e deixa os outros decidirem.",
    ],
    roteiro: [
      "Pergunte o que fez a pessoa anular. Deixe ela desabafar até o fim.",
      "Não brigue com a raiva. Concorde com o que for justo.",
      "Conte que o nulo não derruba a eleição e não entra na conta.",
      "Mostre a proposta do Flávio que responde ao que mais incomoda ela.",
      "Termine com uma pergunta: e se dessa vez a sua raiva tivesse endereço?",
    ],
    cuidado: "Não chame o nulo de burrice nem de voto jogado fora. Quem se sente humilhado não volta a conversar.",
  },
  {
    tipo: "lula",
    chave: "lula",
    titulo: "Quem votou no Lula",
    abertura: "Quem votou no Lula queria comida mais barata, aposentado respeitado e um país que cuida de quem tem menos. Abaixo, o que os números oficiais mostram sobre os últimos anos, cada um com a fonte, e o que o programa do Flávio propõe para cada ponto.",
    pontos: [
      {
        tema: "Preço da comida",
        fato: registro("alimentos-2024"),
        flavio: FLAVIO_COMIDA,
        comoDizer: "Pergunte como está a conta do mercado. Em 2024 a comida subiu 7,69%, segundo o IBGE. O Flávio quer baixar o custo do frete e proteger a safra, para o preço ficar estável.",
      },
      {
        tema: "Aposentado lesado no INSS",
        fato: registro("inss-entrevistas-cgu"),
        flavio: FLAVIO_ANTIFRAUDE,
        contexto: [registro("inss-cgu-historico"), registro("inss-descontos-ate-abril-2025")],
        comoDizer: "O problema vem de antes deste governo: a CGU conta que já tinha havido uma suspensão em 2019. Mesmo assim o INSS seguiu assinando acordos, e os descontos cresceram muito a partir de julho de 2023. A CGU entrevistou 1.273 pessoas com desconto na folha, e 1.242 disseram que não autorizaram. Os descontos só pararam em abril de 2025. Pergunte se ela conhece alguém que caiu nisso. O Flávio promete um pacote antifraude na Previdência.",
      },
      {
        tema: "Peso dos impostos",
        fato: registro("carga-tributaria-2024"),
        flavio: FLAVIO_MENOS_IMPOSTO,
        comoDizer: "Segundo o Tesouro, em 2024 os impostos chegaram a 32,32% de tudo o que o país produziu. O Flávio quer rever os aumentos de imposto e aliviar o que se paga no consumo.",
      },
      {
        tema: "Dívida do governo",
        fato: registro("divida-bruta-2025"),
        flavio: FLAVIO_DIVIDA,
        comoDizer: "Segundo o Banco Central, a dívida do governo subiu 2,4 pontos em um ano e fechou 2025 em 78,7% do PIB. O Flávio quer estabilizar e depois baixar essa dívida, e diz que isso puxa o juro para baixo.",
      },
      {
        tema: "Gasto maior que a receita",
        fato: registro("deficit-primario-2025"),
        flavio: FLAVIO_GASTO_NO_ORCAMENTO,
        comoDizer: "Em 2025 o setor público gastou R$ 55,0 bilhões a mais do que arrecadou, sem contar os juros, segundo o Banco Central. É como a casa que fecha o mês no vermelho. O Flávio quer o gasto cabendo no orçamento.",
      },
    ],
    roteiro: [
      "Comece respeitando o voto. A pessoa votou no Lula pensando no bem do país e da família. Diga isso em voz alta.",
      "Não fale mal do Lula nem de quem votou nele. Quem se sente atacado defende o voto em vez de pensar nele.",
      "Pergunte o que mais incomodou nos últimos anos: o mercado, os impostos, o aposentado da família.",
      "Mostre o fato sobre esse ponto, com a fonte, e logo ao lado a proposta do Flávio. Deixe ela ler sem pressa.",
      "Se ela não mudar de ideia agora, tudo bem. Agradeça a conversa e deixe a porta aberta até o dia 25.",
    ],
    cuidado: "Nunca diga que a fonte diz mais do que diz, e nunca ataque quem a pessoa é. Mostre o fato e deixe ela tirar a conclusão.",
  },
  {
    tipo: "candidato",
    chave: "cury",
    titulo: "Quem votou no Augusto Cury",
    nome: "Augusto Cury",
    abertura: "O programa do Cury fala de fronteira vigiada pelas Forças Armadas, de tirar o dinheiro do crime, de prontuário digital, de saúde mental e de escola em tempo integral. Ele também é contra a reeleição. Nisso tudo, o programa do Flávio diz a mesma coisa.",
    pontes: [
      {
        tipo: "igual",
        tema: "Forças Armadas na fronteira",
        candidato: cury(
          "De forma integrada e respeitando as competências constitucionais de cada instituição, fortaleceremos a atuação das Forças Armadas no controle estratégico das fronteiras nacionais, intensificando a presença do Exército nas fronteiras terrestres, da Marinha nos portos e vias navegáveis estratégicas e da Força Aérea Brasileira no monitoramento e repressão ao uso de pistas clandestinas e rotas aéreas ilícitas, especialmente para combater o tráfico internacional de drogas, armas e o contrabando.",
          "46",
        ),
        flavio: FLAVIO_FRONTEIRA,
        emComum: "Os dois querem Exército, Marinha e Aeronáutica juntos na fronteira para barrar droga e arma.",
      },
      {
        tipo: "igual",
        tema: "Fim da reeleição",
        candidato: cury("Sou contra a reeleição, pois considero que ela seja uma das fontes da corrupção.", "155"),
        flavio: FLAVIO_REELEICAO,
        emComum: "Os dois são contra a reeleição para presidente.",
      },
      {
        tipo: "igual",
        tema: "Tirar o dinheiro do crime",
        candidato: cury(
          "Atuaremos para enfraquecer suas estruturas financeiras, logísticas e operacionais, intensificando o combate ao tráfico de drogas, armas, lavagem de dinheiro e crimes cibernéticos, com atenção em especial, no combate aos golpistas que cometem crimes contra idosos e demais cidadãos.",
          "45",
        ),
        flavio: FLAVIO_DINHEIRO_CRIME,
        emComum: "Os dois querem atacar a lavagem de dinheiro, que é o que mantém as facções de pé.",
      },
      {
        tipo: "igual",
        tema: "Câmera e tecnologia contra o crime",
        candidato: cury(
          "A segurança pública será fortalecida pelo uso de câmeras inteligentes, reconhecimento de padrões, análise preditiva, drones, monitoramento integrado e inteligência artificial.",
          "46",
        ),
        flavio: FLAVIO_RECONHECIMENTO,
        emComum: "Os dois querem câmeras inteligentes e tecnologia para achar bandido e evitar crime.",
      },
      {
        tipo: "igual",
        tema: "Agressor vigiado de perto",
        candidato: cury(
          "Ampliaremos o uso de botões de alerta com geolocalização, aplicativos de emergência, monitoramento eletrônico de agressores nos casos determinados judicialmente, centrais integradas e protocolos de resposta prioritária para mulheres ameaçadas.",
          "88",
        ),
        flavio: FLAVIO_TORNOZELEIRA,
        emComum: "Os dois querem tornozeleira no agressor, para a mulher ameaçada não ficar sozinha.",
      },
      {
        tipo: "igual",
        tema: "Prontuário digital e fila menor",
        candidato: cury(
          "Nossa prioridade será fortalecer sua gestão por meio da digitalização dos prontuários, integração dos sistemas, redução das filas, melhoria da eficiência administrativa e utilização de indicadores de desempenho para aprimorar continuamente os serviços prestados.",
          "44",
        ),
        flavio: FLAVIO_PRONTUARIO,
        emComum: "Os dois querem o prontuário digital e integrado, para o paciente não repetir exame nem história.",
      },
      {
        tipo: "igual",
        tema: "Consulta a distância no SUS",
        candidato: cury(
          "Nosso objetivo é fazer do Brasil a maior plataforma pública de medicina digital do mundo, democratizando o acesso à saúde, reduzindo desigualdades e aproximando médicos e pacientes por meio da tecnologia, sem perder aquilo que nenhuma máquina poderá substituir: o cuidado humano.",
          "161",
        ),
        flavio: FLAVIO_TELESSAUDE,
        emComum: "Os dois querem consulta a distância, para que morar longe deixe de ser motivo para ficar sem médico.",
      },
      {
        tipo: "igual",
        tema: "Saúde mental",
        candidato: cury(
          "Implantaremos uma ampla política nacional de saúde mental envolvendo escolas, empresas, universidades, forças de segurança, unidades de saúde e comunidades, promovendo prevenção, acolhimento e tratamento humanizado.",
          "44",
        ),
        flavio: FLAVIO_SAUDE_MENTAL,
        emComum: "Os dois querem ampliar o cuidado com a saúde mental, da criança ao idoso.",
      },
      {
        tipo: "igual",
        tema: "Autismo e neurodivergência",
        candidato: cury(
          "O Projeto Brasil Neuroinclusivo institui uma política permanente de Estado para acolher crianças, adolescentes e adultos neurodivergentes, particularmente pessoas com autismo, TDAH, dislexia, transtornos de aprendizagem e altas habilidades.",
          "81",
        ),
        flavio: FLAVIO_TEA,
        emComum: "Os dois querem uma política do governo inteiro para quem tem autismo, TDAH e outras neurodivergências.",
      },
      {
        tipo: "igual",
        tema: "Escola em tempo integral",
        candidato: cury("Não existe nação desenvolvida sem educação de excelência em tempo integral.", "68"),
        flavio: FLAVIO_TEMPO_INTEGRAL,
        emComum: "Os dois apoiam a escola em tempo integral.",
      },
      {
        tipo: "igual",
        tema: "Criança lendo na idade certa",
        candidato: cury(
          "Investiremos na alfabetização na idade certa, na melhoria da aprendizagem, na valorização dos professores e na redução das desigualdades educacionais.",
          "43",
        ),
        flavio: FLAVIO_ALFABETIZAR,
        emComum: "Os dois põem a alfabetização no começo de tudo. O Flávio diz com qual método: o fônico.",
      },
      {
        tipo: "igual",
        tema: "Água e esgoto para todo mundo",
        candidato: cury(
          "Fazer cumprir o Marco Legal do Saneamento Básico como prioridade nacional por representar uma das políticas públicas de maior impacto sobre a saúde, a qualidade de vida, a preservação ambiental e a redução dos gastos públicos com doenças evitáveis.",
          "50",
        ),
        flavio: FLAVIO_SANEAMENTO,
        emComum: "Os dois querem cumprir o Marco Legal do Saneamento, que foi aprovado no governo Bolsonaro.",
      },
      {
        tipo: "igual",
        tema: "Casa com escritura",
        candidato: cury(
          "O objetivo será acelerar a regularização das moradias utilizando a legislação da REURB, simplificando procedimentos e estabelecendo uma grande cooperação entre União, Estados, municípios, cartórios, universidades, conselhos profissionais e comunidades.",
          "105",
        ),
        flavio: flavio(
          "Assim, a família que já mora há anos no mesmo lugar tem a escritura no próprio nome — de preferência, no nome da mulher, como prevê o Brasil por Elas.",
          "47",
        ),
        emComum: "Os dois querem dar escritura para a casa de quem já mora nela.",
      },
      {
        tipo: "igual",
        tema: "Licença com prazo para sair",
        candidato: cury(
          "Estabeleceremos prazos máximos legais para o licenciamento ambiental, sanitário e de outorga de água, com procedimento digital integrado entre União, Estados e Municípios e classificação por nível de risco, concentrando a análise técnica detalhada nos empreendimentos de maior impacto e simplificando os de impacto reduzido.",
          "47",
        ),
        flavio: FLAVIO_LICENCIAMENTO,
        emComum: "Os dois querem prazo definido para o governo responder a um pedido de licença.",
      },
      {
        tipo: "igual",
        tema: "Seguro para quem planta",
        candidato: cury(
          "Ampliaremos significativamente a cobertura do Programa de Subvenção ao Prêmio do Seguro Rural (PSR), garantindo que o produtor tenha um antídoto contra eventos climáticos extremos.",
          "49",
        ),
        flavio: FLAVIO_SEGURO_RURAL,
        emComum: "Os dois querem ampliar o seguro rural, para o produtor não perder tudo quando o clima castiga.",
      },
      {
        tipo: "igual",
        tema: "Vacina feita aqui",
        candidato: cury(
          "Ampliaremos a capacidade nacional de pesquisa, desenvolvimento e fabricação de medicamentos, vacinas, equipamentos médicos e produtos biotecnológicos, fortalecendo nossa autonomia e ampliando as exportações de produtos de alto valor agregado.",
          "41",
        ),
        flavio: flavio(
          "Vamos ainda ampliar o acesso a exames preventivos e manter a imunização e o incentivo à produção nacional de vacinas, porque prevenir é sempre mais barato e mais humano do que tratar tarde.",
          "37",
        ),
        emComum: "Os dois querem o Brasil fabricando as próprias vacinas.",
      },
      {
        tipo: "igual",
        tema: "Minério transformado aqui",
        candidato: cury(
          "Nossa política será agregar valor a essas riquezas naturais por meio da industrialização, evitando a simples exportação de matéria-prima.",
          "41",
        ),
        flavio: FLAVIO_MINERAIS,
        emComum: "Os dois querem transformar o minério aqui, em vez de só exportar a pedra bruta.",
      },
      {
        tipo: "aproximado",
        tema: "Facção sem comando de dentro da cadeia",
        candidato: cury(
          "O sistema penitenciário será reformado com foco em educação, trabalho e ressocialização efetiva, combatendo a superlotação e a ação das facções dentro dos presídios.",
          "47",
        ),
        flavio: flavio(
          "Com isso, os bandidos vão deixar de controlar as facções criminosas de dentro dos presídios, como ocorre hoje.",
          "14",
        ),
        emComum: "Os dois querem acabar com a facção mandando de dentro do presídio. O Cury põe mais peso em educação e trabalho para o preso; o Flávio, em presídio de segurança máxima.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "renan",
    titulo: "Quem votou no Renan Santos",
    nome: "Renan Santos",
    abertura: "O Renan quer presídio de segurança máxima no modelo de El Salvador, reconhecimento facial, pena maior para roubo de celular, método fônico na escola e fim dos supersalários. O programa do Flávio propõe as mesmas coisas.",
    pontes: [
      {
        tipo: "igual",
        tema: "Presídio de segurança máxima no modelo de El Salvador",
        candidato: renan(
          "As lideranças condenadas serão deslocadas a superpresídios de segurança máxima em regiões remotas, no modelo do CECOT salvadorenho, equipados com blindagem eletromagnética e biometria contínua, neutralizando o comando das facções a partir do cárcere.",
          "13",
        ),
        flavio: FLAVIO_PRESIDIOS,
        emComum: "Os dois usam o mesmo exemplo: presídios de segurança máxima no modelo de El Salvador, para isolar os chefes das facções.",
      },
      {
        tipo: "igual",
        tema: "Reconhecimento facial",
        candidato: renan(
          "Um novo sistema de drones e totens de denúncia transformará a reação ao crime em prevenção, com patrulhamento autônomo e reconhecimento facial em tempo real, integrado ao uso de dados genéticos e identificação facial para a resolução de crimes hediondos.",
          "13",
        ),
        flavio: FLAVIO_RECONHECIMENTO,
        emComum: "Os dois querem reconhecimento facial ligado aos bancos de dados da polícia.",
      },
      {
        tipo: "igual",
        tema: "Pena maior para roubo de celular",
        candidato: renan(
          "Leis específicas deverão endereçar a reincidência e os roubos de eletrônicos, aumentando penas e criando efeitos dissuasivos para os crimes que mais aterrorizam o brasileiro comum.",
          "13",
        ),
        flavio: FLAVIO_CELULAR,
        emComum: "Os dois querem pena maior para quem rouba celular, o crime que mais assusta quem anda na rua.",
      },
      {
        tipo: "igual",
        tema: "Porto, aeroporto e fronteira vigiados",
        candidato: renan(
          "No primeiro front, vamos reconquistar o controle estatal sobre portos, aeroportos e fronteiras secas com scanners tridimensionais e inteligência integrada; implementar sistemas de monitoramento aéreo, espacial e amazônico; e apertar os mecanismos de asfixia financeira que cortam o oxigênio econômico das facções.",
          "13",
        ),
        flavio: flavio(
          "Nós vamos usar tropas especiais da Marinha e da Aeronáutica para ocupar e monitorar, de forma permanente, os portos e aeroportos brasileiros.",
          "15",
        ),
        emComum: "Os dois querem o Estado no controle dos portos e aeroportos, por onde passa a droga.",
      },
      {
        tipo: "igual",
        tema: "Alfabetização pelo método fônico",
        candidato: renan(
          "Também buscaremos a adoção universal do sistema fônico de alfabetização, que se encontra amparado pelas melhores evidências científicas disponíveis, dando aliás respaldo a uma orientação que já se encontra contemplada na BNCC e na Política Nacional de Alfabetização.",
          "31",
        ),
        flavio: FLAVIO_ALFABETIZAR,
        emComum: "Os dois querem alfabetizar pelo método fônico.",
      },
      {
        tipo: "igual",
        tema: "Ninguém passa de ano sem aprender",
        candidato: renan("Outra proposta é mitigar a progressão continuada nas escolas em que ela ainda vigora integralmente.", "31"),
        flavio: flavio("O objetivo é claro: ninguém avança de série sem ter aprendido.", "35"),
        emComum: "Os dois querem acabar com o aluno passando de ano sem ter aprendido a matéria.",
      },
      {
        tipo: "igual",
        tema: "Prontuário único",
        candidato: renan(
          "Criação do PRONTO (Prontuário Eletrônico Nacional Interoperável) que irá conectar a atenção primária, os serviços especializados, os hospitais públicos e privados, laboratórios e farmácias, servindo de repositório para todas as informações do paciente acessíveis a qualquer tempo.",
          "26",
        ),
        flavio: FLAVIO_PRONTUARIO,
        emComum: "Os dois querem um prontuário eletrônico único, ligando a rede pública e a privada.",
      },
      {
        tipo: "igual",
        tema: "Consulta a distância e inteligência artificial na saúde",
        candidato: renan(
          "Criação de um sistema digital de saúde, que combine telemedicina, diagnósticos por IA, monitoramento clínico e histórico permanente, inspirado no DoctorSV, de El Salvador.",
          "26",
        ),
        flavio: FLAVIO_TELESSAUDE,
        emComum: "Os dois querem consulta a distância no SUS, para quem mora longe dos grandes centros.",
      },
      {
        tipo: "aproximado",
        tema: "Fila do SUS que anda",
        candidato: renan(
          "A ideia central de nossa proposta é criar a ENER, um sistema de fila viva, que não fique engessado na ordem cronológica, mas atenda critérios objetivos de prioridade relativos ao estado do paciente.",
          "25",
        ),
        flavio: FLAVIO_AGENDA_IA,
        emComum: "Os dois querem mudar o jeito de marcar consulta para a fila andar. O Renan ordena pela gravidade; o Flávio usa inteligência artificial para achar a primeira vaga.",
      },
      {
        tipo: "igual",
        tema: "O Nordeste é solução",
        candidato: renan(
          "Tratado por décadas como um problema a ser socorrido, o Nordeste é, na verdade, a solução à espera de coordenação.",
          "34",
        ),
        flavio: flavio(
          "O Nordeste é uma região de gente trabalhadora e de enorme potencial. Por tempo demais foi tratado como problema, quando sempre foi solução.",
          "60",
        ),
        emComum: "Os dois usam quase as mesmas palavras: o Nordeste não é problema, é solução.",
      },
      {
        tipo: "igual",
        tema: "Terras raras transformadas aqui",
        candidato: renan("Riqueza no subsolo não basta; sem ciência e indústria, exporta-se minério e importa-se dependência.", "37"),
        flavio: FLAVIO_MINERAIS,
        emComum: "Os dois querem transformar o minério aqui, em vez de só exportar a pedra bruta.",
      },
      {
        tipo: "igual",
        tema: "Mais trilho",
        candidato: renan(
          "Ferrovias: meta mínima de 40 mil km de malha; conclusão antecipada da Ferrovia Alcântara-Açailândia, conclusão da Ferrovia de Integração Oeste-Leste (FIOL), início imediato das obras da Ferrogrão e viabilização da Ferrovia Transoceânica.",
          "24",
        ),
        flavio: flavio(
          "No transporte ferroviário, vamos destravar a Ferrogrão; adotar o trem de cargas que ligará Mato Grosso, o oeste do Paraná e Santa Catarina; implantar o Trem do Nordeste, uma malha de passageiros ligando capitais da região, para aproximar cidades, movimentar o turismo e integrar o Nordeste; e concluir a Transnordestina e ampliar o seu escopo para que a Paraíba e o Rio Grande do Norte sejam contemplados.",
          "51",
        ),
        emComum: "Os dois querem mais ferrovia, e os dois citam a Ferrogrão.",
      },
      {
        tipo: "igual",
        tema: "Linhas de transmissão para a energia do Nordeste",
        candidato: renan(
          "Energia: marco regulatório da transmissão de energia, com desbloqueio do gargalo que hoje impõe curtailment massivo ao Nordeste, retomada decisiva das obras de Angra 3, exploração do hidrogênio verde com abertura para a bacia amazônica, e atenção à fusão nuclear.",
          "24",
        ),
        flavio: flavio(
          "O Programa Nacional de Segurança Energética deverá ter foco em refino, processamento, escoamento e transporte de combustíveis e gás, permitir a exploração do gás não convencional (fracking) com responsabilidade ambiental e cumprindo a lei, e expandir e modernizar a rede de transmissão, integrando novas fontes renováveis e reduzindo congestionamentos.",
          "52",
        ),
        emComum: "Os dois querem mais linhas de transmissão, para não desperdiçar a energia do sol e do vento.",
      },
      {
        tipo: "igual",
        tema: "Fim dos supersalários",
        candidato: renan(
          "Reconhecendo o valor do trabalho técnico e intelectual do CDPP, selecionamos as propostas mais interessantes e as traduzimos à realidade política de hoje e ao nosso entendimento do Brasil: a racionalização do superávit financeiro, a reforma do funcionalismo público com fim dos supersalários, mudanças nas emendas parlamentares, redução das isenções fiscais e uma nova lei complementar das finanças públicas.",
          "10",
        ),
        flavio: FLAVIO_ENXUGAR,
        emComum: "Os dois querem acabar com os supersalários no serviço público.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "caiado",
    titulo: "Quem votou no Ronaldo Caiado",
    nome: "Ronaldo Caiado",
    abertura: "O Caiado quer facção tratada como terrorismo, maioridade penal aos 16, presídio de segurança máxima e fim da reeleição. O programa do Flávio propõe as mesmas coisas. E os dois prometem manter a ajuda na conta de luz e os programas sociais, ligando o benefício ao trabalho.",
    pontes: [
      {
        tipo: "igual",
        tema: "Facção tratada como terrorismo",
        candidato: caiado(
          "Propor legislação que enquadre como terrorismo doméstico as organizações criminosas e milícias que apresentem estrutura permanente de comando, domínio territorial, capacidade armada, poder econômico e uso sistemático da violência para controlar populações ou restringir a atuação do Estado",
          "17",
        ),
        flavio: FLAVIO_FACCOES,
        emComum: "Os dois querem tratar PCC, CV e milícias como terroristas.",
      },
      {
        tipo: "igual",
        tema: "Maioridade penal aos 16 anos",
        candidato: caiado(
          "Trabalhar fortemente pela aprovação da PEC da redução da maioridade penal para 16 (dezesseis) anos",
          "20",
        ),
        flavio: FLAVIO_MAIORIDADE,
        emComum: "Os dois querem baixar a maioridade penal para 16 anos.",
      },
      {
        tipo: "igual",
        tema: "Presídio de segurança máxima",
        candidato: caiado(
          "Criar uma Rede Nacional de Presídios de Segurança Máxima, com padrões comuns para unidades federais e estaduais.",
          "18",
        ),
        flavio: FLAVIO_PRESIDIOS,
        emComum: "Os dois querem mais presídios de segurança máxima, para isolar os chefes das facções.",
      },
      {
        tipo: "igual",
        tema: "Furto de celular com pena de roubo",
        candidato: caiado(
          "Alterar os arts. 155 e 157 do Decreto-Lei nº 2.848, de 7 de dezembro de 1940 (Código Penal), para agravar a punição da “subtração mediante arrebatamento diretamente exercido contra a vítima” (furto) de telefone celular, smartphone, tablet com capacidade de comunicação móvel ou dispositivo equivalente destinado à comunicação eletrônica pessoal, equiparando ao crime de roubo.",
          "20",
        ),
        flavio: FLAVIO_CELULAR,
        emComum: "Os dois querem punir mais quem furta e quem rouba celular.",
      },
      {
        tipo: "aproximado",
        tema: "Agressor de mulher cumprindo a pena",
        candidato: caiado(
          "Endurecer a resposta penal aos crimes de feminicídio, tentativa de feminicídio e lesão corporal grave ou gravíssima contra a mulher, com progressão somente após o cumprimento de 90% da pena e confisco (perdimento) total dos bens do condenado, destinados à vítima e, quando cabível, a seus filhos ou familiares, na forma da lei.",
          "19",
        ),
        flavio: FLAVIO_PENA_INTEGRAL_MULHER,
        emComum: "Os dois querem o agressor de mulher cumprindo a pena na cadeia. O Caiado fala em 90% da pena; o Flávio, na pena inteira.",
      },
      {
        tipo: "igual",
        tema: "Agressor vigiado de perto",
        candidato: caiado(
          "Expandir monitoramento eletrônico de agressores de alto risco, botão de emergência e patrulhas especializadas, com decisão judicial e resposta rápida.",
          "58",
        ),
        flavio: FLAVIO_TORNOZELEIRA,
        emComum: "Os dois querem tornozeleira nos agressores de maior risco, com alerta rápido.",
      },
      {
        tipo: "igual",
        tema: "Tirar o dinheiro do crime",
        candidato: caiado(
          "A União deixará de assistir à expansão do crime organizado e passará a liderar, junto com governadores e prefeitos, a integração da inteligência, a proteção das fronteiras, a asfixia financeira das organizações criminosas, a modernização das investigações e a retomada do controle dos presídios.",
          "2",
        ),
        flavio: FLAVIO_DINHEIRO_CRIME,
        emComum: "Os dois querem atacar o dinheiro das facções, que é o que mantém o crime de pé.",
      },
      {
        tipo: "igual",
        tema: "Fim da reeleição",
        candidato: caiado(
          "Encaminhar ao Congresso, no início do mandato, proposta de emenda à Constituição para extinguir a reeleição consecutiva para os cargos do Poder Executivo, com aplicação inclusive ao mandato presidencial iniciado em 2027.",
          "8",
        ),
        flavio: FLAVIO_REELEICAO,
        emComum: "Os dois querem acabar com a reeleição para presidente.",
      },
      {
        tipo: "igual",
        tema: "Fim dos supersalários",
        candidato: caiado(
          "Aplicar o teto constitucional de forma efetiva em todos os Poderes e órgãos, com transparência das parcelas remuneratórias e responsabilização de pagamentos incompatíveis com a Constituição.",
          "12",
        ),
        flavio: FLAVIO_ENXUGAR,
        emComum: "Os dois querem acabar com o salário acima do teto no serviço público.",
      },
      {
        tipo: "igual",
        tema: "Brasil na OCDE",
        candidato: caiado(
          "Participar ativamente da ONU, da OMC, do G20 e do BRICS e retomar, com pragmatismo, o processo de aproximação com a OCDE.",
          "74",
        ),
        flavio: FLAVIO_OCDE,
        emComum: "Os dois querem retomar o caminho para o Brasil entrar na OCDE.",
      },
      {
        tipo: "igual",
        tema: "Prontuário que acompanha o paciente",
        candidato: caiado(
          "A saúde preservará os princípios do SUS, mas mudará sua capacidade de entrega: cuidado preventivo, atendimento perto de casa, prontuário interoperável, fila transparente, especialista no tempo certo e hospitais remunerados por qualidade e resultado.",
          "2",
        ),
        flavio: FLAVIO_PRONTUARIO,
        emComum: "Os dois querem o prontuário que conversa entre um posto e outro, para o paciente não repetir tudo.",
      },
      {
        tipo: "igual",
        tema: "Ajuda na conta de luz mantida",
        candidato: caiado(
          "Manter e aperfeiçoar a gratuidade da energia elétrica para as famílias de baixa renda, com atualização permanente dos cadastros, integração de bases de dados e mecanismos efetivos de prevenção a fraudes.",
          "36",
        ),
        flavio: flavio(
          "Vamos simplificar a conta de luz, racionalizando encargos e subsídios cruzados, e promover a redução gradual da CDE e das fontes incentivadas, mantida a tarifa social para quem mais precisa dela.",
          "31",
        ),
        emComum: "Os dois prometem manter a ajuda na conta de luz para quem tem pouco.",
      },
      {
        tipo: "igual",
        tema: "Bolsa mantida, ligada a trabalho",
        candidato: caiado(
          "Manteremos a rede de transferência de renda para quem precisa, mas conectaremos benefícios a qualificação, cuidado infantil, inclusão produtiva, habitação, saúde e educação.",
          "2",
        ),
        flavio: flavio(
          "Por isso, o beneficiário de programa social terá prioridade em todas as ações do Estado voltadas ao trabalho: prioridade nos programas de primeiro emprego, nas ações de qualificação profissional e na intermediação de mão de obra.",
          "43",
        ),
        emComum: "Os dois mantêm os programas sociais e querem que eles abram caminho para o trabalho.",
      },
      {
        tipo: "aproximado",
        tema: "Apostas que afundam a família",
        candidato: caiado(
          "Tratar como questão de saúde pública o superendividamento, limitando através da criação de um teto, e a exploração de públicos vulneráveis produzidos pelas apostas.",
          "19",
        ),
        flavio: flavio(
          "Vamos proibir o uso dos recursos dos programas sociais para apostas, porque dinheiro destinado a pôr comida na mesa não pode escoar para a casa de apostas, e promover campanhas educativas e de conscientização sobre os riscos do endividamento com jogos.",
          "33",
        ),
        emComum: "Os dois querem proteger a família da dívida com apostas. O Caiado propõe um teto; o Flávio proíbe usar dinheiro de programa social em aposta.",
      },
      {
        tipo: "igual",
        tema: "Seguro para quem planta",
        candidato: caiado(
          "Estruturar um sistema nacional de seguro rural com participação pública e privada, vinculado à política de crédito.",
          "23",
        ),
        flavio: FLAVIO_SEGURO_RURAL,
        emComum: "Os dois querem um seguro rural mais forte.",
      },
      {
        tipo: "igual",
        tema: "Água e esgoto para todo mundo",
        candidato: caiado(
          "Cumprir e acelerar as metas do marco legal do saneamento (universalização até 2033), água tratada e coleta e tratamento de esgoto para todos os brasileiros, tratando o tema como prioridade de saúde pública, dignidade e desenvolvimento regional, e preservando a segurança regulatória que destravou o maior ciclo de investimento privado da história do setor.",
          "48",
        ),
        flavio: FLAVIO_SANEAMENTO,
        emComum: "Os dois querem cumprir o Marco Legal do Saneamento, que foi aprovado no governo Bolsonaro.",
      },
      {
        tipo: "igual",
        tema: "Criança lendo na idade certa",
        candidato: caiado(
          "Apoiar estados e municípios para que todas as crianças leiam, escrevam, compreendam e dominem fundamentos matemáticos até o fim do 2º ano.",
          "32",
        ),
        flavio: FLAVIO_ALFABETIZAR,
        emComum: "Os dois põem a alfabetização no começo de tudo.",
      },
      {
        tipo: "igual",
        tema: "Escola em tempo integral",
        candidato: caiado("Priorizar alfabetização, recomposição de aprendizagem, tempo integral e ensino médio com educação profissional.", "65"),
        flavio: FLAVIO_TEMPO_INTEGRAL,
        emComum: "Os dois apoiam a escola em tempo integral.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "zema",
    titulo: "Quem votou no Romeu Zema",
    nome: "Romeu Zema",
    abertura: "O Zema quer facção tratada como terrorismo, maioridade penal menor, presídio de segurança máxima, menos ministérios, fim das decisões de um ministro só no STF e o Brasil na OCDE. O programa do Flávio propõe tudo isso.",
    pontes: [
      {
        tipo: "igual",
        tema: "Facção tratada como terrorismo",
        candidato: zema(
          "Enquadrar como terroristas os criminosos que usam táticas e armamentos de guerra para dominar territórios, de modo a permitir o uso da Força Nacional, das Forças Armadas, dos órgãos de controle e da colaboração internacional para combatê-los, além de garantir penas mais altas e a impossibilidade de progressão de regime.",
          "5",
        ),
        flavio: FLAVIO_FACCOES,
        emComum: "Os dois querem tratar as facções como organizações terroristas.",
      },
      {
        tipo: "igual",
        tema: "Maioridade penal menor",
        candidato: zema(
          "Reduzir a maioridade penal para 16 anos, assegurando a responsabilização criminal de adolescentes a partir dessa idade e permitindo, excepcionalmente, a imputação penal de pessoas ainda mais jovens nos casos de crimes graves, como homicídio e estupro, ou reincidência.",
          "6",
        ),
        flavio: FLAVIO_MAIORIDADE,
        emComum: "Os dois querem a maioridade penal aos 16 e punição para os mais novos em crime grave.",
      },
      {
        tipo: "igual",
        tema: "Presídio de segurança máxima",
        candidato: zema(
          "Construir presídios de segurança máxima, em regiões remotas e isoladas com um regime diferenciado de detenção e estrutura capaz de conter terroristas e isolar os membros das facções.",
          "6",
        ),
        flavio: FLAVIO_PRESIDIOS,
        emComum: "Os dois querem novos presídios de segurança máxima para isolar quem é de facção.",
      },
      {
        tipo: "igual",
        tema: "Cortar o dinheiro das facções",
        candidato: zema(
          "Sufocar todas as fontes de renda das facções, ampliando a fiscalização sobre as empresas que as organizações criminosas usam para lavar dinheiro e combatendo o contrabando, o garimpo e o desmatamento ilegais, além da receptação de produtos roubados.",
          "6",
        ),
        flavio: FLAVIO_DINHEIRO_CRIME,
        emComum: "Os dois querem cortar o dinheiro das facções e a lavagem que o esconde.",
      },
      {
        tipo: "igual",
        tema: "Droga e arma barradas na fronteira",
        candidato: zema(
          "Ampliar a presença do Estado brasileiro nos postos de fronteira e na Amazônia, integrando inteligência, vigilância e forças de segurança para sufocar a entrada de drogas e armas que abastecem o crime organizado.",
          "38",
        ),
        flavio: FLAVIO_ARMAS_DROGAS,
        emComum: "Os dois querem barrar na fronteira a droga e a arma que abastecem as facções.",
      },
      {
        tipo: "aproximado",
        tema: "Preso cumprindo a pena na cadeia",
        candidato: zema(
          "Garantir que o criminoso fique efetivamente preso durante o cumprimento da pena substituindo o modelo atual em que o preso progride rapidamente do regime fechado para o semiaberto e aberto, por um modelo de restrição de liberdade seguido de liberdade condicional com monitoramento eletrônico.",
          "7",
        ),
        flavio: FLAVIO_PROGRESSAO,
        emComum: "Os dois querem mudar a progressão de regime, que solta o preso cedo. O Zema muda para todos os crimes; o Flávio acaba com ela nos crimes hediondos.",
      },
      {
        tipo: "igual",
        tema: "Menos poder para um ministro só no STF",
        candidato: zema(
          "Acabar com as decisões monocráticas e estabelecer prazo limite para pedido de vistas, evitando que um único ministro decida sozinho sobre temas de relevância nacional ou impeça o andamento de decisões na Corte por convicções pessoais.",
          "12",
        ),
        flavio: flavio(
          "Limitação das decisões monocráticas do STF, privilegiando as decisões colegiadas e presumindo a constitucionalidade do processo legislativo, para que a caneta de um só ministro não se sobreponha ao trabalho de todo o Congresso.",
          "65",
        ),
        emComum: "Os dois querem que as decisões importantes do STF saiam do plenário, e não de um ministro sozinho.",
      },
      {
        tipo: "igual",
        tema: "Menos ministérios e fim dos supersalários",
        candidato: zema(
          "Fazer uma Reforma Administrativa para enxugar a estrutura do Governo Federal e deixá-la mais eficiente, reduzindo os ministérios, cortando cargos comissionados e revisando as autarquias e fundações do governo.",
          "15",
        ),
        flavio: FLAVIO_ENXUGAR,
        emComum: "Os dois querem cortar ministérios e cargos comissionados para o governo gastar menos.",
      },
      {
        tipo: "igual",
        tema: "Brasil na OCDE",
        candidato: zema(
          "Retomar o processo de adesão do Brasil à OCDE, promovendo as reformas institucionais e econômicas necessárias para aderir ao bloco e tornando o país mais competitivo, ampliando o grau de investimento e abrindo novos mercados às empresas brasileiras.",
          "37",
        ),
        flavio: FLAVIO_OCDE,
        emComum: "Os dois querem retomar a entrada do Brasil na OCDE.",
      },
      {
        tipo: "igual",
        tema: "Escola cívico-militar",
        candidato: zema(
          "Dar mais liberdade aos pais de escolher o modelo educacional de seus filhos, facilitando a formalização de parcerias com instituições comunitárias, filantrópicas e confessionais, avançando em uma agenda de parcerias com escolas conveniadas na educação, escolas cívico-militares e regulamentando o homeschooling.",
          "53",
        ),
        flavio: flavio(
          "Vamos ampliar as Escolas Cívico-Militares, que uniram disciplina e bom desempenho onde foram implantadas",
          "35",
        ),
        emComum: "Os dois querem mais escolas cívico-militares.",
      },
      {
        tipo: "igual",
        tema: "Licença com prazo para sair",
        candidato: zema(
          "Garantir a implementação efetiva da Nova Lei do Licenciamento Ambiental, com prazos definidos e critérios técnicos objetivos, distinguindo os diferentes graus de impacto e simplificando o licenciamento de atividades de baixo risco, para atrair investimentos sem abrir mão da conservação ambiental.",
          "44",
        ),
        flavio: FLAVIO_LICENCIAMENTO,
        emComum: "Os dois querem prazo definido para a licença sair, sem deixar de cuidar do meio ambiente.",
      },
      {
        tipo: "aproximado",
        tema: "Adubo sem depender de fora",
        candidato: zema(
          "Abrir o mercado à concorrência, facilitando importações e reduzindo a dependência externa de insumos, além de destravar projetos minerais nacionais para eliminar burocracias que dificultam a produção nacional.",
          "43",
        ),
        flavio: flavio(
          "Vamos apoiar a produção nacional de fertilizantes, aproveitando as reservas de minerais que o país possui, como o potássio e o fosfato, para que o campo brasileiro produza com mais autonomia e a mesa do brasileiro fique mais protegida.",
          "54",
        ),
        emComum: "Os dois querem adubo mais barato e menos dependência de fora. O Zema também quer facilitar a importação; o Flávio põe o peso na produção nacional.",
      },
      {
        tipo: "igual",
        tema: "Programa social sem fraude",
        candidato: zema(
          "Intensificar o cruzamento de informações entre bases de dados federais para identificar beneficiários que não atendem aos critérios de elegibilidade, e incentivar os CRAS a manterem o CadÚnico atualizado com mais agilidade e precisão, reduzindo o recebimento indevido de benefícios.",
          "64",
        ),
        flavio: FLAVIO_PROGRAMAS_SOCIAIS,
        emComum: "Os dois mantêm os programas sociais e querem tirar deles quem recebe sem ter direito.",
      },
      {
        tipo: "igual",
        tema: "Prontuário nacional",
        candidato: zema(
          "Construir um registro nacional de saúde unificado e sob controle do cidadão por meio do prontuário eletrônico, centralizando o histórico clínico do paciente, garantindo a continuidade do cuidado em qualquer unidade de atendimento e garantindo a privacidade dos dados, com o Governo Federal liderando essa infraestrutura.",
          "58",
        ),
        flavio: FLAVIO_PRONTUARIO,
        emComum: "Os dois querem um prontuário único, com o histórico do paciente em qualquer lugar e os dados protegidos.",
      },
      {
        tipo: "igual",
        tema: "Inteligência artificial na fila da saúde",
        candidato: zema(
          "Organizar a rede de saúde de forma regionalizada, integrando unidades de urgência, clínicas especializadas e hospitais de diferentes municípios, com apoio de sistemas de inteligência artificial para otimizar a gestão das filas e direcionar cada paciente ao serviço mais adequado às suas necessidades.",
          "59",
        ),
        flavio: FLAVIO_AGENDA_IA,
        emComum: "Os dois querem usar inteligência artificial para a fila da saúde andar mais rápido.",
      },
      {
        tipo: "igual",
        tema: "Consulta a distância no SUS",
        candidato: zema(
          "Expandir o acesso a consultas médicas e ao monitoramento de doenças por meio da telemedicina, reduzindo a escassez de especialistas em regiões remotas, as longas filas de espera nos grandes centros urbanos e os vazios assistenciais.",
          "57",
        ),
        flavio: FLAVIO_TELESSAUDE,
        emComum: "Os dois querem médico a distância onde falta especialista e a fila é longa.",
      },
      {
        tipo: "igual",
        tema: "Mais vaga em creche, com parceria privada",
        candidato: zema(
          "Aumentar o acesso à educação infantil, especialmente para famílias mais vulneráveis, por meio do fortalecimento das redes públicas e de parcerias com entidades privadas e comunitárias, com e sem fins lucrativos, priorizando a expansão com qualidade, a transparência no uso dos recursos e metas claras de atendimento, aprendizagem e desenvolvimento.",
          "50",
        ),
        flavio: flavio(
          "Onde não houver vaga na rede pública, a família receberá um voucher-creche para acesso à rede privada credenciada até a vaga pública surgir, para que nenhuma mulher deixe de trabalhar, estudar ou empreender por falta de creche.",
          "21",
        ),
        emComum: "Os dois querem mais vaga em creche, usando também a rede privada quando falta vaga pública.",
      },
      {
        tipo: "igual",
        tema: "Mais ensino técnico",
        candidato: zema(
          "Ampliar a oferta de cursos técnicos e profissionalizantes, concomitantes ou subsequentes ao Ensino Médio, alinhados às demandas da economia e às vocações regionais, em parceria com o setor produtivo, instituições privadas de ensino, o Sistema S, institutos federais e redes estaduais de educação.",
          "52",
        ),
        flavio: FLAVIO_TECNICO,
        emComum: "Os dois querem o jovem saindo do ensino médio com uma profissão.",
      },
      {
        tipo: "aproximado",
        tema: "Saúde mental",
        candidato: zema(
          "Criar indicadores para que a saúde mental seja tratada com maior eficiência, capacitando profissionais dos Caps, Cras, Creas e escolas para identificar, acolher e encaminhar casos, com financiamento estável e compartilhado entre União, estados e municípios.",
          "59",
        ),
        flavio: FLAVIO_SAUDE_MENTAL,
        emComum: "Os dois querem cuidar melhor da saúde mental e achar o problema cedo.",
      },
    ],
  },
];

export function fichaPorChave(chave: string): Ficha | undefined {
  return FICHAS.find((f) => f.chave === chave);
}
