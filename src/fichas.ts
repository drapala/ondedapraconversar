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
    abertura: "O programa do Cury fala de escola, de saúde mental, de médico mais perto e de salário justo para as mulheres. Nisso tudo, ele e o Lula andam juntos.",
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
        lula: lula(
          "Vamos intensificar o apoio ao uso de ferramentas de saúde digital, como teleconsultas, teleorientação e teleacolhimento na rede básica de saúde.",
          "35",
        ),
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
        lula: lula(
          "Ao mesmo tempo, continuaremos fortalecendo as políticas de enfrentamento do analfabetismo na população adulta e vamos instituir uma estratégia nacional permanente de recomposição e aceleração das aprendizagens, com atenção especial aos anos finais do ensino fundamental e ao ensino médio.",
          "31",
        ),
        emComum: "Os dois querem que o aluno da escola pública aprenda de verdade o básico. O Renan foca em português e matemática; o Lula propõe uma estratégia nacional para recuperar o que ficou para trás.",
      },
    ],
  },
  {
    tipo: "candidato",
    chave: "caiado",
    titulo: "Quem votou no Ronaldo Caiado",
    nome: "Ronaldo Caiado",
    abertura: "O Caiado fala de SUS com fila transparente, de segurança, de criança lendo cedo e de proteger quem planta. Nisso, o programa do Lula diz quase a mesma coisa.",
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
        lula: lula(
          "Seguiremos com as ações e políticas já pactuadas com os estados e municípios brasileiros para chegarmos à meta de 80% das nossas crianças alfabetizadas na idade certa.",
          "31",
        ),
        emComum: "Os dois querem toda criança alfabetizada na idade certa, com o governo federal apoiando estados e prefeituras.",
      },
      {
        tipo: "igual",
        tema: "Seguro rural mais forte",
        candidato: caiado("Estruturar um sistema nacional de seguro rural com participação pública e privada, vinculado à política de crédito.", "23"),
        lula: lula(
          "Daremos especial atenção ao fortalecimento da política de seguro rural. Estabeleceremos diálogo com o setor produtivo para viabilizar um instrumento de mitigação dos efeitos das catástrofes para cobrir perdas sistêmicas decorrentes de quebras severas de safra e para promover a educação em gestão de riscos, integrando o seguro rural a instrumentos de comercialização e proteção financeira.",
          "62",
        ),
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
    ],
  },
  {
    tipo: "candidato",
    chave: "zema",
    titulo: "Quem votou no Romeu Zema",
    nome: "Romeu Zema",
    abertura: "O Zema quer prontuário único, fila da saúde organizada, as facções sem dinheiro e a mulher protegida. O programa do Lula tem tudo isso, com o governo federal puxando.",
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
        lula: lula("Ampliaremos as Salas Lilás e vamos adquirir e distribuir aos Estados kits para aprimorar o monitoramento de agressores.", "21"),
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
    ],
  },
];

export function fichaPorChave(chave: string): Ficha | undefined {
  return FICHAS.find((f) => f.chave === chave);
}
