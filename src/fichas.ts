// Material de conversa. Toda citação é trecho literal, com a página do PDF,
// conferida por scripts/conferir_citacoes.py. Ponte só existe quando há as duas
// citações. Fontes em dados/fichas/.

export type Fonte = { texto: string; url: string };
export type Citacao = { quem: string; texto: string; fonte: Fonte };
export type Ponte = { tema: string; tipo: "igual" | "aproximado"; candidato: Citacao; lula: Citacao; emComum: string };

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

export type Ficha = FichaCandidato | FichaVoto;

const PDF_LULA = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/0806job838ptlivroplanodegovernocompressed-1_0.pdf";
const PDF_CURY = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governoo_brasil_dos_nossos_sonhos.pdf";
const PDF_RENAN = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governo_missao_2026_finalcompressed.pdf";
const PDF_CAIADO = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/plano_de_governo_ronaldo_caiado_presidente.pdf";
const PDF_ZEMA = "https://agenciabrasil.ebc.com.br/sites/default/files/atoms/files/planogoverno10120.pdf";

const lula = (texto: string, pagina: string): Citacao => ({
  quem: "Lula",
  texto,
  fonte: { texto: `Programa de governo de Lula (PT e coligação), registrado no TSE, p. ${pagina}`, url: PDF_LULA },
});

const LULA_TEMPO_INTEGRAL = lula("O fomento à expansão da educação em tempo integral terá absoluta prioridade no novo mandato.", "31");
const LULA_SAUDE_MENTAL = lula(
  "Na saúde mental, ampliaremos os investimentos na Rede de Atenção Psicossocial e nos CAPS, ampliando a atenção a crianças, adolescentes e jovens. Também fortaleceremos o diagnóstico e o acompanhamento de pessoas com TEA e outras neurodivergências, bem como o cuidado psicossocial a mulheres em situação de violência.",
  "39",
);
const LULA_COOPERACAO = lula(
  "Precisamos aprofundar a cooperação entre as instituições dos três níveis de governo e ampliar o escopo de ação do Poder Federal para podermos avançar ainda mais no enfrentamento à violência.",
  "27",
);
const LULA_FILA = lula(
  "Aprimoraremos ainda mais a regulação do acesso à atenção especializada, garantindo maior transparência das filas e utilizando inteligência artificial, com fila única digital e ordenada pelo risco clínico, com transporte sanitário em todas as regiões de saúde.",
  "38",
);
const LULA_PRONTUARIO = lula(
  "Vamos acelerar os esforços na consolidação do prontuário único do cidadão, que já avança por meio da Rede Nacional de Dados em Saúde (RNDS).",
  "35",
);
const LULA_FRONTEIRAS = lula(
  "O enfrentamento da violência requer uma ação permanente e integrada do Estado, baseada em investigação, cooperação entre as instituições, controle das fronteiras e das redes de financiamento do crime, além de políticas de prevenção, redução das desigualdades e ampliação de oportunidades, especialmente para a juventude.",
  "27",
);
const LULA_MINISTERIO = lula(
  "Uma vez aprovada a PEC da Segurança Pública proposta pelo Executivo, criaremos o Ministério da Segurança Pública para coordenar, em articulação com estados e municípios, a execução das políticas nacionais de segurança pública no âmbito do Sistema Único de Segurança Pública (SUSP).",
  "30",
);
const LULA_SANEAMENTO = lula(
  "Continuaremos, no próximo mandato, a perseguir o objetivo de apoiar estados e municípios a universalizar acesso à água tratada e ao esgotamento sanitário, buscando priorizar periferias historicamente negligenciadas.",
  "46",
);
const LULA_ASFIXIA = lula(
  "Manteremos a estratégia de asfixia financeira do crime organizado por meio de ações articuladas, que já permitiu, desde 2023, causar R$ 35,8 bilhões de prejuízos às organizações criminosas.",
  "27",
);
const LULA_SEGURO_RURAL = lula(
  "Daremos especial atenção ao fortalecimento da política de seguro rural. Estabeleceremos diálogo com o setor produtivo para viabilizar um instrumento de mitigação dos efeitos das catástrofes para cobrir perdas sistêmicas decorrentes de quebras severas de safra e para promover a educação em gestão de riscos, integrando o seguro rural a instrumentos de comercialização e proteção financeira.",
  "62",
);
const LULA_PACTO_FEMINICIDIO = lula(
  "O Pacto de Enfrentamento ao Feminicídio permanecerá como guia central de nossa estratégia de enfrentamento à violência contra mulheres.",
  "21",
);
const LULA_SALAS_LILAS = lula(
  "Ampliaremos as Salas Lilás e vamos adquirir e distribuir aos Estados kits para aprimorar o monitoramento de agressores.",
  "21",
);
const LULA_RECOMPOSICAO = lula(
  "Ao mesmo tempo, continuaremos fortalecendo as políticas de enfrentamento do analfabetismo na população adulta e vamos instituir uma estratégia nacional permanente de recomposição e aceleração das aprendizagens, com atenção especial aos anos finais do ensino fundamental e ao ensino médio.",
  "31",
);
const LULA_MATERNIDADE = lula(
  "A maternidade segura continuará sendo um compromisso central do SUS, com intensificação da redução da mortalidade materna e atenção específica para mulheres negras, que seguem as mais afetadas por óbitos evitáveis.",
  "38-39",
);
const LULA_CANCER_MULHER = lula(
  "Continuaremos reforçando a cobertura de exames e tratamento, incluindo o diagnóstico precoce dos cânceres de mama e do colo do útero, bem como os cuidados para mulheres que sofrem de endometriose e outras condições ginecológicas crônicas.",
  "38",
);
const LULA_ALFABETIZACAO = lula(
  "Seguiremos com as ações e políticas já pactuadas com os estados e municípios brasileiros para chegarmos à meta de 80% das nossas crianças alfabetizadas na idade certa.",
  "31",
);
const LULA_TELESSAUDE = lula(
  "Vamos intensificar o apoio ao uso de ferramentas de saúde digital, como teleconsultas, teleorientação e teleacolhimento na rede básica de saúde.",
  "35",
);

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
      "No segundo turno só contam os votos em Lula e Flávio. Quem não aparece fica fora da conta, e o resultado sai de quem foi.",
      "Faltou no primeiro turno? Pode votar normalmente no dia 25. A falta de agora dá pra justificar depois, pelo aplicativo e-Título.",
    ],
    roteiro: [
      "Pergunte como foi o domingo. Muita gente não votou por causa do trabalho, de um filho doente, da distância, da falta de tempo ou de esperança.",
      "Deixe a pessoa falar. Quem se sente ouvido escuta de volta.",
      "Conte que ela pode votar no dia 25, mesmo tendo faltado agora.",
      "Pergunte o que mais pesa no mês dela: o preço da comida, a fila do posto, a escola das crianças. Abra as Propostas e mostre o que o Lula vai fazer sobre isso.",
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
      "Quem decide o segundo turno é quem escolhe o Lula ou o Flávio. Cada voto em branco deixa a decisão do país na mão de menos gente.",
    ],
    roteiro: [
      "Pergunte, com curiosidade de verdade, por que a pessoa votou em branco.",
      "Quase sempre é cansaço. Diga que você entende: política cansa mesmo. Não ser ouvido cansa. Não ter esperança cansa. Mas votar branco não resolve nada. A escolha fica com os outros.",
      "Conte, do jeito mais simples que puder, que o branco não soma para ninguém e que a escolha fica com os outros.",
      "Pergunte o que ela quer ver mudar e mostre a proposta do Lula sobre isso, na página de Propostas.",
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
      "O segundo turno sai só dos votos no Lula e no Flávio. Quem anula sai da conta e deixa os outros decidirem.",
    ],
    roteiro: [
      "Pergunte o que fez a pessoa anular. Deixe ela desabafar até o fim.",
      "Não brigue com a raiva. Concorde com o que for justo.",
      "Conte que o nulo não derruba a eleição e não entra na conta.",
      "Mostre a proposta do Lula que responde ao que mais incomoda ela.",
      "Termine com uma pergunta: e se dessa vez a sua raiva tivesse endereço?",
    ],
    cuidado: "Não chame o nulo de burrice nem de voto jogado fora. Quem se sente humilhado não volta a conversar.",
  },
  {
    tipo: "candidato",
    chave: "cury",
    titulo: "Quem votou no Augusto Cury",
    nome: "Augusto Cury",
    abertura: "O programa do Cury fala de escola, de saúde mental, de médico mais perto, de salário justo e de vida para as mulheres. Fala também de tirar o dinheiro do crime e de fabricar vacina aqui. Nisso tudo, ele e o Lula andam juntos.",
    pontes: [
      {
        tipo: "igual",
        tema: "Escola em tempo integral",
        candidato: cury("Não existe nação desenvolvida sem educação de excelência em tempo integral.", "68"),
        lula: LULA_TEMPO_INTEGRAL,
        emComum: "Os dois põem a escola em tempo integral no topo da lista da educação.",
      },
      {
        tipo: "igual",
        tema: "Saúde mental",
        candidato: cury(
          "Implantaremos uma ampla política nacional de saúde mental envolvendo escolas, empresas, universidades, forças de segurança, unidades de saúde e comunidades, promovendo prevenção, acolhimento e tratamento humanizado.",
          "44",
        ),
        lula: LULA_SAUDE_MENTAL,
        emComum: "Os dois querem cuidar da saúde mental como política do país inteiro, passando pela escola e pelos jovens.",
      },
      {
        tipo: "igual",
        tema: "Segurança com União, estados e municípios juntos",
        candidato: cury("O combate ao crime organizado exige atuação coordenada entre União, Estados e Municípios.", "45"),
        lula: LULA_COOPERACAO,
        emComum: "Para os dois, o crime organizado se enfrenta com União, estados e municípios do mesmo lado.",
      },
      {
        tipo: "igual",
        tema: "Consulta a distância no SUS",
        candidato: cury(
          "Nosso objetivo é fazer do Brasil a maior plataforma pública de medicina digital do mundo, democratizando o acesso à saúde, reduzindo desigualdades e aproximando médicos e pacientes por meio da tecnologia, sem perder aquilo que nenhuma máquina poderá substituir: o cuidado humano.",
          "161",
        ),
        lula: LULA_TELESSAUDE,
        emComum: "Os dois querem consulta a distância dentro da saúde pública, para que morar longe deixe de ser motivo para ficar sem médico.",
      },
      {
        tipo: "igual",
        tema: "Salário igual para mulheres",
        candidato: cury(
          "Fortaleceremos os mecanismos de transparência salarial, fiscalização e cumprimento da legislação que determina igualdade remuneratória para trabalho de igual valor.",
          "89",
        ),
        lula: lula(
          "Vamos avançar na efetiva equivalência remuneratória entre mulheres e homens, fortalecendo a implementação da Lei de Igualdade Salarial, sancionada no atual mandato do Presidente Lula.",
          "75",
        ),
        emComum: "Os dois querem que a lei de salário igual entre mulheres e homens saia do papel, com fiscalização.",
      },
      {
        tipo: "aproximado",
        tema: "Cooperativas que geram renda",
        candidato: cury("A partir dessas experiências, propomos transformar o Brasil em uma das maiores potências cooperativistas do mundo.", "132"),
        lula: lula(
          "O novo mandato do Presidente Lula continuará construindo um país que valorize o trabalho em todas as suas formas, assegure direitos às trabalhadoras e aos trabalhadores, prepare as pessoas para as transformações tecnológicas e fortaleça o empreendedorismo, o cooperativismo e a economia solidária.",
          "73",
        ),
        emComum: "Os dois apostam na cooperativa como jeito de gerar trabalho e renda. O Cury pensa em cooperativas grandes em vários setores; o Lula dá prioridade às cooperativas populares e à economia solidária.",
      },
      {
        tipo: "igual",
        tema: "Ministério da Segurança Pública",
        candidato: cury(
          "Recriação do Ministério da segurança pública.",
          "45",
        ),
        lula: LULA_MINISTERIO,
        emComum: "Os dois querem o Ministério da Segurança Pública.",
      },
      {
        tipo: "igual",
        tema: "Tirar o dinheiro do crime",
        candidato: cury(
          "Atuaremos para enfraquecer suas estruturas financeiras, logísticas e operacionais, intensificando o combate ao tráfico de drogas, armas, lavagem de dinheiro e crimes cibernéticos, com atenção em especial, no combate aos golpistas que cometem crimes contra idosos e demais cidadãos.",
          "45",
        ),
        lula: LULA_ASFIXIA,
        emComum: "Os dois querem atacar o dinheiro das facções, que é o que mantém o crime de pé.",
      },
      {
        tipo: "igual",
        tema: "Política nacional contra o feminicídio",
        candidato: cury(
          "O Programa Mulheres Vivas constituirá uma política nacional integrada de prevenção ao feminicídio e enfrentamento da violência contra a mulher, articulando União, estados, municípios, forças de segurança, sistema de Justiça, assistência social e rede de saúde.",
          "87",
        ),
        lula: LULA_PACTO_FEMINICIDIO,
        emComum: "Os dois querem uma política nacional contra o feminicídio, com todo mundo junto. O Lula já tem um pacto em andamento.",
      },
      {
        tipo: "igual",
        tema: "Agressor vigiado de perto",
        candidato: cury(
          "Ampliaremos o uso de botões de alerta com geolocalização, aplicativos de emergência, monitoramento eletrônico de agressores nos casos determinados judicialmente, centrais integradas e protocolos de resposta prioritária para mulheres ameaçadas.",
          "88",
        ),
        lula: LULA_SALAS_LILAS,
        emComum: "Os dois querem monitorar o agressor, para a mulher ameaçada não ficar sozinha.",
      },
      {
        tipo: "igual",
        tema: "Câncer achado cedo",
        candidato: cury(
          "A prevenção inclui vacinação, rastreamento organizado e diagnóstico precoce.",
          "167",
        ),
        lula: LULA_CANCER_MULHER,
        emComum: "Os dois apostam em achar cedo o câncer de colo do útero, que dá para prevenir.",
      },
      {
        tipo: "igual",
        tema: "Criança lendo na idade certa",
        candidato: cury(
          "Investiremos na alfabetização na idade certa, na melhoria da aprendizagem, na valorização dos professores e na redução das desigualdades educacionais.",
          "43",
        ),
        lula: LULA_ALFABETIZACAO,
        emComum: "Os dois querem toda criança alfabetizada na idade certa.",
      },
      {
        tipo: "igual",
        tema: "Autismo e neurodivergência",
        candidato: cury(
          "O Projeto Brasil Neuroinclusivo institui uma política permanente de Estado para acolher crianças, adolescentes e adultos neurodivergentes, particularmente pessoas com autismo, TDAH, dislexia, transtornos de aprendizagem e altas habilidades.",
          "81",
        ),
        lula: lula(
          "Também fortaleceremos o diagnóstico e o acompanhamento de pessoas com TEA e outras neurodivergências, bem como o cuidado psicossocial a mulheres em situação de violência.",
          "39",
        ),
        emComum: "Os dois querem cuidar de quem tem autismo e outras neurodivergências.",
      },
      {
        tipo: "igual",
        tema: "SUS digital e fila menor",
        candidato: cury(
          "Nossa prioridade será fortalecer sua gestão por meio da digitalização dos prontuários, integração dos sistemas, redução das filas, melhoria da eficiência administrativa e utilização de indicadores de desempenho para aprimorar continuamente os serviços prestados.",
          "44",
        ),
        lula: LULA_PRONTUARIO,
        emComum: "Os dois querem o prontuário digital e integrado, para o SUS andar mais rápido.",
      },
      {
        tipo: "igual",
        tema: "Água e esgoto para todo mundo",
        candidato: cury(
          "Fazer cumprir o Marco Legal do Saneamento Básico como prioridade nacional por representar uma das políticas públicas de maior impacto sobre a saúde, a qualidade de vida, a preservação ambiental e a redução dos gastos públicos com doenças evitáveis.",
          "50",
        ),
        lula: LULA_SANEAMENTO,
        emComum: "Os dois tratam saneamento como prioridade, porque esgoto tratado é saúde.",
      },
      {
        tipo: "igual",
        tema: "Casa com escritura",
        candidato: cury(
          "O objetivo será acelerar a regularização das moradias utilizando a legislação da REURB, simplificando procedimentos e estabelecendo uma grande cooperação entre União, Estados, municípios, cartórios, universidades, conselhos profissionais e comunidades.",
          "105",
        ),
        lula: lula(
          "Com o Periferia Viva, voltamos a investir em urbanização de favelas e em regularização fundiária, abandonados no governo anterior.",
          "45",
        ),
        emComum: "Os dois querem dar documento para a casa de quem já mora nela.",
      },
      {
        tipo: "igual",
        tema: "Vacina e remédio feitos aqui",
        candidato: cury(
          "Ampliaremos a capacidade nacional de pesquisa, desenvolvimento e fabricação de medicamentos, vacinas, equipamentos médicos e produtos biotecnológicos, fortalecendo nossa autonomia e ampliando as exportações de produtos de alto valor agregado.",
          "41",
        ),
        lula: lula(
          "Aprovamos a lei que institui a Estratégia Nacional de Saúde do Complexo Econômico-Industrial da Saúde.",
          "39",
        ),
        emComum: "Os dois querem o Brasil fabricando vacina e remédio, sem depender de fora.",
      },
      {
        tipo: "igual",
        tema: "Terras raras transformadas aqui",
        candidato: cury(
          "Nossa política será agregar valor a essas riquezas naturais por meio da industrialização, evitando a simples exportação de matéria-prima.",
          "41",
        ),
        lula: lula(
          "Desenvolveremos uma política específica para minerais críticos e terras raras, capaz de organizar suas cadeias produtivas, diferenciar seus usos tecnológicos e evitar a simples exportação de matérias-primas estratégicas.",
          "52",
        ),
        emComum: "Os dois usam quase as mesmas palavras: nada de só exportar matéria-prima.",
      },
      {
        tipo: "igual",
        tema: "Seguro para quem planta",
        candidato: cury(
          "Ampliaremos significativamente a cobertura do Programa de Subvenção ao Prêmio do Seguro Rural (PSR), garantindo que o produtor tenha um antídoto contra eventos climáticos extremos.",
          "49",
        ),
        lula: LULA_SEGURO_RURAL,
        emComum: "Os dois querem fortalecer o seguro rural, para o produtor não perder tudo quando o clima castiga.",
      },
      {
        tipo: "aproximado",
        tema: "Agricultura familiar com crédito",
        candidato: cury(
          "Turbinar os 3,9 milhões de estabelecimentos da agricultura familiar com crédito, assistência técnica, irrigação simplificada, energia solar, cooperativismo e acesso a mercados.",
          "117",
        ),
        lula: lula(
          "O crédito disponibilizado por meio do Pronaf foi, ano após ano, recorde, e buscou atender às diferentes necessidades da agricultura familiar.",
          "59",
        ),
        emComum: "Os dois querem crédito farto para a agricultura familiar. No governo Lula, o Pronaf bateu recorde.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "renan",
    titulo: "Quem votou no Renan Santos",
    nome: "Renan Santos",
    abertura: "O Renan quer um SUS que funcione, o crime sem dinheiro e um Brasil que fabrique em vez de só exportar. O programa do Lula quer as mesmas coisas.",
    pontes: [
      {
        tipo: "igual",
        tema: "Fila do SUS pela gravidade do caso",
        candidato: renan(
          "A ideia central de nossa proposta é criar a ENER, um sistema de fila viva, que não fique engessado na ordem cronológica, mas atenda critérios objetivos de prioridade relativos ao estado do paciente.",
          "25",
        ),
        lula: LULA_FILA,
        emComum: "Os dois querem que a fila do SUS ande pela gravidade do caso: quem está pior é atendido antes.",
      },
      {
        tipo: "igual",
        tema: "Prontuário único",
        candidato: renan(
          "Criação do PRONTO (Prontuário Eletrônico Nacional Interoperável) que irá conectar a atenção primária, os serviços especializados, os hospitais públicos e privados, laboratórios e farmácias, servindo de repositório para todas as informações do paciente acessíveis a qualquer tempo.",
          "26",
        ),
        lula: LULA_PRONTUARIO,
        emComum: "Os dois querem que a história de saúde de cada pessoa ande com ela, do posto ao hospital.",
      },
      {
        tipo: "igual",
        tema: "Fronteiras e dinheiro do crime",
        candidato: renan(
          "No primeiro front, vamos reconquistar o controle estatal sobre portos, aeroportos e fronteiras secas com scanners tridimensionais e inteligência integrada; implementar sistemas de monitoramento aéreo, espacial e amazônico; e apertar os mecanismos de asfixia financeira que cortam o oxigênio econômico das facções.",
          "13",
        ),
        lula: LULA_FRONTEIRAS,
        emComum: "Os dois querem fechar a fronteira para o crime e cortar o dinheiro das facções.",
      },
      {
        tipo: "igual",
        tema: "Terras raras transformadas aqui",
        candidato: renan("Riqueza no subsolo não basta; sem ciência e indústria, exporta-se minério e importa-se dependência.", "37"),
        lula: lula(
          "Desenvolveremos uma política específica para minerais críticos e terras raras, capaz de organizar suas cadeias produtivas, diferenciar seus usos tecnológicos e evitar a simples exportação de matérias-primas estratégicas.",
          "52",
        ),
        emComum: "Os dois querem que o Brasil pare de só vender terras raras em estado bruto e passe a transformar esse minério aqui dentro.",
      },
      {
        tipo: "aproximado",
        tema: "Nordeste com indústria",
        candidato: renan(
          "Tratado por décadas como um problema a ser socorrido, o Nordeste é, na verdade, a solução à espera de coordenação. O instrumento dessa virada são as Zonas Econômicas Especiais (ZEEs) — perímetros com regras tributárias, regulatórias e de infraestrutura desenhadas para atrair indústria de alto valor.",
          "34",
        ),
        lula: lula(
          "Assim como o Nordeste, que apresenta novas perspectivas de desenvolvimento por concentrar hoje cerca de 70% da geração eólica e solar do país. Vamos transformar a região em um polo de atração de plantas industriais eletrointensivas que buscam energia renovável e previsível para produzir com baixa emissão — siderurgia verde, fertilizantes, química, cimento, alumínio, processamento de minerais críticos, hidrogênio de baixo carbono e seus derivados.",
          "56",
        ),
        emComum: "Os dois veem o Nordeste como lugar de indústria, não de socorro. O Renan propõe zonas com regras especiais de imposto; o Lula quer atrair fábricas que usam o sol e o vento da região.",
      },
      {
        tipo: "aproximado",
        tema: "Aluno aprendendo o básico",
        candidato: renan(
          "Elevar o nível de qualidade de nossas escolas, com foco especial nas disciplinas básicas do currículo (língua portuguesa e matemática), assegurando formação sólida em ambas.",
          "32",
        ),
        lula: LULA_RECOMPOSICAO,
        emComum: "Os dois querem que o aluno da escola pública aprenda de verdade o básico. O Renan foca em português e matemática; o Lula propõe uma estratégia nacional para recuperar o que ficou para trás.",
      },
      {
        tipo: "aproximado",
        tema: "Mais trem e obra parada retomada",
        candidato: renan(
          "Esses projetos contemplam a renovação dos modais de transporte, a expansão da malha ferroviária, a retomada de obras interrompidas em portos e aeroportos e um melhor aproveitamento do potencial energético da nossa matriz limpa, com a meta de elevar os investimentos em infraestrutura dos atuais 2% do PIB para, pelo menos, 4%.",
          "6",
        ),
        lula: lula(
          "Manteremos o ritmo nas concessões rodoviárias e intensificaremos as de ferrovias em duas frentes: leilão de novos projetos e repactuação dos contratos existentes.",
          "53",
        ),
        emComum: "Os dois querem mais ferrovia e mais investimento em infraestrutura.",
      },
      {
        tipo: "aproximado",
        tema: "Linhas de transmissão para a energia do Nordeste",
        candidato: renan(
          "Energia: marco regulatório da transmissão de energia, com desbloqueio do gargalo que hoje impõe curtailment massivo ao Nordeste, retomada decisiva das obras de Angra 3, exploração do hidrogênio verde com abertura para a bacia amazônica, e atenção à fusão nuclear.",
          "24",
        ),
        lula: lula(
          "Na transmissão de energia estamos promovendo a maior expansão da rede elétrica brasileira das últimas décadas, mais do que o dobro verificado entre 2019 e 2022",
          "64",
        ),
        emComum: "O Renan quer destravar a transmissão para não desperdiçar a energia limpa do Nordeste. O governo Lula está fazendo a maior expansão de linhas em décadas.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "caiado",
    titulo: "Quem votou no Ronaldo Caiado",
    nome: "Ronaldo Caiado",
    abertura: "O Caiado fala de SUS com fila transparente, de tirar o dinheiro do crime, de proteger a mulher e de criança lendo cedo. Nisso, o programa do Lula diz quase a mesma coisa. E o Caiado ainda promete manter a luz de graça para quem tem pouco, que o governo Lula ampliou, e um incentivo igual ao Pé-de-Meia, que o Lula criou.",
    pontes: [
      {
        tipo: "igual",
        tema: "SUS com fila transparente",
        candidato: caiado(
          "A saúde preservará os princípios do SUS, mas mudará sua capacidade de entrega: cuidado preventivo, atendimento perto de casa, prontuário interoperável, fila transparente, especialista no tempo certo e hospitais remunerados por qualidade e resultado.",
          "2",
        ),
        lula: LULA_FILA,
        emComum: "Os dois defendem o SUS com fila às claras e especialista mais rápido.",
      },
      {
        tipo: "igual",
        tema: "Ministério da Segurança Pública",
        candidato: caiado(
          "Criar o Ministério da Segurança Pública e instituir o Conselho Estratégico Nacional de Segurança Pública e Combate ao Terrorismo Doméstico, sob liderança da Presidência da República e com participação dos governadores e demais instituições do Estado brasileiro que compartilham a responsabilidades de garantir a ordem social e a segurança dos cidadãos, em substituição ao Conselho Nacional de Segurança Pública e Defesa Social.",
          "16-17",
        ),
        lula: LULA_MINISTERIO,
        emComum: "Os dois propõem criar o Ministério da Segurança Pública, trabalhando junto com os governadores.",
      },
      {
        tipo: "igual",
        tema: "Tirar o dinheiro do crime",
        candidato: caiado(
          "A União deixará de assistir à expansão do crime organizado e passará a liderar, junto com governadores e prefeitos, a integração da inteligência, a proteção das fronteiras, a asfixia financeira das organizações criminosas, a modernização das investigações e a retomada do controle dos presídios.",
          "2",
        ),
        lula: LULA_ASFIXIA,
        emComum: "Os dois usam até a mesma expressão: asfixia financeira do crime organizado.",
      },
      {
        tipo: "igual",
        tema: "Conta de luz de graça para quem tem pouco",
        candidato: caiado(
          "Manter e aperfeiçoar a gratuidade da energia elétrica para as famílias de baixa renda, com atualização permanente dos cadastros, integração de bases de dados e mecanismos efetivos de prevenção a fraudes.",
          "36",
        ),
        lula: lula(
          "O combate à pobreza energética se deu por meio do Luz do Povo, que reviu a política de Tarifa Social de energia, e ampliou a gratuidade da conta de luz para famílias do Cadastro Único com consumo até 80 kWh/mês, com alcance de mais de 60 milhões de pessoas.",
          "65",
        ),
        emComum: "O Caiado promete manter a luz de graça para as famílias de baixa renda. Quem ampliou essa gratuidade foi o governo Lula.",
      },
      {
        tipo: "igual",
        tema: "Dinheiro para o jovem não largar a escola",
        candidato: caiado(
          "Aperfeiçoar incentivos financeiros a estudantes de baixa renda com maior risco de abandono, vinculados à matrícula, frequência e conclusão, sem punir famílias por falhas da oferta escolar.",
          "33",
        ),
        lula: lula(
          "O programa já beneficiou 7,3 milhões de jovens e mostrou ter impacto sobre os indicadores de permanência e de participação no Enem. Vamos dar continuidade e fortalecer o Pé-de-Meia.",
          "32",
        ),
        emComum: "O que o Caiado descreve é o Pé-de-Meia, criado pelo governo Lula: dinheiro ligado à matrícula, à frequência e à conclusão.",
      },
      {
        tipo: "igual",
        tema: "Nenhuma mãe morrendo no parto",
        candidato: caiado(
          "Implantar auditoria de óbitos, protocolo de risco, transporte e regulação de leitos, com atenção especial a mulheres negras, indígenas e de áreas remotas.",
          "59",
        ),
        lula: LULA_MATERNIDADE,
        emComum: "Os dois querem reduzir a morte de mães, com atenção especial às mulheres negras.",
      },
      {
        tipo: "igual",
        tema: "Câncer de mama e de colo do útero",
        candidato: caiado(
          "Expandir o rastreamento baseado em DNA-HPV e organizar fluxos de mama, colo uterino e colorretal conforme diretrizes nacionais e capacidade instalada.",
          "80",
        ),
        lula: LULA_CANCER_MULHER,
        emComum: "Os dois querem achar cedo o câncer de mama e o de colo do útero.",
      },
      {
        tipo: "igual",
        tema: "Saúde mental nos CAPS",
        candidato: caiado(
          "A Rede de Atenção Psicossocial (RAPS) deve articular Atenção Primária à Saúde (APS), Centros de Atenção Psicossocial (CAPS), urgência e emergência, atenção especializada, hospitais, psicologia e assistência social, garantindo continuidade do cuidado e evitando que o paciente se perca entre serviços.",
          "84",
        ),
        lula: lula(
          "Na saúde mental, ampliaremos os investimentos na Rede de Atenção Psicossocial e nos CAPS, ampliando a atenção a crianças, adolescentes e jovens.",
          "39",
        ),
        emComum: "Os dois apostam na Rede de Atenção Psicossocial e nos CAPS para cuidar da saúde mental.",
      },
      {
        tipo: "igual",
        tema: "Comando nacional contra o feminicídio",
        candidato: caiado(
          "O combate ao feminicídio terá comando nacional, integração entre segurança, justiça, saúde e assistência e proteção econômica para romper ciclos de dependência.",
          "58",
        ),
        lula: LULA_PACTO_FEMINICIDIO,
        emComum: "Os dois querem o governo federal à frente do combate ao feminicídio. O Caiado chama de pacto nacional, e o Lula já tem um.",
      },
      {
        tipo: "igual",
        tema: "Agressor vigiado de perto",
        candidato: caiado(
          "Expandir monitoramento eletrônico de agressores de alto risco, botão de emergência e patrulhas especializadas, com decisão judicial e resposta rápida.",
          "58",
        ),
        lula: LULA_SALAS_LILAS,
        emComum: "Os dois querem monitorar o agressor depois da denúncia, para a mulher não ficar desprotegida.",
      },
      {
        tipo: "igual",
        tema: "Salário igual para homem e mulher",
        candidato: caiado(
          "Aplicar a legislação de igualdade remuneratória com critérios objetivos, proteção de dados e correção de discriminação comprovada.",
          "59",
        ),
        lula: lula(
          "A Lei da Igualdade Salarial, que aprovamos em 2023, continuará orientando nossas ações para promoção do trabalho das mulheres.",
          "21",
        ),
        emComum: "O Caiado promete aplicar a lei de igualdade salarial. Foi o governo Lula que aprovou essa lei.",
      },
      {
        tipo: "igual",
        tema: "Comida no prato",
        candidato: caiado(
          "Fortalecer merenda, compras da agricultura familiar, bancos de alimentos, restaurantes populares, cozinhas comunitárias e suplementação quando necessária.",
          "62",
        ),
        lula: lula(
          "Fomentaremos a construção de infraestruturas que ampliam os cuidados indiretos e comunitários, como as lavanderias públicas, as cozinhas solidárias e os restaurantes populares.",
          "26",
        ),
        emComum: "Os dois querem mais restaurantes populares e cozinhas comunitárias.",
      },
      {
        tipo: "igual",
        tema: "Água e esgoto para todo mundo",
        candidato: caiado(
          "Cumprir e acelerar as metas do marco legal do saneamento (universalização até 2033), água tratada e coleta e tratamento de esgoto para todos os brasileiros, tratando o tema como prioridade de saúde pública, dignidade e desenvolvimento regional, e preservando a segurança regulatória que destravou o maior ciclo de investimento privado da história do setor.",
          "48",
        ),
        lula: LULA_SANEAMENTO,
        emComum: "Os dois querem água tratada e esgoto na casa de todos os brasileiros.",
      },
      {
        tipo: "igual",
        tema: "Criança lendo na idade certa",
        candidato: caiado(
          "Apoiar estados e municípios para que todas as crianças leiam, escrevam, compreendam e dominem fundamentos matemáticos até o fim do 2º ano.",
          "32",
        ),
        lula: LULA_ALFABETIZACAO,
        emComum: "Os dois querem toda criança alfabetizada na idade certa, com o governo federal apoiando estados e prefeituras.",
      },
      {
        tipo: "igual",
        tema: "Recuperar o que o aluno não aprendeu",
        candidato: caiado(
          "O governo federal liderará uma aliança com estados, municípios, professores, famílias e setor produtivo para garantir alfabetização, recomposição, escola atraente e formação conectada ao trabalho e à cidadania.",
          "32",
        ),
        lula: LULA_RECOMPOSICAO,
        emComum: "Os dois querem um esforço nacional para recuperar o que os alunos deixaram de aprender.",
      },
      {
        tipo: "igual",
        tema: "Escola em tempo integral",
        candidato: caiado("Priorizar alfabetização, recomposição de aprendizagem, tempo integral e ensino médio com educação profissional.", "65"),
        lula: LULA_TEMPO_INTEGRAL,
        emComum: "Os dois põem a escola em tempo integral entre as prioridades.",
      },
      {
        tipo: "igual",
        tema: "Seguro rural mais forte",
        candidato: caiado("Estruturar um sistema nacional de seguro rural com participação pública e privada, vinculado à política de crédito.", "23"),
        lula: LULA_SEGURO_RURAL,
        emComum: "Os dois querem fortalecer o seguro rural, junto com o setor produtivo, para o produtor não perder tudo quando a safra quebra.",
      },
      {
        tipo: "igual",
        tema: "Bolsa mantida, ligada a trabalho e estudo",
        candidato: caiado(
          "Manteremos a rede de transferência de renda para quem precisa, mas conectaremos benefícios a qualificação, cuidado infantil, inclusão produtiva, habitação, saúde e educação.",
          "2",
        ),
        lula: lula(
          "O combate às desigualdades requer justiça tributária, fortalecimento do Estado de bem-estar social, valorização do salário-mínimo, inclusão produtiva, educação, saúde, programas eficientes de transferência de renda. Por isso, devemos manter, aperfeiçoar e ampliar as políticas de proteção social para quem mais necessita.",
          "18",
        ),
        emComum: "Os dois mantêm a transferência de renda para quem precisa e querem ligar esse apoio a trabalho, estudo e saúde.",
      },
      {
        tipo: "aproximado",
        tema: "Cuidar de quem se afundou nas apostas",
        candidato: caiado(
          "O jogo está destruindo famílias, levando ruina aos lares, atingindo a paz das famílias e a saúde mental e emocional dos brasileiros, com prevenção, acolhimento e tratamento do jogo compulsivo (ludopatia), classificado na CID-11 como Transtorno do Jogo.",
          "19-20",
        ),
        lula: lula("Ampliaremos os profissionais e as estratégias voltadas às pessoas com problemas relacionados a jogos de apostas.", "39"),
        emComum: "O Caiado é mais duro com as bets, mas os dois tratam o vício em apostas como problema de saúde e querem cuidar de quem caiu nele.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "zema",
    titulo: "Quem votou no Romeu Zema",
    nome: "Romeu Zema",
    abertura: "O Zema quer prontuário único, fila da saúde organizada, as facções sem dinheiro e a mulher protegida. O programa do Lula tem tudo isso, com o governo federal puxando. E o Zema promete manter o Pé-de-Meia e o Minha Casa, Minha Vida, que vieram do governo Lula.",
    pontes: [
      {
        tipo: "igual",
        tema: "Prontuário nacional",
        candidato: zema(
          "Construir um registro nacional de saúde unificado e sob controle do cidadão por meio do prontuário eletrônico, centralizando o histórico clínico do paciente, garantindo a continuidade do cuidado em qualquer unidade de atendimento e garantindo a privacidade dos dados, com o Governo Federal liderando essa infraestrutura.",
          "58",
        ),
        lula: LULA_PRONTUARIO,
        emComum: "Os dois querem um prontuário nacional, com o governo federal puxando.",
      },
      {
        tipo: "aproximado",
        tema: "Saneamento com estados e municípios",
        candidato: zema(
          "Fortalecer a regionalização da prestação dos serviços, ampliar a estruturação de projetos de concessão e PPPs e promover soluções que ampliem a escala, a eficiência operacional e a capacidade de investimento dos prestadores, em articulação entre a União, estados e municípios, para cumprir as metas do Novo Marco do Saneamento.",
          "31",
        ),
        lula: LULA_SANEAMENTO,
        emComum: "O caminho muda, o Zema aposta mais em concessões. O objetivo é o mesmo: saneamento para todo mundo, com União, estados e municípios juntos.",
      },
      {
        tipo: "igual",
        tema: "Cortar o dinheiro das facções",
        candidato: zema(
          "Sufocar todas as fontes de renda das facções, ampliando a fiscalização sobre as empresas que as organizações criminosas usam para lavar dinheiro e combatendo o contrabando, o garimpo e o desmatamento ilegais, além da receptação de produtos roubados.",
          "6",
        ),
        lula: LULA_ASFIXIA,
        emComum: "Os dois querem sufocar o dinheiro das facções.",
      },
      {
        tipo: "igual",
        tema: "Salas Lilás e agressor vigiado",
        candidato: zema(
          "Expandir nas redes de segurança pública e saúde de estados e municípios as Patrulhas Maria da Penha, que monitoram o cumprimento de medidas protetivas para reduzir a reincidência, e as Salas Lilás, com espaços de acolhimento às vítimas em unidades policiais.",
          "7",
        ),
        lula: LULA_SALAS_LILAS,
        emComum: "Os dois prometem ampliar as Salas Lilás e vigiar de perto o agressor depois da denúncia.",
      },
      {
        tipo: "igual",
        tema: "Inteligência artificial na fila da saúde",
        candidato: zema(
          "Organizar a rede de saúde de forma regionalizada, integrando unidades de urgência, clínicas especializadas e hospitais de diferentes municípios, com apoio de sistemas de inteligência artificial para otimizar a gestão das filas e direcionar cada paciente ao serviço mais adequado às suas necessidades.",
          "59",
        ),
        lula: lula(
          "Vamos acelerar a utilização de inteligência artificial para a triagem, a priorização de casos graves, a regulação por risco clínico e o diagnóstico em áreas com escassez de especialistas.",
          "35",
        ),
        emComum: "Os dois querem usar inteligência artificial para organizar a fila da saúde pública e mandar cada paciente para o atendimento certo.",
      },
      {
        tipo: "aproximado",
        tema: "Mais ensino técnico",
        candidato: zema(
          "Ampliar a oferta de cursos técnicos e profissionalizantes, concomitantes ou subsequentes ao Ensino Médio, alinhados às demandas da economia e às vocações regionais, em parceria com o setor produtivo, instituições privadas de ensino, o Sistema S, institutos federais e redes estaduais de educação.",
          "52",
        ),
        lula: lula(
          "No novo mandato, continuaremos a expansão da nossa rede de institutos federais, priorizando a interiorização, os vazios educacionais, as periferias urbanas e os municípios com baixa oferta de cursos técnicos.",
          "33",
        ),
        emComum: "Os dois querem mais jovens fazendo curso técnico. O Zema aposta em parcerias com escolas privadas e o Sistema S; o Lula, em abrir mais institutos federais no interior e nas periferias.",
      },
      {
        tipo: "igual",
        tema: "Recuperar o que o aluno não aprendeu",
        candidato: zema(
          "Transformar o Pacto Nacional pela Recomposição das Aprendizagens em uma estratégia nacional clara, com prioridade para alfabetização na idade certa e apoio intensivo aos estudantes com defasagens acumuladas.",
          "51",
        ),
        lula: LULA_RECOMPOSICAO,
        emComum: "Os dois querem uma estratégia nacional para recuperar o que os alunos deixaram de aprender.",
      },
      {
        tipo: "aproximado",
        tema: "Pé-de-Meia mantido",
        candidato: zema(
          "Melhorar a focalização do programa Pé-de-Meia para torná-lo mais efetivo junto aos estudantes com maior propensão a deixar a escola, de modo a conciliar o combate à evasão escolar com as demais necessidades de investimento na educação.",
          "53",
        ),
        lula: lula(
          "Aprovamos a nova lei do ensino médio, buscando reequilibrar a formação geral básica e a formação profissional, e criamos o Pé-de-Meia, para enfrentar o desafio da evasão no ensino médio.",
          "32",
        ),
        emComum: "O Zema quer ajustar as regras, mas mantém o Pé-de-Meia, que o governo Lula criou contra a evasão escolar.",
      },
      {
        tipo: "igual",
        tema: "Saúde mental nos CAPS",
        candidato: zema(
          "Criar indicadores para que a saúde mental seja tratada com maior eficiência, capacitando profissionais dos Caps, Cras, Creas e escolas para identificar, acolher e encaminhar casos, com financiamento estável e compartilhado entre União, estados e municípios.",
          "59",
        ),
        lula: LULA_SAUDE_MENTAL,
        emComum: "Os dois querem fortalecer os CAPS e a rede que cuida da saúde mental.",
      },
      {
        tipo: "aproximado",
        tema: "Gravidez segura",
        candidato: zema(
          "Assegurar que todas as gestantes, independentemente de onde vivam, realizem o conjunto completo de consultas e exames do pré-natal, reduzindo riscos para a mãe e para a criança e prevenindo complicações evitáveis no parto e nos primeiros anos de vida.",
          "58",
        ),
        lula: LULA_MATERNIDADE,
        emComum: "Os dois querem que nenhuma mãe corra risco evitável na gravidez e no parto.",
      },
      {
        tipo: "igual",
        tema: "Consulta a distância no SUS",
        candidato: zema(
          "Expandir o acesso a consultas médicas e ao monitoramento de doenças por meio da telemedicina, reduzindo a escassez de especialistas em regiões remotas, as longas filas de espera nos grandes centros urbanos e os vazios assistenciais.",
          "57",
        ),
        lula: LULA_TELESSAUDE,
        emComum: "Os dois querem levar consulta pela internet para quem mora longe do especialista.",
      },
      {
        tipo: "aproximado",
        tema: "Mais vaga em creche",
        candidato: zema(
          "Aumentar o acesso à educação infantil, especialmente para famílias mais vulneráveis, por meio do fortalecimento das redes públicas e de parcerias com entidades privadas e comunitárias, com e sem fins lucrativos, priorizando a expansão com qualidade, a transparência no uso dos recursos e metas claras de atendimento, aprendizagem e desenvolvimento.",
          "50",
        ),
        lula: lula(
          "O Novo PAC apoiou a construção de 3.562 creches e escolas de educação infantil em 2.360 municípios. Na segunda edição do Novo PAC, ampliaremos ainda mais o fomento a estados e municípios para juntos alcançarmos a metas do PNE.",
          "31",
        ),
        emComum: "O caminho muda, o Zema aposta mais em parcerias. O objetivo é o mesmo: mais criança na creche.",
      },
      {
        tipo: "igual",
        tema: "Inclusão de quem tem autismo na escola",
        candidato: zema(
          "Ampliar o acesso de estudantes com deficiência e TEA a atendimento adequado às suas necessidades em ambientes inclusivos, com professores e profissionais especializados capacitados",
          "53",
        ),
        lula: lula(
          "A educação inclusiva e a educação bilíngue de surdos continuarão recebendo apoio federal, para ampliar a acessibilidade nas escolas, com tecnologia assistiva como recurso individual, estruturar as redes de serviços, ofertar materiais visando à redução de desigualdades regionais e territoriais e atender estudantes em situação de vulnerabilidade de várias ordens.",
          "23",
        ),
        emComum: "Os dois querem a escola preparada para receber quem tem deficiência ou autismo.",
      },
      {
        tipo: "aproximado",
        tema: "Minha Casa, Minha Vida perto de tudo",
        candidato: zema(
          "Reformular o Minha Casa, Minha Vida para priorizar investimentos em áreas com infraestrutura e serviços públicos já instalados, superando o modelo atual que entrega moradias de baixa qualidade em regiões isoladas, longe de escolas, postos de saúde e transporte público.",
          "65",
        ),
        lula: lula(
          "Recriamos o Minha Casa Minha Vida – MCMV, introduzindo melhorias no padrão construtivo, elevando os valores dos imóveis enquadráveis no programa, criando uma nova faixa de renda no programa para atingir a classe média, que estava ameaçada por insuficiência de recursos da poupança para seu financiamento.",
          "45",
        ),
        emComum: "O Zema quer mudar o programa, mas mantém o Minha Casa, Minha Vida, que o governo Lula recriou e melhorou.",
      },
      {
        tipo: "aproximado",
        tema: "Seguro para quem planta",
        candidato: zema(
          "Reduzir entraves ao desenvolvimento do setor de seguros rurais, com um fundo privado de aportes públicos e privados que cubram perdas por eventos climáticos, pragas e oscilações de mercado, garantindo sustentabilidade financeira e efetiva proteção da renda agrícola.",
          "44",
        ),
        lula: LULA_SEGURO_RURAL,
        emComum: "O Zema quer um fundo com dinheiro privado, mas os dois querem proteger a renda de quem planta quando a safra quebra.",
      },
    ],
  },
];

export function fichaPorChave(chave: string): Ficha | undefined {
  return FICHAS.find((f) => f.chave === chave);
}
