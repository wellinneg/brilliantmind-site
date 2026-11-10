// 🔥 Palavra Quente (jogo original): descubra a palavra secreta. Cada palpite mostra a POSIÇÃO de
// proximidade de sentido (#1 = a própria palavra, #2 = a mais parecida...) e uma barra de 🧊 frio a 🔥 quente.
// Funciona sem internet: cada secreta tem uma lista pronta das 150 palavras mais ligadas a ela.
import { el } from '../ui.js';
import * as db from '../db.js';
import { semAcento } from './vocabulario.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop, confete } from '../efeitos.js';

const ULTIMAS = 'quente:ultimas';
export const normalizar = p => semAcento(String(p || '').trim().toLowerCase()).replace(/[^a-z-]/g, '');

let cache = null;
export async function carregarPalavras() {
  if (cache) return cache;
  const r = await fetch('conteudo/quente/palavras.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Não consegui carregar as palavras. Conecte à internet uma vez e tente de novo.');
  cache = await r.json();
  return cache;
}

/** Posição de um palpite (1 = acertou; 2.. = posição na lista; null = longe/desconhecida). Aceita plural simples. */
export function posicao(secreta, palpite) {
  const alvo = normalizar(secreta.secreta);
  const lista = secreta.proximas.map(normalizar);
  const tentar = p => (p === alvo ? 1 : (lista.indexOf(p) >= 0 ? lista.indexOf(p) + 2 : null));
  const p = normalizar(palpite);
  if (!p) return null;
  let r = tentar(p);
  if (r == null && p.endsWith('es')) r = tentar(p.slice(0, -2));
  if (r == null && p.endsWith('s')) r = tentar(p.slice(0, -1));
  if (r == null) r = tentar(`${p}s`);
  return r;
}

/** Temperatura de uma posição: 0 (gelado) a 1 (achou). */
export const temperatura = pos => (pos == null ? 0 : Math.max(0.04, 1 - (pos - 1) / 151));
const emoji = pos => (pos == null ? '🧊' : pos === 1 ? '🎯' : pos <= 10 ? '🔥' : pos <= 40 ? '♨️' : pos <= 90 ? '🌤️' : '❄️');

/** Dica: uma palavra mais próxima que o melhor palpite até agora (na metade do caminho até a #2). */
export function dica(secreta, melhor) {
  const ate = Math.max(2, Math.min(melhor ?? 152, 152));
  const alvo = Math.max(2, Math.floor(ate / 2));
  return { palavra: secreta.proximas[alvo - 2], pos: alvo };
}

/** Notas ao acertar: menos palpites e menos dicas = mais notas. */
export const notasDoQuente = (palpites, dicas) => Math.max(4, Math.min(20, 22 - Math.floor(palpites / 2)) - dicas * 3);

export async function iniciar(area, { t }) {
  let dados;
  try { dados = await carregarPalavras(); } catch (e) { area.replaceChildren(el('p', { class: 'caixa-dica' }, e.message)); return; }
  // sorteia uma secreta que não saiu nas últimas 10 partidas
  const ultimas = (await db.lerConfig(ULTIMAS)) || [];
  const opcoes = dados.secretas.filter(s => !ultimas.includes(s.secreta));
  const secreta = (opcoes.length ? opcoes : dados.secretas)[Math.floor(Math.random() * (opcoes.length || dados.secretas.length))];
  await db.gravarConfig(ULTIMAS, [secreta.secreta, ...ultimas].slice(0, 10));

  const palpites = [];          // { palavra, pos }
  let dicas = 0, acabou = false;
  const contador = el('strong', {}, '🔥 0 palpites');
  const visor = el('span', { class: 'cronometro' });
  const campo = el('input', { id: 'palpite-quente', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Digite uma palavra', maxlength: 24 });
  const ultimo = el('div', { class: 'ultimo-quente' });
  const lista = el('div', { class: 'lista-quente' });
  const aviso = el('p', { class: 'dica' });
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, contador, visor),
    el('p', { class: 'dica' }, 'Descubra a palavra secreta. Cada palpite mostra a posição: #1 é a palavra, #2 a mais parecida. Quanto menor o número, mais 🔥 quente!'),
    el('form', { class: 'form-quente', onsubmit: e => { e.preventDefault(); chutar(campo.value); } }, campo, el('button', { class: 'botao', type: 'submit' }, 'Chutar')),
    aviso, ultimo, lista,
    el('div', { class: 'linha' },
      el('button', { class: 'botao secundario', type: 'button', onclick: darDica }, '💡 Dica'),
      el('button', { class: 'botao secundario', type: 'button', onclick: () => { if (confirm('Desistir e ver a palavra?')) terminar(false); } }, '🏳️ Desistir')));
  const relogio = cronometro(visor);
  campo.focus();

  const linha = (p, destaque = false) => el('div', { class: `palpite-quente ${destaque ? 'novo' : ''}`, style: `--temp:${temperatura(p.pos)}` },
    el('span', { class: 'barra-temp' }),
    el('span', { class: 'palavra' }, `${emoji(p.pos)} ${p.palavra}${p.dica ? ' 💡' : ''}`),
    el('span', { class: 'pos' }, p.pos == null ? 'longe' : `#${p.pos}`));
  const desenhar = novo => {
    contador.textContent = `🔥 ${palpites.length} palpite${palpites.length === 1 ? '' : 's'}`;
    ultimo.replaceChildren(novo ? linha(novo, true) : '');
    lista.replaceChildren(...[...palpites].sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999)).map(p => linha(p)));
  };
  function registrar(palavra, pos, deDica = false) {
    const p = { palavra, pos, dica: deDica };
    palpites.push(p);
    desenhar(p);
    if (pos === 1) { sons.conquista(); confete(); terminar(true); }
    else if (pos != null && pos <= 10) { sons.moeda(); pop(ultimo); }
    else if (pos == null) sons.erro();
  }
  function chutar(texto) {
    if (acabou) return;
    const palavra = String(texto || '').trim().toLowerCase();
    campo.value = ''; campo.focus();
    if (!normalizar(palavra)) return;
    if (palpites.some(p => normalizar(p.palavra) === normalizar(palavra))) { aviso.textContent = `Você já tentou "${palavra}".`; pop(aviso, 'tremer'); return; }
    const pos = posicao(secreta, palavra);
    aviso.textContent = pos == null ? `"${palavra}" está muito longe (ou não conheço essa palavra). Tente outra!` : '';
    registrar(palavra, pos);
  }
  function darDica() {
    if (acabou) return;
    const melhor = Math.min(...palpites.map(p => p.pos ?? 999), 999);
    if (melhor <= 2) { aviso.textContent = 'Você já está pertinho: a palavra mais próxima já apareceu!'; return; }
    const d = dica(secreta, melhor === 999 ? null : melhor);
    dicas++;
    aviso.textContent = `💡 Dica: "${d.palavra}" está na posição #${d.pos}. Dicas tiram um pouco das notas.`;
    registrar(d.palavra, d.pos, true);
  }
  async function terminar(acertou) {
    if (acabou) return;
    acabou = true;
    const s = relogio.parar();
    const n = palpites.filter(p => !p.dica).length;
    const moedas = acertou ? notasDoQuente(n, dicas) : 0;
    const fim = await encerrarPartida({ tipo: 'quente', t, moedas, recorde: acertou ? { valor: n, menorMelhor: true } : null });
    const vizinhas = secreta.proximas.slice(0, 5).join(', ');
    mostrarResultado(area, {
      titulo: acertou ? `🎯 Achou: ${secreta.secreta.toUpperCase()}!` : `🏳️ A palavra era ${secreta.secreta.toUpperCase()}`,
      linhas: [`Palpites: ${n}${dicas ? ` (+${dicas} dica${dicas === 1 ? '' : 's'})` : ''}`, `Tempo: ${formatarTempo(s)}`, `As mais próximas eram: ${vizinhas}.`],
      fim, t, tipo: 'quente', jogarDeNovo: () => iniciar(area, { t }),
    });
  }
}
