// 🗺️ Tabuleiro de conquista (estilo jogo de tabuleiro de estratégia, desenho próprio): a camada é um
// continente dividido em 6 regiões; cada região fica com a cor do dono e o personagem dele em cima.
import { CAMADAS, EU, RIVAL, calcularTerritorio, donoDe } from './jogo.js';
import { imagemDoHeroi } from './herois.js';

const NS = 'http://www.w3.org/2000/svg';
const L = 360, A = 290;

// 6 regiões que se encaixam (as bordas são compartilhadas), na ordem dos territórios da camada.
const REGIOES = [
  [[30, 45], [120, 28], [160, 62], [150, 122], [90, 137], [40, 112]],
  [[120, 28], [220, 22], [250, 57], [230, 112], [150, 122], [160, 62]],
  [[220, 22], [318, 38], [338, 92], [300, 132], [230, 112], [250, 57]],
  [[40, 112], [90, 137], [150, 122], [160, 182], [120, 250], [50, 225], [24, 165]],
  [[150, 122], [230, 112], [250, 172], [222, 250], [120, 250], [160, 182]],
  [[230, 112], [300, 132], [338, 92], [345, 172], [310, 240], [222, 250], [250, 172]],
];
const centro = pts => {
  const n = pts.length;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
};

// cor de cada dono: eu = lima, irmãos = azuis/roxo, Magnata = vermelho, livre = cinza
const CORES_IRMAOS = ['#4F8BFF', '#26C6DA', '#AB47BC', '#FF7043'];
export function corDoDono(jogo, dono) {
  if (dono === EU) return '#B5D60C';
  if (dono === RIVAL.id) return '#C62828';
  if (!dono) return '#607D8B';
  const k = Object.keys(jogo.outros || {}).indexOf(dono);
  return CORES_IRMAOS[(k < 0 ? 0 : k) % CORES_IRMAOS.length];
}

function s(tag, attrs = {}, ...filhos) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const f of filhos.flat()) if (f) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return n;
}

/** Desenha o tabuleiro da camada `k`. `aoTocar(t)` ao tocar numa região (camada liberada). */
export function desenharTabuleiro(jogo, k, aoTocar) {
  const camada = CAMADAS[k];
  const liberada = k <= jogo.camada;
  const svg = s('svg', { viewBox: `0 0 ${L} ${A}`, class: 'tabuleiro-svg', role: 'img', 'aria-label': `Tabuleiro de ${camada.nome}` });
  svg.append(s('defs', {},
    s('radialGradient', { id: 'tab-mar', cx: '50%', cy: '45%', r: '75%' }, s('stop', { offset: '0', 'stop-color': '#1F6FA8' }), s('stop', { offset: '1', 'stop-color': '#0B2E4A' })),
    s('pattern', { id: 'tab-ondas', width: 28, height: 14, patternUnits: 'userSpaceOnUse' },
      s('path', { d: 'M0 10 Q7 4 14 10 T28 10', fill: 'none', stroke: '#8FD3FF', 'stroke-opacity': 0.18, 'stroke-width': 1.2 })),
    s('pattern', { id: 'tab-relevo', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' },
      s('rect', { width: 10, height: 10, fill: 'transparent' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 3 })),
    s('filter', { id: 'tab-sombra', x: '-10%', y: '-10%', width: '120%', height: '130%' }, s('feDropShadow', { dx: 0, dy: 4, stdDeviation: 3, 'flood-color': '#000', 'flood-opacity': 0.55 }))));
  svg.append(s('rect', { width: L, height: A, fill: 'url(#tab-mar)' }), s('rect', { width: L, height: A, fill: 'url(#tab-ondas)' }));
  // rosa dos ventos
  svg.append(s('g', { transform: 'translate(330 262)', opacity: 0.6 },
    s('path', { d: 'M0 -14 L4 0 L0 14 L-4 0 Z', fill: '#FFD54F' }), s('path', { d: 'M-14 0 L0 -4 L14 0 L0 4 Z', fill: '#fff' }),
    s('text', { x: 0, y: -17, 'text-anchor': 'middle', 'font-size': 8, fill: '#fff', 'font-weight': 700 }, 'N')));
  const continente = s('g', { filter: 'url(#tab-sombra)' });
  const pecas = s('g');
  camada.territorios.forEach((t, i) => {
    const pts = REGIOES[i];
    const est = calcularTerritorio(jogo, t);
    const dono = donoDe(est);
    const cor = corDoDono(jogo, dono);
    const d = pts.map((p, n) => `${n ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + ' Z';
    const regiao = s('g', { class: `regiao ${liberada ? 'tocavel' : ''}`, 'data-territorio': t.id });
    regiao.append(s('path', { d, fill: cor, stroke: '#0A191E', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      s('path', { d, fill: 'url(#tab-relevo)' }));
    if (liberada) regiao.addEventListener('click', () => aoTocar?.(t));
    continente.append(regiao);
    // peça do dono + nome do lugar
    const [cx, cy] = centro(pts);
    const g = s('g', { 'pointer-events': 'none' });
    if (dono === EU || (dono && dono !== RIVAL.id)) {
      const heroi = dono === EU ? jogo.heroi : jogo.outros?.[dono]?.heroi;
      g.append(s('ellipse', { cx, cy: cy + 6, rx: 17, ry: 5, fill: '#000', opacity: 0.45 }),
        s('image', { href: imagemDoHeroi(heroi), x: cx - 22, y: cy - 38, width: 44, height: 44, preserveAspectRatio: 'xMidYMax meet' }));
    } else if (dono === RIVAL.id) {
      g.append(s('ellipse', { cx, cy: cy + 6, rx: 14, ry: 4, fill: '#000', opacity: 0.45 }),
        s('text', { x: cx, y: cy + 2, 'text-anchor': 'middle', 'font-size': 30 }, RIVAL.icone));
    }
    g.append(s('text', { x: cx, y: cy + 20, 'text-anchor': 'middle', class: 'nome-regiao' }, `${t.icone} ${t.nome.length > 14 ? t.nome.split(' ')[0] : t.nome}`));
    if (liberada) g.append(s('text', { x: cx, y: cy + 31, 'text-anchor': 'middle', class: 'pote-regiao' }, `pote ${est.pote}`));
    pecas.append(g);
  });
  svg.append(continente, pecas);
  if (!liberada) svg.append(s('rect', { width: L, height: A, fill: '#0A191E', opacity: 0.55 }),
    s('text', { x: L / 2, y: A / 2, 'text-anchor': 'middle', 'font-size': 42 }, '🔒'));
  return svg;
}
