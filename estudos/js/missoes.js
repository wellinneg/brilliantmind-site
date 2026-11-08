// 🎯 Missões diárias e semanais + 🏆 temporadas de 4 semanas.
// O progresso conta sozinho: cada ação do jogo chama registrarEvento(tipo, dados).
import * as db from './db.js';
import { lerJogo, gravarJogo, lancar } from './jogo.js';
import { hojeISO, diasEntre } from './datas.js';

const CHAVE = 'missoes';
const INICIO = '2026-11-02';                // segunda-feira em que começou a Temporada 1 (base das semanas)
export const SEMANAS_POR_TEMPORADA = 4;
export const NIVEIS_TEMPORADA = 10;
export const XP_POR_NIVEL = 100;
export const RECOMPENSA = { diaria: { notas: 10, xp: 20 }, semanal: { notas: 30, xp: 60 } };

// evento: o que conta; filtro: só conta se…; somar: soma esse campo em vez de contar 1
export const DIARIAS = [
  { id: 'licao-dificil', texto: 'Passe numa lição Difícil ou Supremo', evento: 'licao', alvo: 1, filtro: d => d.aprovado && ['dificil', 'supremo'].includes(d.dificuldade) },
  { id: 'gabaritar', texto: 'Gabarite uma lição (5 de 5)', evento: 'licao', alvo: 1, filtro: d => d.nota === 5 },
  { id: 'licoes-2', texto: 'Passe em 2 lições', evento: 'licao', alvo: 2, filtro: d => d.aprovado },
  { id: 'minijogos-2', texto: 'Jogue 2 minijogos', evento: 'minijogo', alvo: 2 },
  { id: 'recorde', texto: 'Bata um recorde num minijogo', evento: 'minijogo', alvo: 1, filtro: d => d.novoRecorde },
  { id: 'lucro', texto: 'Tenha lucro num dia de negócio', evento: 'negocio', alvo: 1, filtro: d => d.lucro > 0 },
  { id: 'fechar-dia', texto: 'Feche o dia de estudo', evento: 'dia', alvo: 1 },
  { id: 'notas-40', texto: 'Ganhe 40 notas hoje', evento: 'notas', alvo: 40, somar: 'valor' },
  { id: 'aplicar', texto: 'Faça uma aplicação no Banco', evento: 'aplicacao', alvo: 1 },
];
export const SEMANAIS = [
  { id: 'dias-4', texto: 'Feche 4 dias de estudo', evento: 'dia', alvo: 4 },
  { id: 'notas-200', texto: 'Ganhe 200 notas na semana', evento: 'notas', alvo: 200, somar: 'valor' },
  { id: 'territorios-2', texto: 'Conquiste 2 territórios', evento: 'conquista', alvo: 2 },
  { id: 'ouvir-3', texto: 'Faça 3 episódios do Ouvir', evento: 'ouvir', alvo: 3 },
  { id: 'minijogos-8', texto: 'Jogue 8 minijogos', evento: 'minijogo', alvo: 8 },
  { id: 'lucro-60', texto: 'Lucre 60 notas na empresa', evento: 'negocio', alvo: 60, somar: 'lucro', filtro: d => d.lucro > 0 },
  { id: 'supremo-3', texto: 'Passe em 3 lições no Supremo', evento: 'licao', alvo: 3, filtro: d => d.aprovado && d.dificuldade === 'supremo' },
  { id: 'prova', texto: 'Faça uma prova surpresa', evento: 'prova', alvo: 1 },
];

export const semanaDe = data => Math.floor(diasEntre(INICIO, data) / 7);
export const temporadaDe = data => Math.floor(semanaDe(data) / SEMANAS_POR_TEMPORADA) + 1;
export function diasParaAcabarTemporada(data) {
  const t = temporadaDe(data);
  return t * SEMANAS_POR_TEMPORADA * 7 - diasEntre(INICIO, data);
}

function sortear(lista, semente, n) {
  let s = [...String(semente)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) || 1;
  const aleatorio = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  return lista.map(m => [aleatorio(), m]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
}
const nova = m => ({ id: m.id, progresso: 0, coletada: false });

/** Estado das missões, renovando as diárias/semanais/temporada quando o dia/semana/temporada vira. */
export function atualizar(estado, data = hojeISO()) {
  const e = estado ? structuredClone(estado) : {};
  if (e.dia !== data) { e.dia = data; e.diarias = sortear(DIARIAS, data, 3).map(nova); }
  const semana = semanaDe(data);
  if (e.semana !== semana) { e.semana = semana; e.semanais = sortear(SEMANAIS, `s${semana}`, 3).map(nova); }
  const temporada = temporadaDe(data);
  if (e.temporada?.id !== temporada) {
    const titulo = `Lenda da Temporada ${e.temporada?.id}`;
    if (e.temporada?.nivelColetado >= NIVEIS_TEMPORADA && !(e.titulos || []).includes(titulo)) e.titulos = [...(e.titulos || []), titulo];
    e.temporada = { id: temporada, xp: 0, nivelColetado: 0 };
  }
  return e;
}

export const modeloDe = id => DIARIAS.find(m => m.id === id) || SEMANAIS.find(m => m.id === id);

/** Aplica um evento no estado (sem gravar). Devolve as missões que acabaram de ficar prontas. */
export function aplicarEvento(e, tipo, dados = {}) {
  const prontas = [];
  for (const lista of [e.diarias, e.semanais]) for (const m of lista) {
    const mod = modeloDe(m.id);
    if (mod.evento !== tipo || m.coletada || m.progresso >= mod.alvo) continue;
    if (mod.filtro && !mod.filtro(dados)) continue;
    m.progresso = Math.min(mod.alvo, m.progresso + (mod.somar ? Math.max(0, Number(dados[mod.somar]) || 0) : 1));
    if (m.progresso >= mod.alvo) prontas.push(mod);
  }
  return prontas;
}

export const nivelDaTemporada = xp => Math.min(NIVEIS_TEMPORADA, Math.floor(xp / XP_POR_NIVEL));
export const premioDoNivel = n => n * 10;   // nível 1 = 10 notas … nível 10 = 100 notas

export async function lerMissoes(data = hojeISO()) {
  const e = atualizar(await db.lerConfig(CHAVE), data);
  await db.gravarConfig(CHAVE, e);
  return e;
}

/** Chamado pelas ações do jogo. Nunca quebra a ação se algo der errado aqui. */
export async function registrarEvento(tipo, dados = {}, data = hojeISO()) {
  try {
    const e = atualizar(await db.lerConfig(CHAVE), data);
    const prontas = aplicarEvento(e, tipo, dados);
    await db.gravarConfig(CHAVE, e);
    return prontas;
  } catch { return []; }
}

/** Resgata uma missão pronta: notas na carteira e pontos na temporada. */
export async function resgatarMissao(id, data = hojeISO()) {
  const e = atualizar(await db.lerConfig(CHAVE), data);
  const diaria = e.diarias.find(m => m.id === id);
  const m = diaria || e.semanais.find(x => x.id === id);
  const mod = modeloDe(id);
  if (!m || m.coletada) throw new Error('Missão não disponível.');
  if (m.progresso < mod.alvo) throw new Error('Essa missão ainda não terminou.');
  const r = diaria ? RECOMPENSA.diaria : RECOMPENSA.semanal;
  m.coletada = true;
  e.temporada.xp += r.xp;
  await db.gravarConfig(CHAVE, e);
  const jogo = await lerJogo();
  jogo.carteira += r.notas;
  lancar(jogo, { tipo: 'missao', descricao: `🎯 Missão: ${mod.texto}`, valor: r.notas });
  jogo.temporadaXP = { id: e.temporada.id, xp: e.temporada.xp };   // vai para o placar da família
  await gravarJogo(jogo);
  return r;
}

/** Resgata os níveis da temporada já alcançados (cada nível dá notas). */
export async function resgatarNiveis(data = hojeISO()) {
  const e = atualizar(await db.lerConfig(CHAVE), data);
  const alcancado = nivelDaTemporada(e.temporada.xp);
  let total = 0;
  for (let n = e.temporada.nivelColetado + 1; n <= alcancado; n++) total += premioDoNivel(n);
  if (!total) return 0;
  const de = e.temporada.nivelColetado + 1;
  e.temporada.nivelColetado = alcancado;
  if (alcancado >= NIVEIS_TEMPORADA && !(e.titulos || []).includes(`Lenda da Temporada ${e.temporada.id}`)) {
    e.titulos = [...(e.titulos || []), `Lenda da Temporada ${e.temporada.id}`];
  }
  await db.gravarConfig(CHAVE, e);
  const jogo = await lerJogo();
  jogo.carteira += total;
  lancar(jogo, { tipo: 'missao', descricao: `🏆 Temporada ${e.temporada.id}: níveis ${de} a ${alcancado}`, valor: total });
  jogo.titulos = e.titulos || [];
  await gravarJogo(jogo);
  return total;
}
