// Aba "Jogos" (#/jogos): os minijogos a um toque, valendo no lugar que mais precisa ser conquistado.
import { el, navegar } from '../ui.js';
import { CAMADAS, EU, lerJogo, calcularTerritorio, donoDe } from '../jogo.js';
import { carregarContexto } from './hoje.js';
import { MINIJOGOS, situacao, PREMIOS_POR_DIA } from '../minijogos/motor.js';

/** Lugar sugerido: na camada atual, primeiro os que ainda não são meus e têm mais notas no pote. */
export function lugarSugerido(jogo) {
  const lugares = CAMADAS[jogo.camada].territorios.map(t => ({ t, est: calcularTerritorio(jogo, t) }));
  lugares.sort((a, b) => (donoDe(a.est) === EU) - (donoDe(b.est) === EU) || b.est.pote - a.est.pote);
  return lugares[0].t;
}

export async function render(raiz) {
  const jogo = await lerJogo();
  raiz.append(el('h1', {}, '🎮 Minijogos'));
  if (!jogo.heroi) {
    raiz.append(el('p', {}, 'Primeiro escolha o seu animal no Mapa.'), el('button', { class: 'botao grande', onclick: () => navegar('#/mapa') }, '🗺️ Ir para o Mapa'));
    return;
  }
  let reg = null;
  try { ({ reg } = await carregarContexto()); } catch { /* sem conteúdo */ }
  const sit = await situacao(reg);
  if (!sit.liberado) {
    raiz.append(el('section', { class: 'cartao' },
      el('p', {}, '🔒 Os minijogos liberam depois que você termina os blocos de lição de hoje.'),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Ir para as lições de hoje')));
    return;
  }
  let lugar = lugarSugerido(jogo);
  const seletor = el('select', { id: 'lugar-jogo', onchange: e => { lugar = CAMADAS[jogo.camada].territorios.find(t => t.id === e.target.value); } },
    CAMADAS[jogo.camada].territorios.map(t => {
      const dono = donoDe(calcularTerritorio(jogo, t));
      return el('option', { value: t.id, selected: t.id === lugar.id }, `${t.icone} ${t.nome}${dono === EU ? ' (já é seu)' : ''}`);
    }));
  raiz.append(
    el('p', { class: 'dica' }, sit.premiosRestantes
      ? `Hoje ${sit.premiosRestantes === 1 ? 'vale 1 partida' : `valem ${sit.premiosRestantes} partidas`} com notas (de ${PREMIOS_POR_DIA}).`
      : 'As partidas com notas de hoje acabaram: agora é por diversão e recorde.'),
    el('div', { class: 'campo' }, el('label', { for: 'lugar-jogo' }, 'Conquistar notas em:'), seletor),
    el('div', { class: 'grade-minijogos grande' }, Object.entries(MINIJOGOS).map(([tipo, m]) => el('button', {
      class: 'minijogo', type: 'button',
      onclick: () => navegar(`#/jogo/${tipo}/${lugar.id}`),
    }, el('span', { class: 'icone-minijogo' }, m.icone), el('strong', {}, m.nome), el('small', {}, m.desc)))));
}
