import { el } from '../ui.js';
import * as estado from '../estado.js';
import { MEDALHAS, medalhasConquistadas } from '../conquistas.js';
import * as db from '../db.js';
import { calendarioInterativo } from '../calendario.js';

export async function render(raiz) {
  const e = await estado.resumo();
  const ganhas = new Set(medalhasConquistadas(e).map(m => m.id));
  raiz.append(
    el('h1', {}, '🏆 Conquistas'),
    el('div', { class: 'linha' },
      el('div', { class: 'cartao' }, el('small', {}, 'Pontos'), el('h2', {}, `⭐ ${e.pontos}`)),
      el('div', { class: 'cartao' }, el('small', {}, 'Sequência'), el('h2', {}, `🔥 ${e.sequencia}`), el('small', {}, `Recorde: ${e.recordeSequencia}`))),
    el('p', { class: 'subtitulo' }, `${e.diasFechados} dia(s) completo(s) · ${e.leituras} leitura(s) gravada(s)`),
    calendarioInterativo(await db.listarDias()),
    el('div', { class: 'medalhas' }, MEDALHAS.map(m => el('div', { class: `medalha ${ganhas.has(m.id) ? '' : 'bloqueada'}` },
      el('span', { class: 'emoji' }, m.emoji), el('strong', {}, m.nome), el('br'), el('small', {}, m.desc)))),
    el('p', { class: 'credito' }, 'Sistema desenvolvido pela BMC Contabilidade'));
}
