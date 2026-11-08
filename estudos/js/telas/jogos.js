// Aba "Jogos" (#/jogos): sala de surpresas. Cada dia, os minijogos se escondem atrás de potes,
// portas, baús… A criança abre um, joga, e ele some; ficam só os que ainda estão fechados.
import { el, navegar } from '../ui.js';
import * as db from '../db.js';
import { CAMADAS, EU, lerJogo, calcularTerritorio, donoDe } from '../jogo.js';
import { carregarContexto } from './hoje.js';
import { MINIJOGOS, situacao, PREMIOS_POR_DIA } from '../minijogos/motor.js';
import { hojeISO } from '../datas.js';
import { sons } from '../sons.js';

export const ESCONDERIJOS = [
  { icone: '🏺', nome: 'Pote' }, { icone: '🚪', nome: 'Porta' }, { icone: '🧰', nome: 'Baú' }, { icone: '🎁', nome: 'Presente' },
  { icone: '✉️', nome: 'Envelope' }, { icone: '🛢️', nome: 'Barril' }, { icone: '📦', nome: 'Caixa' }, { icone: '🥚', nome: 'Ovo' },
  { icone: '🗄️', nome: 'Gaveta' }, { icone: '🪣', nome: 'Balde' },
];
const chaveAbertos = data => `minijogos:abertos:${data}`;

/** Sorteio do dia: qual jogo fica atrás de qual esconderijo (o mesmo o dia inteiro). */
export function sorteioDoDia(data, tipos = Object.keys(MINIJOGOS)) {
  let s = [...data].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11) || 1;
  const aleatorio = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const jogos = tipos.map(t => [aleatorio(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const lugares = ESCONDERIJOS.map((e, k) => [aleatorio(), k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return jogos.map((tipo, k) => ({ tipo, esconderijo: ESCONDERIJOS[lugares[k % lugares.length]] }));
}

/** Lugar sugerido: na camada atual, primeiro os que ainda não são meus e têm mais notas no pote. */
export function lugarSugerido(jogo) {
  const lugares = CAMADAS[jogo.camada].territorios.map(t => ({ t, est: calcularTerritorio(jogo, t) }));
  lugares.sort((a, b) => (donoDe(a.est) === EU) - (donoDe(b.est) === EU) || b.est.pote - a.est.pote);
  return lugares[0].t;
}

export async function render(raiz) {
  const jogo = await lerJogo();
  raiz.append(el('h1', {}, '🎁 Sala das surpresas'));
  if (!jogo.heroi) {
    raiz.append(el('p', {}, 'Primeiro escolha o seu animal no Mapa.'), el('button', { class: 'botao grande', onclick: () => navegar('#/mapa') }, '🗺️ Ir para o Mapa'));
    return;
  }
  let reg = null;
  try { ({ reg } = await carregarContexto()); } catch { /* sem conteúdo */ }
  const sit = await situacao(reg);
  if (!sit.liberado) {
    raiz.append(el('section', { class: 'cartao' },
      el('p', {}, '🔒 As surpresas abrem depois que você termina os blocos de lição de hoje.'),
      el('div', { class: 'sala-surpresas trancada' }, ESCONDERIJOS.map(e => el('span', { class: 'esconderijo' }, e.icone))),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Ir para as lições de hoje')));
    return;
  }
  const hoje = hojeISO();
  const abertos = new Set((await db.lerConfig(chaveAbertos(hoje))) || []);
  const sorteio = sorteioDoDia(hoje);
  let lugar = lugarSugerido(jogo);
  const seletor = el('select', { id: 'lugar-jogo', onchange: e => { lugar = CAMADAS[jogo.camada].territorios.find(t => t.id === e.target.value); } },
    CAMADAS[jogo.camada].territorios.map(t => {
      const dono = donoDe(calcularTerritorio(jogo, t));
      return el('option', { value: t.id, selected: t.id === lugar.id }, `${t.icone} ${t.nome}${dono === EU ? ' (já é seu)' : ''}`);
    }));
  const fechados = sorteio.filter(x => !abertos.has(x.tipo));
  raiz.append(
    el('p', { class: 'dica' }, `${fechados.length} surpresa(s) escondida(s) hoje. Abra uma para descobrir o jogo! ${sit.premiosRestantes ? `Ainda ${sit.premiosRestantes === 1 ? 'vale 1 partida' : `valem ${sit.premiosRestantes} partidas`} com notas (de ${PREMIOS_POR_DIA}).` : 'As partidas com notas de hoje acabaram: agora é por diversão e recorde.'}`),
    el('div', { class: 'campo' }, el('label', { for: 'lugar-jogo' }, 'Conquistar notas em:'), seletor));
  if (!fechados.length) {
    raiz.append(el('section', { class: 'cartao' }, el('p', {}, '🎉 Você abriu todas as surpresas de hoje! Amanhã elas se escondem de novo.'),
      el('p', { class: 'dica' }, 'Para jogar de novo hoje, abra um lugar no Mapa: lá tem todos os minijogos.')));
    return;
  }
  raiz.append(el('div', { class: 'sala-surpresas' }, fechados.map(({ tipo, esconderijo }) => el('button', {
    class: 'esconderijo', type: 'button', 'aria-label': `Abrir ${esconderijo.nome}`,
    onclick: async e => {
      const b = e.currentTarget;
      if (b.classList.contains('abrindo')) return;
      b.classList.add('abrindo');
      abertos.add(tipo);
      await db.gravarConfig(chaveAbertos(hoje), [...abertos]);
      sons.compra();
      b.replaceChildren(el('span', { class: 'revelado' }, MINIJOGOS[tipo].icone), el('small', {}, MINIJOGOS[tipo].nome));
      setTimeout(() => navegar(`#/jogo/${tipo}/${lugar.id}`), 900);
    },
  }, el('span', {}, esconderijo.icone), el('small', {}, esconderijo.nome)))));
}
