// ⚔️ Desempate de território num minijogo (Tabuada relâmpago, 60 s, a mesma tabuada para todos).
// - Contra o Magnata: ele tem uma pontuação a bater (sobe a cada camada).
// - Contra o irmão: cada um joga uma vez, quando puder; o resultado viaja no registro de cada um
//   (Firebase). Quando todos que empataram jogaram, quem fez mais pontos vence (empate de pontos:
//   quem terminou primeiro).
// - Quem vence tira 1 nota de um adversário naquele território: o suficiente para desempatar.
//   A nota tirada vai como "roubo" no registro do vencedor (cada celular só escreve o próprio).
import { CAMADAS, EU, RIVAL, calcularTerritorio, empateDe, lerJogo, gravarJogo, lancar } from './jogo.js';

export const DESEMPATE = {
  tempo: 60,
  alvoMagnata: camada => 14 + camada * 2,   // contas certas que o Magnata "faz"
};

const camadaDe = t => CAMADAS.findIndex(c => c.territorios.includes(t));
const meuId = jogo => jogo.uid || 'eu';
const idGlobal = (jogo, id) => (id === EU ? meuId(jogo) : id);

/** Assinatura do empate atual (muda quando o empate muda: aí é uma disputa nova). */
export function assinatura(jogo, t) {
  const est = calcularTerritorio(jogo, t);
  const ids = empateDe(est);
  if (!ids) return null;
  return `${ids.map(id => idGlobal(jogo, id)).sort().join(',')}|${est.donos[ids[0]]}`;
}

/** Situação do desempate de um território, do meu ponto de vista. */
export function situacaoDesempate(jogo, t) {
  const est = calcularTerritorio(jogo, t);
  const ids = empateDe(est);
  if (!ids) return { empate: false };
  const sig = assinatura(jogo, t);
  const euNoEmpate = ids.includes(EU);
  const meu = jogo.desempates?.[t.id]?.sig === sig ? jogo.desempates[t.id] : null;
  const participantes = ids.map(id => {
    if (id === RIVAL.id) return { id, nome: RIVAL.nome, pontos: DESEMPATE.alvoMagnata(camadaDe(t)), em: 0, jogou: true, magnata: true };
    if (id === EU) return { id, nome: jogo.apelido || 'Você', pontos: meu?.pontos ?? null, em: meu?.em ?? 0, jogou: !!meu, eu: true };
    const d = jogo.outros?.[id]?.desempates?.[t.id];
    const valido = d?.sig === sig ? d : null;
    return { id, nome: jogo.outros?.[id]?.apelido || 'Irmão', pontos: valido?.pontos ?? null, em: valido?.em ?? 0, jogou: !!valido };
  });
  const todosJogaram = participantes.every(p => p.jogou);
  let vencedor = null;
  if (todosJogaram) {
    vencedor = [...participantes].sort((a, b) => (b.pontos - a.pontos) || ((a.magnata ? 1 : 0) - (b.magnata ? 1 : 0)) || (a.em - b.em))[0];
    // contra o Magnata é preciso PASSAR a pontuação dele (empatar não basta)
    const magnata = participantes.find(p => p.magnata);
    if (magnata && vencedor.id !== RIVAL.id && vencedor.pontos <= magnata.pontos) vencedor = magnata;
  }
  return { empate: true, sig, ids, euNoEmpate, participantes, eu: participantes.find(p => p.eu), todosJogaram, vencedor, notas: est.donos[ids[0]] };
}

/** Grava a minha pontuação no desempate (uma vez por empate). */
export async function registrarDesempate(t, pontos, agora = Date.now()) {
  const jogo = await lerJogo();
  const sig = assinatura(jogo, t);
  if (!sig) return { motivo: 'sem-empate' };
  if (jogo.desempates?.[t.id]?.sig === sig) return { motivo: 'ja-jogou' };
  jogo.desempates = { ...(jogo.desempates || {}), [t.id]: { sig, pontos, em: agora } };
  await gravarJogo(jogo);
  return aplicarVitorias(jogo, [t]);
}

/** Se eu venci algum desempate já fechado, tiro 1 nota de um adversário (uma vez). */
export async function aplicarVitorias(jogo = null, territorios = null) {
  jogo ||= await lerJogo();
  const lista = territorios || CAMADAS.flatMap(c => c.territorios);
  const ganhos = [];
  for (const t of lista) {
    const s = situacaoDesempate(jogo, t);
    if (!s.empate || !s.todosJogaram || !s.vencedor?.eu) continue;
    const meu = jogo.desempates[t.id];
    if (meu.aplicado) continue;
    const vitima = s.participantes.find(p => p.magnata) || s.participantes.find(p => !p.eu);
    const roubos = (jogo.meu.roubos ||= {});
    roubos[t.id] ||= {};
    roubos[t.id][vitima.id] = (roubos[t.id][vitima.id] || 0) + 1;
    meu.aplicado = true;
    lancar(jogo, { tipo: 'desempate', descricao: `⚔️ Venceu o desempate de ${t.icone} ${t.nome} contra ${vitima.nome}`, valor: 0 });
    ganhos.push({ t, vitima: vitima.nome });
  }
  if (ganhos.length) await gravarJogo(jogo);
  return { ganhos };
}

/** O que vai para os irmãos: só as pontuações dos desempates ainda em aberto. */
export function desempatesPublicos(jogo) {
  const pub = {};
  for (const [id, d] of Object.entries(jogo.desempates || {})) if (!d.aplicado) pub[id] = { sig: d.sig, pontos: d.pontos, em: d.em };
  return pub;
}
