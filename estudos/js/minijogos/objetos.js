// Caça-objetos: o lugar está bagunçado; ache os objetos da lista. Toque errado = +3 segundos.
import { el } from '../ui.js';
import { CENAS, desenharCena } from '../cenas.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const BAGUNCA = ['🔑', '🧦', '📎', '🧸', '⚽', '🎈', '🕶️', '🪀', '🧩', '🔦', '🧲', '✂️', '🪥', '🧢', '🎒', '📌', '🖍️', '🥄', '🧤', '⏰', '📷', '🎲', '🪁', '🔔', '🍕', '🧃', '🎧', '📚'];
const MULTA = 3;

/** Sorteia os alvos e a bagunça (cada alvo aparece uma vez só). */
export function montarBagunca(itensDoLugar, quantosAlvos, total, aleatorio = Math.random) {
  const mistura = a => [...a].sort(() => aleatorio() - 0.5);
  const pool = [...new Set([...itensDoLugar, ...BAGUNCA])];
  const alvos = mistura(pool).slice(0, quantosAlvos);
  const resto = pool.filter(x => !alvos.includes(x));
  const distracoes = Array.from({ length: total - quantosAlvos }, (_, k) => resto[(k + Math.floor(aleatorio() * resto.length)) % resto.length]);
  return { alvos, pecas: mistura([...alvos.map(e => ({ e, alvo: true })), ...distracoes.map(e => ({ e, alvo: false }))]) };
}

export function iniciar(area, { t, ano }) {
  const dificil = ['8ano', '9ano'].includes(ano);
  const COLS = 6, LINHAS = 8;
  const { alvos, pecas } = montarBagunca(CENAS[t.id]?.itens || [t.icone], dificil ? 6 : 5, COLS * LINHAS);
  const faltam = new Set(alvos);
  let erros = 0;
  const visor = el('span', { class: 'cronometro' });
  const lista = el('div', { class: 'alvos' }, alvos.map(a => el('span', { class: 'alvo', 'data-e': a }, a)));
  const fundo = desenharCena(t);
  fundo.setAttribute('preserveAspectRatio', 'xMidYMid slice'); // a cena cobre o quadro todo
  const cena = el('div', { class: 'bagunca' }, el('div', { class: 'fundo-bagunca' }, fundo));
  pecas.forEach((p, k) => {
    const col = k % COLS, lin = Math.floor(k / COLS);
    const x = (col + 0.15 + Math.random() * 0.7) / COLS * 100;
    const y = (lin + 0.15 + Math.random() * 0.7) / LINHAS * 100;
    const tam = (dificil ? 22 : 26) + Math.random() * 12;
    const b = el('button', {
      class: 'peca', type: 'button',
      style: `left:${x}%;top:${y}%;font-size:${tam}px;transform:translate(-50%,-50%) rotate(${Math.round(Math.random() * 80 - 40)}deg)`,
      onclick: () => tocar(p, b),
    }, p.e);
    cena.append(b);
  });
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, el('strong', {}, '🔎 Ache:'), visor),
    lista, cena,
    el('p', { class: 'dica' }, `Toque errado custa +${MULTA} segundos.`),
    el('button', { class: 'link', onclick: () => terminar(true) }, 'Desistir'));
  const relogio = cronometro(visor);

  function tocar(p, b) {
    if (p.alvo && faltam.has(p.e)) {
      faltam.delete(p.e);
      b.classList.add('achou'); b.disabled = true;
      const marca = lista.querySelector(`[data-e="${p.e}"]`);
      marca?.classList.add('ok'); pop(marca);
      sons.moeda();
      if (!faltam.size) terminar(false);
    } else {
      erros++; relogio.multa(MULTA); sons.erro(); pop(b, 'tremer');
    }
  }

  async function terminar(desistiu) {
    const s = relogio.parar();
    const completo = !desistiu;
    const rapido = s <= (dificil ? 75 : 60);
    const moedas = completo ? (erros === 0 && rapido ? 15 : (rapido || erros <= 2 ? 12 : 8)) : 0;
    const fim = await encerrarPartida({ tipo: 'objetos', t, moedas, recorde: completo ? { valor: s, menorMelhor: true } : null });
    mostrarResultado(area, {
      titulo: completo ? '🎉 Achou tudo!' : 'Fica para a próxima!',
      linhas: [`Objetos: ${alvos.length - faltam.size} de ${alvos.length}`, `Tempo (com multas): ${formatarTempo(s)}`, `Toques errados: ${erros}`],
      fim, t, tipo: 'objetos', jogarDeNovo: () => iniciar(area, { t, ano }),
    });
  }
}
