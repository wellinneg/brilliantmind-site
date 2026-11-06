// Regras comuns dos minijogos: só liberam depois das lições do dia, no máximo 3 partidas por dia
// valem moedas, cronômetro e recordes por jogo e lugar.
import { el, navegar } from '../ui.js';
import * as db from '../db.js';
import { statusDoDia } from '../rodizio.js';
import { hojeISO } from '../datas.js';
import { lerJogo, gravarJogo, ganharMoedas } from '../jogo.js';
import { sincronizarDepois } from '../familia.js';
import { comemorarJogo } from '../comemorar.js';
import { confete } from '../efeitos.js';
import { sons } from '../sons.js';

export const PREMIOS_POR_DIA = 3;
const chavePremios = data => `minijogos:premios:${data}`;

export const MINIJOGOS = {
  palavras: { nome: 'Caça-palavras', icone: '🔤', desc: 'Ache as palavras escondidas na grade, contra o relógio.' },
  objetos: { nome: 'Caça-objetos', icone: '🔎', desc: 'O lugar está uma bagunça! Ache os objetos da lista.' },
  memoria: { nome: 'Jogo da memória', icone: '🃏', desc: 'Junte cada palavra com o seu significado.' },
  caixa: { nome: 'Corrida do caixa', icone: '💵', desc: 'Contas de preço e troco: quantas você acerta em 60 segundos?' },
};

/** Pode jogar valendo moedas? (`reg` = registro de hoje; null quando o conteúdo do ano acabou) */
export async function situacao(reg, data = hojeISO()) {
  const usados = (await db.lerConfig(chavePremios(data))) || 0;
  const liberado = !reg || statusDoDia(reg).blocosOk;
  return { liberado, premiosRestantes: Math.max(0, PREMIOS_POR_DIA - usados), usados };
}

export function recordeDe(jogo, tipo, territorioId) { return jogo.recordes?.[`${tipo}:${territorioId}`] || null; }

/**
 * Fim de partida: guarda o recorde e, se ainda houver prêmio hoje, dá as moedas no lugar.
 * `recorde` = { valor, menorMelhor } (tempo em segundos: menor é melhor; pontos: maior é melhor).
 */
export async function encerrarPartida({ tipo, t, moedas, recorde, data = hojeISO() }) {
  const jogo = await lerJogo();
  jogo.recordes ||= {};
  const chave = `${tipo}:${t.id}`;
  const anterior = jogo.recordes[chave] ?? null;
  const novoRecorde = recorde && (anterior == null || (recorde.menorMelhor ? recorde.valor < anterior : recorde.valor > anterior));
  if (novoRecorde) jogo.recordes[chave] = recorde.valor;
  const usados = (await db.lerConfig(chavePremios(data))) || 0;
  const valendo = usados < PREMIOS_POR_DIA && moedas > 0;
  let res = null;
  if (valendo) {
    res = ganharMoedas(jogo, { materia: t.materias[0], moedas, dificuldade: 'minijogo', descricao: `Minijogo: ${MINIJOGOS[tipo].nome}` });
    await db.gravarConfig(chavePremios(data), usados + 1);
  }
  await gravarJogo(jogo);
  if (valendo) sincronizarDepois();
  return { valendo, res, novoRecorde, anterior, restantes: Math.max(0, PREMIOS_POR_DIA - usados - (valendo ? 1 : 0)) };
}

/** Cronômetro que conta para cima (mostra mm:ss) ou para baixo (com `limite` em segundos). */
export function cronometro(visor, { limite = null, aoAcabar } = {}) {
  const inicio = performance.now();
  let extra = 0, parado = false;
  const segundos = () => Math.floor((performance.now() - inicio) / 1000) + extra;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const tique = setInterval(() => {
    if (parado) return;
    if (!document.body.contains(visor)) { clearInterval(tique); return; } // saiu da tela
    const s = segundos();
    if (limite != null) {
      const resta = Math.max(0, limite - s);
      visor.textContent = `⏱ ${fmt(resta)}`;
      visor.classList.toggle('acabando', resta <= 10);
      if (resta === 0) { parado = true; clearInterval(tique); aoAcabar?.(); }
    } else visor.textContent = `⏱ ${fmt(s)}`;
  }, 250);
  visor.textContent = `⏱ ${fmt(limite ?? 0)}`;
  return {
    segundos,
    multa(s) { extra += s; visor.classList.remove('multa'); void visor.offsetWidth; visor.classList.add('multa'); },
    parar() { parado = true; clearInterval(tique); return segundos(); },
    fmt,
  };
}

export const formatarTempo = s => `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, '0')}s`;

/** Tela de resultado comum: título, números da partida, recorde e prêmio. */
export function mostrarResultado(area, { titulo, linhas, fim, t, tipo, jogarDeNovo }) {
  if (fim.valendo || fim.novoRecorde) confete();
  else sons.moeda();
  area.replaceChildren(
    el('div', { class: 'resultado-jogo' },
      el('h2', {}, titulo),
      ...linhas.map(l => el('p', {}, l)),
      fim.novoRecorde ? el('p', { class: 'conquista-nova' }, fim.anterior == null ? '🏅 Primeiro recorde marcado!' : '🏅 Novo recorde!') : null,
      fim.valendo ? null : el('p', { class: 'dica' }, `Hoje já valeram ${PREMIOS_POR_DIA} partidas. Esta foi por diversão (o recorde vale!).`),
      fim.valendo && fim.restantes >= 0 ? el('p', { class: 'dica' }, `Partidas valendo notas hoje: faltam ${fim.restantes}.`) : null),
    comemorarJogo(fim.res),
    el('div', { class: 'linha' },
      el('button', { class: 'botao', onclick: jogarDeNovo }, '🔁 Jogar de novo'),
      el('button', { class: 'botao secundario', onclick: () => navegar(`#/lugar/${t.id}`) }, `← ${t.icone} ${t.nome}`)));
}
