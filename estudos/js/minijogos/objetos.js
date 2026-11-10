// Caça-objetos: o lugar está bagunçado; ache os objetos da lista. Toque errado = +3 segundos.
import { el } from '../ui.js';
import { CENAS, desenharCena } from '../cenas.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const BAGUNCA = ['🔑', '🧦', '📎', '🧸', '⚽', '🎈', '🕶️', '🪀', '🧩', '🔦', '🧲', '✂️', '🪥', '🧢', '🎒', '📌', '🖍️', '🥄', '🧤', '⏰', '📷', '🎲', '🪁', '🔔', '🍕', '🧃', '🎧', '📚'];
// Objetos que se parecem: no nível Extremo, o "gêmeo" de cada alvo aparece na bagunça para confundir.
export const PARECIDOS = { '🔑': '🗝️', '🧦': '🧤', '⚽': '🏀', '🎈': '🎀', '🕶️': '👓', '🧩': '🎲', '🔦': '🕯️', '📌': '📍', '🖍️': '✏️',
  '⏰': '⌚', '📷': '📸', '🔔': '🛎️', '🍕': '🥪', '🎧': '📻', '📚': '📖', '🧢': '👒', '🥄': '🍴', '✂️': '📏', '🧸': '🐻', '🧃': '🥤',
  '🎲': '🧊', '🪁': '🎏', '🧲': '🪝', '🪥': '🖌️', '🎒': '👜', '📎': '🖇️', '🧤': '🧦', '🪀': '🎯' };
export const NIVEIS_OBJETOS = {
  facil: { nome: 'Fácil', icone: '🍼', alvos: 5, cols: 6, linhas: 8, tam: [26, 12], giro: 40, multa: 3, rapido: 60, bonus: 1, fundo: 0.55 },
  medio: { nome: 'Médio', icone: '🙂', alvos: 6, cols: 7, linhas: 10, tam: [21, 9], giro: 70, multa: 3, rapido: 80, bonus: 1.2, fundo: 0.65 },
  dificil: { nome: 'Difícil', icone: '💪', alvos: 8, cols: 10, linhas: 10, tam: [17, 7], giro: 120, multa: 4, rapido: 110, bonus: 1.5, fundo: 0.75 },
  extremo: { nome: 'Extremo', icone: '🔥', alvos: 10, cols: 12, linhas: 16, tam: [12, 6], giro: 180, multa: 5, rapido: 180, bonus: 2, fundo: 1, parecidos: true, verdes: true },
};

/** Sorteia os alvos e a bagunça (cada alvo aparece uma vez só). Com `parecidos`, os gêmeos dos alvos entram como distração. */
export function montarBagunca(itensDoLugar, quantosAlvos, total, aleatorio = Math.random, { parecidos = false } = {}) {
  const mistura = a => [...a].sort(() => aleatorio() - 0.5);
  const gemeos = new Set(Object.values(PARECIDOS));
  const pool = [...new Set([...itensDoLugar, ...BAGUNCA])].filter(x => !parecidos || !gemeos.has(x) || itensDoLugar.includes(x));
  const alvos = mistura(pool).slice(0, quantosAlvos);
  let resto = pool.filter(x => !alvos.includes(x));
  if (parecidos) {   // cada alvo ganha 3 gêmeos espalhados (quando existe um parecido)
    const extras = alvos.flatMap(a => (PARECIDOS[a] && !alvos.includes(PARECIDOS[a]) ? [PARECIDOS[a], PARECIDOS[a], PARECIDOS[a]] : []));
    resto = [...extras, ...extras, ...resto];
  }
  const distracoes = Array.from({ length: total - quantosAlvos }, (_, k) => resto[(k + Math.floor(aleatorio() * resto.length)) % resto.length]);
  return { alvos, pecas: mistura([...alvos.map(e => ({ e, alvo: true })), ...distracoes.map(e => ({ e, alvo: false }))]) };
}

export function iniciar(area, { t, ano, nivel }) {
  if (!NIVEIS_OBJETOS[nivel]) return escolherNivel(area, { t, ano });
  const N = NIVEIS_OBJETOS[nivel];
  const COLS = N.cols, LINHAS = N.linhas, MULTA = N.multa;
  const { alvos, pecas } = montarBagunca(CENAS[t.id]?.itens || [t.icone], N.alvos, COLS * LINHAS, Math.random, { parecidos: !!N.parecidos });
  const faltam = new Set(alvos);
  let erros = 0;
  const visor = el('span', { class: 'cronometro' });
  const lista = el('div', { class: 'alvos' }, alvos.map(a => el('span', { class: 'alvo', 'data-e': a }, a)));
  const fundo = desenharCena(t);
  fundo.setAttribute('preserveAspectRatio', 'xMidYMid slice'); // a cena cobre o quadro todo
  const cena = el('div', { class: `bagunca nivel-${nivel}` }, el('div', { class: 'fundo-bagunca', style: `opacity:${N.fundo}` }, fundo));
  if (N.verdes) {
    // 🔥 Extremo: cenário colorido cheio de confete (não dá para tocar) e todos os objetos pintados de verde
    const CORES = ['#E53935', '#FDD835', '#1E88E5', '#8E24AA', '#FB8C00', '#00ACC1', '#43A047', '#D81B60', '#7CB342', '#F4511E'];
    for (let k = 0; k < 260; k++) {
      const tamanho = 4 + Math.random() * 12;
      cena.append(el('span', { class: 'confete-bagunca', 'aria-hidden': 'true', style: `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${tamanho}px;height:${tamanho * (0.4 + Math.random())}px;background:${CORES[k % CORES.length]};border-radius:${Math.random() < 0.5 ? '50%' : '2px'};transform:rotate(${Math.round(Math.random() * 360)}deg)` }));
    }
  }
  pecas.forEach((p, k) => {
    const col = k % COLS, lin = Math.floor(k / COLS);
    const solto = N.parecidos ? 1.1 : 0.7;            // no Extremo as peças invadem as vizinhas
    const x = (col + (1 - solto) / 2 + Math.random() * solto) / COLS * 100;
    const y = (lin + (1 - solto) / 2 + Math.random() * solto) / LINHAS * 100;
    const tam = N.tam[0] + Math.random() * N.tam[1];
    const b = el('button', {
      class: 'peca', type: 'button',
      style: `left:${x}%;top:${y}%;font-size:${tam}px;transform:translate(-50%,-50%) rotate(${Math.round(Math.random() * N.giro * 2 - N.giro)}deg)`,
      onclick: () => tocar(p, b),
    }, p.e);
    cena.append(b);
  });
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, el('strong', {}, `${N.icone} Ache:`), visor),
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
    const rapido = s <= N.rapido;
    const moedas = completo ? Math.round((erros === 0 && rapido ? 15 : (rapido || erros <= 2 ? 12 : 8)) * N.bonus) : 0;
    const fim = await encerrarPartida({ tipo: 'objetos', t, moedas, recorde: completo ? { valor: s, menorMelhor: true } : null });
    mostrarResultado(area, {
      titulo: completo ? '🎉 Achou tudo!' : 'Fica para a próxima!',
      linhas: [`Nível: ${N.icone} ${N.nome}`, `Objetos: ${alvos.length - faltam.size} de ${alvos.length}`, `Tempo (com multas): ${formatarTempo(s)}`, `Toques errados: ${erros}`],
      fim, t, tipo: 'objetos', jogarDeNovo: () => iniciar(area, { t, ano }),
    });
  }
}

/** Antes de começar: escolher o nível (o Extremo tem objetos parecidos de propósito). */
function escolherNivel(area, { t, ano }) {
  area.replaceChildren(
    el('p', {}, 'Escolha o nível da bagunça:'),
    el('div', { class: 'niveis-cofre' }, Object.entries(NIVEIS_OBJETOS).map(([id, n]) => el('button', { class: 'botao secundario grande', type: 'button', onclick: () => { sons.moeda(); iniciar(area, { t, ano, nivel: id }); } },
      `${n.icone} ${n.nome}`, el('small', {}, `${n.alvos} objetos para achar · ${n.cols * n.linhas} peças${n.parecidos ? ' · objetos parecidos para confundir' : ''}${n.verdes ? ' · tudo verde num cenário colorido' : ''}`)))));
}
