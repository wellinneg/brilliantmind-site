// ⚔️ Duelo: dois jogadores respondem as mesmas 10 perguntas ao mesmo tempo.
// Com a família ligada, o duelo viaja dentro do registro de cada um (cada celular só escreve
// no próprio registro). Sem família, dá para duelar contra o Magnata.
import { VOCABULARIO } from './minijogos/vocabulario.js';
import { gerarConta, alternativas, reais } from './minijogos/caixa.js';
import { lerJogo, gravarJogo, lancar, RIVAL } from './jogo.js';
import { hojeISO } from './datas.js';

export const DUELO = {
  perguntas: 10,
  pontosAcerto: 10,
  bonusRapidoMax: 5,          // responder em até 2 s dá +5; cada 2 s a mais tira 1
  premio: { vitoria: 20, empate: 10, derrota: 5 },
  premiadosPorDia: 3,
  validadeConvite: 10 * 60 * 1000,   // convite vale 10 minutos
  esperaFinal: 90 * 1000,            // depois de terminar, espera o outro até 90 s
  acertoMagnata: 0.65,
};

export function sorteador(semente) {
  let s = Math.abs(Math.floor(Number(semente))) % 2147483646 + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

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

export function pontosDaResposta({ certo, ms }) {
  if (!certo) return 0;
  return DUELO.pontosAcerto + Math.max(0, DUELO.bonusRapidoMax - Math.floor(Math.max(0, ms - 2000) / 2000));
}
export const pontuar = respostas => (respostas || []).reduce((s, r) => s + pontosDaResposta(r), 0);

/** Resultado do ponto de vista de "eu". */
export function resultado(minhas, deles) {
  const a = pontuar(minhas), b = pontuar(deles);
  return { meus: a, deles: b, fim: a > b ? 'vitoria' : (a < b ? 'derrota' : 'empate') };
}

/** Respostas do Magnata (treino sem família): erra às vezes, demora 2 a 9 s. */
export function respostasDoMagnata(semente, n = DUELO.perguntas) {
  const aleatorio = sorteador(semente * 7 + 3);
  return Array.from({ length: n }, () => ({ certo: aleatorio() < DUELO.acertoMagnata, ms: 2000 + Math.floor(aleatorio() * 7000) }));
}

// ---- estado do duelo no meu jogo (vai para a internet dentro do registro público) ----
export function novoDuelo({ eu, adversario, semente = Math.floor(Math.random() * 2e9) + 1, agora = Date.now() }) {
  return { id: `${eu}-${agora}`, semente, de: eu, para: adversario, estado: 'convite', respostas: [], criado: agora, premiado: false };
}
export function aceitarConvite(convite, agora = Date.now()) {
  return { id: convite.id, semente: convite.semente, de: convite.de, para: convite.para, estado: 'jogando', respostas: [], criado: agora, premiado: false };
}
/** Convite do irmão para mim, ainda válido e que eu não respondi. */
export function conviteParaMim(jogo, agora = Date.now()) {
  for (const [uid, o] of Object.entries(jogo.outros || {})) {
    const d = o.duelo;
    if (d && d.para === jogo.uid && d.estado === 'convite' && agora - d.criado < DUELO.validadeConvite && jogo.duelo?.id !== d.id) return { uid, apelido: o.apelido, heroi: o.heroi, duelo: d };
  }
  return null;
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
