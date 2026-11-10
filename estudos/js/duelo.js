// ⚔️ Duelo ao vivo entre irmãos (ou treino contra o Magnata).
// Quem desafia escolhe o JOGO e o HORÁRIO (agora, daqui a 10 ou 15 min). Na hora marcada, quando os
// dois estão com o duelo aberto, começa uma contagem de 1 minuto e os dois jogam AO MESMO TEMPO, com
// as mesmas perguntas (mesma semente) e o placar do outro ao vivo. Dá para cancelar, recusar e desistir.
// O duelo viaja dentro do registro de cada um no Firebase (cada celular só escreve o próprio).
import { VOCABULARIO } from './minijogos/vocabulario.js';
import { gerarConta, alternativas, reais } from './minijogos/caixa.js';
import { ITENS_NECESSIDADE, ITENS_DESEJO } from './minijogos/rapidos.js';
import { lerJogo, gravarJogo, lancar, RIVAL } from './jogo.js';
import { hojeISO } from './datas.js';

export const DUELO = {
  perguntas: 10,
  pontosAcerto: 10,
  bonusRapidoMax: 5,          // responder em até 2 s dá +5; cada 2 s a mais tira 1
  premio: { vitoria: 20, empate: 10, derrota: 5 },
  premiadosPorDia: 3,
  horarios: [0, 10, 15],                // minutos a partir de agora
  contagem: 60 * 1000,                  // 1 minuto de contagem quando os dois estão prontos
  presenca: 15 * 1000,                  // "está com o duelo aberto" = sinal de vida nos últimos 15 s
  validadeConvite: 10 * 60 * 1000,      // o convite vale até 10 min depois do horário marcado
  esperaFinal: 90 * 1000,               // depois de terminar, espera o outro até 90 s
  acertoMagnata: 0.65,
};

// tipo 'pontos': vence quem fizer mais no tempo. tipo 'terminar': cada um na sua tela com a MESMA
// grade; quem terminar primeiro vence e a partida acaba na hora para os dois.
export const JOGOS_DUELO = {
  perguntas: { nome: 'Perguntas', icone: '❓', tipo: 'pontos', desc: '10 perguntas de palavras e contas. Acerto vale 10, rapidez dá até +5.' },
  tabuada: { nome: 'Tabuada relâmpago', icone: '✖️', tipo: 'pontos', desc: '60 segundos de contas. Quem acertar mais vence.', tempo: 60 },
  vf: { nome: 'Verdadeiro ou falso', icone: '✅', tipo: 'pontos', desc: '60 segundos: a definição está certa ou errada?', tempo: 60 },
  desejo: { nome: 'Necessidade ou desejo', icone: '🛒', tipo: 'pontos', desc: '45 segundos: é necessidade ou desejo?', tempo: 45 },
  palavras: { nome: 'Caça-palavras', icone: '🔎', tipo: 'terminar', desc: 'A mesma grade para os dois. Quem achar todas as palavras primeiro vence.' },
  memoria: { nome: 'Jogo da memória', icone: '🃏', tipo: 'terminar', desc: 'As mesmas cartas para os dois. Quem achar todos os pares primeiro vence.' },
  pares: { nome: 'Ligar os pares', icone: '🔗', tipo: 'terminar', desc: 'Ligue cada palavra ao seu significado. Quem terminar primeiro vence.' },
  objetos: { nome: 'Caça-objetos', icone: '🧸', tipo: 'terminar', desc: 'A mesma bagunça para os dois. Quem achar tudo primeiro vence.' },
};
export const LIMITE_TERMINAR = 5 * 60 * 1000;   // ninguém terminou em 5 min: empate

/** Jogo de terminar: quem venceu? ('eu' | 'ele' | 'empate' | null = ainda não dá para saber). */
export function vencedorTerminar(meu, dele, agora = Date.now(), inicio = 0) {
  const fezMeu = meu?.concluiu ? meu.fimEm : null, fezDele = dele?.concluiu ? dele.fimEm : null;
  if (dele?.estado === 'desistiu') return 'eu';
  if (meu?.estado === 'desistiu') return 'ele';
  if (fezMeu && fezDele) return fezMeu <= fezDele ? 'eu' : 'ele';
  if (fezMeu) return 'eu';
  if (fezDele) return 'ele';
  const acabaram = meu?.estado === 'fim' && dele?.estado === 'fim';     // os dois saíram sem completar
  if (acabaram || (inicio && agora > inicio + LIMITE_TERMINAR)) return 'empate';
  return null;
}
/** Treino contra o Magnata nos jogos de terminar: em quantos segundos ele termina (70 a 160). */
export const tempoDoMagnata = semente => 70 + Math.floor(sorteador(semente * 17 + 1)() * 90);

export function sorteador(semente) {
  let s = Math.abs(Math.floor(Number(semente))) % 2147483646 + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const misturarCom = (lista, aleatorio) => lista.map(x => [aleatorio(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

/** As 10 perguntas do duelo, iguais para os dois (mesma semente). */
export function perguntasDoDuelo(semente) {
  const aleatorio = sorteador(semente);
  const qs = [];
  for (let k = 0; k < DUELO.perguntas; k++) {
    if (k % 2 === 0) {
      const grupo = VOCABULARIO[Math.floor(aleatorio() * VOCABULARIO.length)];
      const [palavra, def] = grupo[Math.floor(aleatorio() * grupo.length)];
      const outras = grupo.filter(([p]) => p !== palavra).map(x => [aleatorio(), x[0]]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]);
      const opcoes = [palavra, ...outras].map(x => [aleatorio(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      qs.push({ texto: `Qual palavra significa: "${def}"?`, opcoes, correta: opcoes.indexOf(palavra) });
    } else {
      const c = gerarConta(0, aleatorio);
      const ops = alternativas(c.certa, aleatorio);
      qs.push({ texto: c.texto, opcoes: ops.map(reais), correta: ops.indexOf(c.certa) });
    }
  }
  return qs;
}

/** Sequência de rodadas de um jogo rápido, igual para os dois. Cada item: { texto, opcoes:[{texto,certo}] }. */
export function rodadasDoDuelo(jogo, semente, n = 120) {
  const aleatorio = sorteador(semente * 13 + 7);
  const sorteio = k => Math.floor(aleatorio() * k);
  if (jogo === 'tabuada') {
    return Array.from({ length: n }, () => {
      const a = sorteio(8) + 2, b = sorteio(8) + 2, certa = a * b;
      const opcoes = new Set([certa]);
      for (const d of misturarCom([1, 2, a, b, 10, -1, -2, -a], aleatorio)) { if (opcoes.size === 4) break; if (certa + d > 0) opcoes.add(certa + d); }
      return { texto: `${a} × ${b} = ?`, opcoes: misturarCom([...opcoes], aleatorio).map(v => ({ texto: String(v), certo: v === certa })) };
    });
  }
  if (jogo === 'vf') {
    const pares = VOCABULARIO.flat();
    return Array.from({ length: n }, () => {
      const [palavra, def] = pares[sorteio(pares.length)];
      const verdade = aleatorio() < 0.5;
      let mostrada = def;
      if (!verdade) { let outro; do { outro = pares[sorteio(pares.length)]; } while (outro[0] === palavra); mostrada = outro[1]; }
      return { texto: `${palavra}: ${mostrada.charAt(0).toLowerCase()}${mostrada.slice(1)}.`,
        opcoes: [{ texto: '✅ Verdadeiro', certo: verdade }, { texto: '❌ Falso', certo: !verdade }] };
    });
  }
  // desejo
  const base = [...ITENS_NECESSIDADE.map(i => [i, true]), ...ITENS_DESEJO.map(i => [i, false])];
  const fila = [];
  while (fila.length < n) fila.push(...misturarCom(base, aleatorio));
  return fila.slice(0, n).map(([item, nec]) => ({ texto: item, opcoes: [{ texto: '🏠 Necessidade', certo: nec }, { texto: '🎁 Desejo', certo: !nec }] }));
}

export function pontosDaResposta({ certo, ms }) {
  if (!certo) return 0;
  return DUELO.pontosAcerto + Math.max(0, DUELO.bonusRapidoMax - Math.floor(Math.max(0, ms - 2000) / 2000));
}
export const pontuar = respostas => (respostas || []).reduce((s, r) => s + pontosDaResposta(r), 0);

/** Resultado do ponto de vista de "eu" (pontos já somados). */
export function resultadoPorPontos(meus, deles) {
  return { meus, deles, fim: meus > deles ? 'vitoria' : (meus < deles ? 'derrota' : 'empate') };
}
export const resultado = (minhas, deles) => resultadoPorPontos(pontuar(minhas), pontuar(deles));

/** Respostas do Magnata no jogo de perguntas: erra às vezes, demora 2 a 9 s. */
export function respostasDoMagnata(semente, n = DUELO.perguntas) {
  const aleatorio = sorteador(semente * 7 + 3);
  return Array.from({ length: n }, () => ({ certo: aleatorio() < DUELO.acertoMagnata, ms: 2000 + Math.floor(aleatorio() * 7000) }));
}
/** Acertos do Magnata nos jogos rápidos até `segundos` (ritmo de ~1 acerto a cada 3,2 s, com sorte). */
export function acertosDoMagnata(semente, segundos) {
  const aleatorio = sorteador(semente * 11 + 5);
  let t = 0, n = 0;
  while (true) { t += 2.4 + aleatorio() * 1.6; if (t > segundos) return n; if (aleatorio() < 0.85) n++; }
}

// ---- estado do duelo no meu jogo (vai para a internet dentro do registro público) ----
export function novoDuelo({ eu, adversario, jogo = 'perguntas', daquiMin = 0, semente = Math.floor(Math.random() * 2e9) + 1, agora = Date.now() }) {
  return { id: `${eu}-${agora}`, semente, jogo, de: eu, para: adversario, estado: 'convite', marcadoPara: agora + daquiMin * 60000,
    criado: agora, pronto: 0, inicio: 0, respostas: [], pontos: 0, premiado: false };
}
export function aceitarConvite(convite, agora = Date.now()) {
  return { id: convite.id, semente: convite.semente, jogo: convite.jogo || 'perguntas', de: convite.de, para: convite.para,
    estado: 'aceito', marcadoPara: convite.marcadoPara || convite.criado, criado: agora, pronto: 0, inicio: 0, respostas: [], pontos: 0, premiado: false };
}

/** Convite do irmão para mim, ainda válido e que eu não respondi. */
export function conviteParaMim(jogo, agora = Date.now()) {
  for (const [uid, o] of Object.entries(jogo.outros || {})) {
    const d = o.duelo;
    const limite = (d?.marcadoPara || d?.criado || 0) + DUELO.validadeConvite;
    if (d && d.para === jogo.uid && d.estado === 'convite' && agora < limite && jogo.duelo?.id !== d.id) return { uid, apelido: o.apelido, heroi: o.heroi, duelo: d };
  }
  return null;
}

/**
 * Situação da sala do duelo, do meu ponto de vista. `meu` = jogo.duelo, `dele` = duelo do irmão, `euUid` = meu uid.
 * fases: cancelado | esperando-aceite | aguardando-horario | esperando-irmao | pronto-para-contar | contagem | jogando | expirado
 * Quem convidou é quem marca o início (inicio = agora + 1 min); o outro lê esse horário do registro dele.
 */
export function faseDaSala(meu, dele, euUid, agora = Date.now()) {
  if (!meu || ['cancelado', 'recusado', 'desistiu'].includes(meu.estado)) return { fase: 'cancelado', por: 'eu' };
  const mesmo = dele?.id === meu.id;
  if (mesmo && ['cancelado', 'recusado'].includes(dele.estado)) return { fase: 'cancelado', por: 'ele', motivo: dele.estado };
  const convidei = meu.de === euUid;
  const aceito = convidei ? (mesmo && dele.estado !== 'convite') : true;
  const inicio = (convidei ? meu.inicio : (mesmo ? dele.inicio : 0)) || 0;
  if (inicio) return agora < inicio ? { fase: 'contagem', inicio, falta: inicio - agora } : { fase: 'jogando', inicio };
  if (agora > meu.marcadoPara + DUELO.validadeConvite) return { fase: 'expirado' };
  if (!aceito) return { fase: 'esperando-aceite' };
  if (agora < meu.marcadoPara) return { fase: 'aguardando-horario', falta: meu.marcadoPara - agora };
  const elePresente = mesmo && agora - (dele.pronto || 0) < DUELO.presenca;
  if (!elePresente) return { fase: 'esperando-irmao' };
  return { fase: 'pronto-para-contar', euMarco: convidei };
}

/** Dá o prêmio do duelo uma vez só (no meu celular). */
export async function premiarDuelo(fim, data = hojeISO()) {
  const jogo = await lerJogo();
  if (!jogo.duelo || jogo.duelo.premiado) return { notas: 0, motivo: 'ja' };
  jogo.duelo.premiado = true;
  jogo.duelosDoDia = jogo.duelosDoDia?.data === data ? jogo.duelosDoDia : { data, n: 0 };
  let notas = 0;
  if (jogo.duelosDoDia.n < DUELO.premiadosPorDia) {
    notas = DUELO.premio[fim];
    jogo.duelosDoDia.n += 1;
    jogo.carteira += notas;
    const adv = jogo.duelo.contra === RIVAL.id ? RIVAL.nome : (jogo.outros?.[jogo.duelo.de === jogo.uid ? jogo.duelo.para : jogo.duelo.de]?.apelido || 'irmão');
    lancar(jogo, { tipo: 'duelo', descricao: `⚔️ Duelo contra ${adv}: ${fim === 'vitoria' ? 'vitória' : fim}`, valor: notas });
  }
  await gravarJogo(jogo);
  return { notas };
}
