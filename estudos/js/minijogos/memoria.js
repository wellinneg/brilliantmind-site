// Jogo da memória: cada palavra tem um par, que é o seu significado.
import { el } from '../ui.js';
import { VOCABULARIO } from './vocabulario.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';

export function montarCartas(pares, aleatorio = Math.random) {
  const cartas = pares.flatMap(([palavra, def], k) => [{ par: k, texto: palavra, tipo: 'palavra' }, { par: k, texto: def, tipo: 'definicao' }]);
  return cartas.sort(() => aleatorio() - 0.5);
}

export function iniciar(area, { t, ano, grupo }) {
  const quantos = ['8ano', '9ano'].includes(ano) ? 8 : 6;
  const pares = [...VOCABULARIO[grupo]].sort(() => Math.random() - 0.5).slice(0, quantos);
  const cartas = montarCartas(pares);
  let abertas = [], jogadas = 0, achados = 0, travado = false;
  const visor = el('span', { class: 'cronometro' });
  const contador = el('span', {}, 'Jogadas: 0');
  const botoes = cartas.map((c, k) => el('button', { class: `carta ${c.tipo}`, type: 'button', onclick: () => virar(k) },
    el('span', { class: 'verso' }, '❓'), el('span', { class: 'frente' }, c.texto)));
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, contador, visor),
    el('p', { class: 'dica' }, 'Vire duas cartas: a palavra (em destaque) e o significado dela.'),
    el('div', { class: `cartas cartas-${cartas.length}` }, botoes));
  const relogio = cronometro(visor);

  function virar(k) {
    if (travado || abertas.includes(k) || botoes[k].classList.contains('par-ok')) return;
    botoes[k].classList.add('virada');
    abertas.push(k);
    if (abertas.length < 2) return;
    jogadas++; contador.textContent = `Jogadas: ${jogadas}`;
    const [a, b] = abertas;
    if (cartas[a].par === cartas[b].par && cartas[a].tipo !== cartas[b].tipo) {
      botoes[a].classList.add('par-ok'); botoes[b].classList.add('par-ok');
      abertas = []; achados++; sons.moeda();
      if (achados === pares.length) setTimeout(terminar, 500);
    } else {
      travado = true;
      setTimeout(() => { botoes[a].classList.remove('virada'); botoes[b].classList.remove('virada'); abertas = []; travado = false; }, 900);
    }
  }

  async function terminar() {
    const s = relogio.parar();
    const otimo = jogadas <= pares.length + 4;
    const moedas = otimo ? 15 : (jogadas <= pares.length * 2 ? 12 : 8);
    // recorde: menos jogadas (empate fica com o tempo da 1ª vez)
    const fim = await encerrarPartida({ tipo: 'memoria', t, moedas, recorde: { valor: jogadas, menorMelhor: true } });
    mostrarResultado(area, {
      titulo: '🎉 Memória de elefante!',
      linhas: [`Pares: ${pares.length}`, `Jogadas: ${jogadas}${otimo ? ' (ótimo!)' : ''}`, `Tempo: ${formatarTempo(s)}`],
      fim, t, tipo: 'memoria', jogarDeNovo: () => iniciar(area, { t, ano, grupo }),
    });
  }
}
