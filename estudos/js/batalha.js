// ⚔️ Batalha contra o Magnata (chefão de cada camada) e os poderes dos animais.
// Motor puro (sem tela), para poder testar: criarBatalha → antesDaPergunta → responder → até acabar.

export const PODERES = {
  rino: { nome: 'Couraça', icone: '🛡️', desc: 'Os 2 primeiros erros não tiram coração.' },
  leao: { nome: 'Rugido', icone: '🦁', desc: 'A cada 3 acertos seguidos, o próximo acerto dá dano dobrado.' },
  aguia: { nome: 'Visão de águia', icone: '👁️', desc: 'Toda pergunta já vem com 1 alternativa errada riscada.' },
  furao: { nome: 'Agilidade', icone: '⚡', desc: '+8 segundos por pergunta, e resposta rápida (até 5 s) dá dano extra.' },
  gato: { nome: 'Sete vidas', icone: '🐾', desc: 'Começa a batalha com 5 corações em vez de 3.' },
};

export const BATALHA = {
  vida: [100, 150, 200, 250, 300],          // vida do Magnata em cada camada
  dano: 25,                                 // dano de cada acerto
  danoRapido: 10,                           // extra da Agilidade (furão)
  coracoes: 3,
  tempo: 15,                                // segundos por pergunta
  tempoExtra: 8,                            // Agilidade
  rapido: 5,                                // até quantos segundos conta como resposta rápida
  nivelDaCamada: ['moderado', 'moderado', 'dificil', 'dificil', 'supremo'],
  premio: 50,
};

export const perguntasNecessarias = camada => Math.ceil(BATALHA.vida[camada] / BATALHA.dano) + 4;

export function criarBatalha({ camada, heroi, perguntas }) {
  const vida = BATALHA.vida[camada];
  return {
    camada, heroi, perguntas, i: 0, vidaChefao: vida, vidaMax: vida,
    coracoes: heroi === 'gato' ? 5 : BATALHA.coracoes,
    couraca: heroi === 'rino' ? 2 : 0,
    sequencia: 0, rugidoPronto: false, fim: null, log: [],
  };
}

/** Prepara a pergunta da vez: tempo e, para a águia, uma alternativa errada riscada. */
export function antesDaPergunta(b, aleatorio = Math.random) {
  const q = b.perguntas[b.i];
  const erradas = q.alternativas.map((_, k) => k).filter(k => k !== q.correta);
  const riscada = b.heroi === 'aguia' ? erradas[Math.floor(aleatorio() * erradas.length)] : null;
  return { q, tempo: BATALHA.tempo + (b.heroi === 'furao' ? BATALHA.tempoExtra : 0), riscada };
}

/** Registra a resposta (`certo` = acertou dentro do tempo; `segundos` = quanto demorou). */
export function responder(b, { certo, segundos = BATALHA.tempo }) {
  if (b.fim) return { fim: b.fim };
  const ev = { i: b.i, certo, dano: 0, perdeu: false, poder: null };
  if (certo) {
    let dano = BATALHA.dano;
    if (b.rugidoPronto) { dano *= 2; b.rugidoPronto = false; ev.poder = 'Rugido! Dano dobrado'; }
    if (b.heroi === 'furao' && segundos <= BATALHA.rapido) { dano += BATALHA.danoRapido; ev.poder = 'Agilidade! Dano extra'; }
    b.vidaChefao = Math.max(0, b.vidaChefao - dano);
    ev.dano = dano;
    b.sequencia += 1;
    if (b.heroi === 'leao' && b.sequencia % 3 === 0) { b.rugidoPronto = true; ev.poder ||= 'Rugido carregado: o próximo acerto vale dobrado!'; }
  } else {
    b.sequencia = 0;
    b.rugidoPronto = false;
    if (b.couraca > 0) { b.couraca -= 1; ev.poder = 'Couraça! O golpe não pegou'; }
    else { b.coracoes -= 1; ev.perdeu = true; }
  }
  b.i += 1;
  if (b.vidaChefao <= 0) b.fim = 'vitoria';
  else if (b.coracoes <= 0 || b.i >= b.perguntas.length) b.fim = 'derrota';
  ev.fim = b.fim;
  b.log.push(ev);
  return ev;
}
