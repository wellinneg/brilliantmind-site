// Caça-palavras com cronômetro: toque na primeira e na última letra da palavra.
import { el } from '../ui.js';
import { VOCABULARIO, semAcento } from './vocabulario.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const DIR_FACEIS = [[0, 1], [1, 0], [1, 1]];                          // →, ↓, ↘
const DIR_TODAS = [...DIR_FACEIS, [0, -1], [-1, 0], [-1, -1], [-1, 1], [1, -1]];
const LETRAS = 'ABCDEFGHIJLMNOPQRSTUVXZ';

export function configDoAno(ano) {
  return ['8ano', '9ano'].includes(ano) ? { tamanho: 11, direcoes: DIR_TODAS, quantas: 7, bonusAte: 180 } : { tamanho: 9, direcoes: DIR_FACEIS, quantas: 6, bonusAte: 150 };
}

/** Monta a grade com as palavras (sem acento) escondidas. Devolve null se não couber. */
export function gerarGrade(palavras, tamanho, direcoes, aleatorio = Math.random) {
  const grade = Array.from({ length: tamanho }, () => Array(tamanho).fill(null));
  const posicoes = [];
  const sorteio = n => Math.floor(aleatorio() * n);
  for (const original of [...palavras].sort((a, b) => b.length - a.length)) {
    const p = semAcento(original);
    let colocou = false;
    for (let tentativa = 0; tentativa < 300 && !colocou; tentativa++) {
      const [dr, dc] = direcoes[sorteio(direcoes.length)];
      const r0 = sorteio(tamanho), c0 = sorteio(tamanho);
      const celulas = [...p].map((_, k) => [r0 + dr * k, c0 + dc * k]);
      if (celulas.some(([r, c]) => r < 0 || c < 0 || r >= tamanho || c >= tamanho)) continue;
      if (celulas.some(([r, c], k) => grade[r][c] && grade[r][c] !== p[k])) continue;
      celulas.forEach(([r, c], k) => { grade[r][c] = p[k]; });
      posicoes.push({ palavra: original, celulas });
      colocou = true;
    }
    if (!colocou) return null;
  }
  for (const linha of grade) for (let c = 0; c < tamanho; c++) if (!linha[c]) linha[c] = LETRAS[sorteio(LETRAS.length)];
  return { grade, posicoes };
}

/** A linha reta entre duas casas (ou null se não for reta). */
export function linhaEntre([r1, c1], [r2, c2]) {
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  const passos = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  if (!(r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return null;
  return Array.from({ length: passos + 1 }, (_, k) => [r1 + dr * k, c1 + dc * k]);
}

const igualCelulas = (a, b) => a.length === b.length && (a.every(([r, c], k) => r === b[k][0] && c === b[k][1])
  || a.every(([r, c], k) => r === b[b.length - 1 - k][0] && c === b[b.length - 1 - k][1]));

export function iniciar(area, { t, ano, grupo }) {
  const cfg = configDoAno(ano);
  const candidatas = VOCABULARIO[grupo].map(([p]) => p).filter(p => semAcento(p).length <= cfg.tamanho);
  let montada = null;
  while (!montada) {
    const escolhidas = [...candidatas].sort(() => Math.random() - 0.5).slice(0, cfg.quantas);
    montada = gerarGrade(escolhidas, cfg.tamanho, cfg.direcoes);
  }
  const { grade, posicoes } = montada;
  const achadas = new Set();
  const visor = el('span', { class: 'cronometro' });
  const lista = el('ul', { class: 'lista-palavras' }, posicoes.map(p => el('li', { 'data-p': p.palavra }, p.palavra)));
  let inicio = null;
  const botoes = grade.map((linha, r) => linha.map((letra, c) => el('button', {
    class: 'letra', type: 'button',
    onclick: () => tocar([r, c]),
  }, letra)));
  const tabuleiro = el('div', { class: 'grade-palavras', style: `grid-template-columns:repeat(${cfg.tamanho},1fr)` }, botoes.flat());
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, el('strong', {}, `🔤 ${posicoes.length} palavras`), visor),
    el('p', { class: 'dica' }, cfg.direcoes.length > 3 ? 'Toque na primeira e na última letra. Tem palavra de trás para frente e na diagonal!' : 'Toque na primeira e na última letra da palavra (→, ↓ ou na diagonal).'),
    tabuleiro, lista,
    el('button', { class: 'link', onclick: () => terminar(true) }, 'Desistir'));
  const relogio = cronometro(visor);
  let cor = 0;

  function tocar(casa) {
    const b = botoes[casa[0]][casa[1]];
    if (!inicio) { inicio = casa; b.classList.add('marcada'); return; }
    botoes[inicio[0]][inicio[1]].classList.remove('marcada');
    const linha = linhaEntre(inicio, casa);
    inicio = null;
    const achou = linha && posicoes.find(p => !achadas.has(p.palavra) && igualCelulas(p.celulas, linha));
    if (!achou) { sons.erro(); pop(tabuleiro, 'tremer'); return; }
    achadas.add(achou.palavra);
    cor = (cor + 1) % 6;
    achou.celulas.forEach(([r, c]) => { botoes[r][c].classList.add('achada', `cor-${cor}`); pop(botoes[r][c]); });
    lista.querySelector(`[data-p="${achou.palavra}"]`)?.classList.add('riscada');
    sons.moeda();
    if (achadas.size === posicoes.length) terminar(false);
  }

  async function terminar(desistiu) {
    const s = relogio.parar();
    const completo = !desistiu;
    const moedas = completo ? (s <= cfg.bonusAte ? 15 : 10) : 0;
    const fim = await encerrarPartida({ tipo: 'palavras', t, moedas, recorde: completo ? { valor: s, menorMelhor: true } : null });
    mostrarResultado(area, {
      titulo: completo ? '🎉 Achou todas!' : 'Fica para a próxima!',
      linhas: [`Palavras: ${achadas.size} de ${posicoes.length}`, `Tempo: ${formatarTempo(s)}`,
        completo && s <= cfg.bonusAte ? `⚡ Rápido! Abaixo de ${formatarTempo(cfg.bonusAte)} vale +5.` : null].filter(Boolean),
      fim, t, tipo: 'palavras', jogarDeNovo: () => iniciar(area, { t, ano, grupo }),
    });
  }
}
