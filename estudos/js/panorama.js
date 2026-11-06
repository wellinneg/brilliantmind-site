// Vista panorâmica do "Mapa de Conquistas": paisagem vista do alto, com um caminho que passa
// pelas 5 camadas. Verde = já conquistou, herói = onde está agora, azul/roxo = para onde vai.
// Desenho original, feito em SVG no próprio app (sem imagens de fora).
import { el } from './ui.js';
import { CAMADAS, moedasNaCamada, metaDaCamada } from './jogo.js';
import { desenharHeroi } from './herois.js';

const NS = 'http://www.w3.org/2000/svg';
const L = 360, A = 460;            // tamanho do desenho
const HORIZONTE = 150;
const FUGA = { x: 180, y: 70 };    // ponto de fuga da perspectiva

// Paradas do caminho, de baixo (perto) para cima (longe). "e" = escala pela distância.
export const PARADAS = [
  { x: 92, y: 405, e: 1 },
  { x: 250, y: 342, e: 0.88 },
  { x: 118, y: 278, e: 0.76 },
  { x: 245, y: 222, e: 0.64 },
  { x: 172, y: 176, e: 0.54 },
];

function s(tag, attrs = {}, ...filhos) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const f of filhos.flat()) if (f) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return n;
}

/** Caminho suave passando pelos pontos (curva de Catmull-Rom convertida em Bézier). */
export function caminhoSuave(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

function paisagem() {
  const g = s('g');
  // céu de fim de tarde
  g.append(s('rect', { x: 0, y: 0, width: L, height: HORIZONTE + 2, fill: 'url(#pano-ceu)' }));
  g.append(s('circle', { cx: 300, cy: HORIZONTE - 6, r: 26, fill: '#FFD27A', opacity: 0.9 }));
  g.append(s('circle', { cx: 300, cy: HORIZONTE - 6, r: 48, fill: '#FFD27A', opacity: 0.18 }));
  // montanhas no horizonte
  g.append(s('path', { d: `M0,${HORIZONTE} L30,128 L62,140 L98,116 L140,138 L176,122 L214,140 L250,112 L292,136 L330,124 L360,138 L360,${HORIZONTE} Z`, fill: '#3B4F6B', opacity: 0.85 }));
  // chão
  g.append(s('rect', { x: 0, y: HORIZONTE, width: L, height: A - HORIZONTE, fill: 'url(#pano-chao)' }));
  // quadras da cidade em perspectiva (linhas indo para o ponto de fuga)
  const grade = s('g', { stroke: '#9FD3FF', 'stroke-opacity': 0.13, 'stroke-width': 1 });
  for (let x = -520; x <= 880; x += 55) {
    const t = (HORIZONTE - FUGA.y) / (A - FUGA.y);
    grade.append(s('line', { x1: x, y1: A, x2: FUGA.x + (x - FUGA.x) * t, y2: HORIZONTE }));
  }
  for (let k = 1; k <= 12; k++) {
    const y = HORIZONTE + (A - HORIZONTE) * (k / 12) ** 1.8;
    grade.append(s('line', { x1: 0, y1: y, x2: L, y2: y }));
  }
  g.append(grade);
  // manchas de mata
  for (const [cx, cy, rx, ry] of [[40, 200, 46, 14], [320, 270, 52, 18], [30, 330, 40, 20], [330, 420, 60, 26], [200, 168, 30, 7]]) {
    g.append(s('ellipse', { cx, cy, rx, ry, fill: '#2E7D4F', opacity: 0.55 }));
  }
  // rio
  g.append(s('path', { d: 'M360,190 C300,205 330,240 260,262 C190,284 230,320 150,345 C80,367 70,410 0,440', fill: 'none', stroke: '#5EC8FF', 'stroke-width': 9, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }));
  // prediozinhos (luzes da cidade)
  const predios = s('g');
  for (let k = 0; k < 70; k++) {
    const x = (k * 97) % L, y = HORIZONTE + 12 + ((k * 53) % (A - HORIZONTE - 20));
    const e = 0.4 + (y - HORIZONTE) / (A - HORIZONTE);
    predios.append(s('rect', { x, y, width: 5 * e, height: 4 * e, fill: k % 3 ? '#FFE9A8' : '#B9E6FF', opacity: 0.35 }));
  }
  g.append(predios);
  // brilho do horizonte
  g.append(s('rect', { x: 0, y: HORIZONTE - 4, width: L, height: 18, fill: 'url(#pano-brilho)' }));
  // nuvens que passam devagar
  for (const [y, rx, dur, atraso, op] of [[52, 46, 38, 0, 0.55], [92, 34, 52, -20, 0.4], [118, 58, 64, -40, 0.3]]) {
    g.append(s('g', { class: 'nuvem', style: `--dur:${dur}s;--atraso:${atraso}s;opacity:${op}` },
      s('ellipse', { cx: 0, cy: y, rx, ry: rx * 0.28, fill: '#FFFFFF' }),
      s('ellipse', { cx: rx * 0.35, cy: y - rx * 0.16, rx: rx * 0.5, ry: rx * 0.26, fill: '#FFFFFF' })));
  }
  return g;
}

function definicoes() {
  return s('defs', {},
    s('linearGradient', { id: 'pano-ceu', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#1B3A66' }), s('stop', { offset: '0.6', 'stop-color': '#E07A4F' }), s('stop', { offset: '1', 'stop-color': '#FFC46B' })),
    s('linearGradient', { id: 'pano-chao', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#35556B' }), s('stop', { offset: '0.4', 'stop-color': '#1F3B4A' }), s('stop', { offset: '1', 'stop-color': '#0E2230' })),
    s('linearGradient', { id: 'pano-brilho', x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0', 'stop-color': '#FFD27A', 'stop-opacity': 0.5 }), s('stop', { offset: '1', 'stop-color': '#FFD27A', 'stop-opacity': 0 })),
    s('filter', { id: 'pano-luz', x: '-50%', y: '-50%', width: '200%', height: '200%' },
      s('feGaussianBlur', { stdDeviation: 4, result: 'b' }),
      s('feMerge', {}, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))));
}

const COR = { feito: '#43D17A', atual: '#CEF010', futuro: ['#3D7BFF', '#8E5BFF', '#B05BFF', '#C25BFF'] };

function pino(p, cor, icone, estado) {
  const e = p.e;
  const g = s('g', { transform: `translate(${p.x},${p.y}) scale(${e})`, class: `pino pino-${estado}` });
  g.append(s('ellipse', { cx: 0, cy: 2, rx: 16, ry: 6, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.75, 'stroke-width': 2.5 }));
  g.append(s('ellipse', { cx: 0, cy: 2, rx: 24, ry: 9, fill: cor, opacity: 0.18 }));
  g.append(s('path', { d: 'M0,0 C-6,-12 -15,-20 -15,-31 A15,15 0 1 1 15,-31 C15,-20 6,-12 0,0 Z', fill: cor, stroke: '#0A191E', 'stroke-width': 1.5, filter: 'url(#pano-luz)' }));
  g.append(s('circle', { cx: 0, cy: -31, r: 10, fill: '#0A191E', opacity: 0.85 }));
  g.append(s('text', { x: 0, y: -26.5, 'text-anchor': 'middle', 'font-size': 13 }, estado === 'futuro' ? '🔒' : icone));
  return g;
}

function etiqueta(p, lado, cor, titulo, sub) {
  const e = Math.max(0.8, p.e);
  const largura = 128 * e, altura = 34 * e;
  const x = lado === 'esq' ? p.x - 22 * p.e - largura : p.x + 22 * p.e;
  const y = p.y - 46 * p.e;
  const g = s('g', { class: 'etiqueta-pano' });
  g.append(s('line', { x1: p.x + (lado === 'esq' ? -10 : 10) * p.e, y1: p.y - 24 * p.e, x2: lado === 'esq' ? x + largura : x, y2: y + altura / 2, stroke: cor, 'stroke-width': 1.5 }));
  g.append(s('rect', { x, y, width: largura, height: altura, rx: 8 * e, fill: '#0A191E', 'fill-opacity': 0.82, stroke: cor, 'stroke-width': 1.5 }));
  g.append(s('text', { x: x + 8 * e, y: y + 14 * e, fill: '#FFFFFF', 'font-size': 11.5 * e, 'font-weight': 700 }, titulo));
  g.append(s('text', { x: x + 8 * e, y: y + 27 * e, fill: cor, 'font-size': 10 * e, 'font-weight': 700 }, sub));
  return g;
}

/**
 * Desenha o panorama. `jogadores` = [{ id, heroi, usando, camada, apelido, eu }].
 * `aoEscolher(k)` é chamado ao tocar numa camada já liberada; `aoBloqueado(k)`, numa trancada.
 */
export function desenharPanorama(jogo, jogadores, aoEscolher, aoBloqueado) {
  const svg = s('svg', { viewBox: `0 0 ${L} ${A}`, class: 'panorama-svg', role: 'img', 'aria-label': 'Mapa de Conquistas: caminho do Bairro até o Mundo' });
  svg.append(definicoes(), paisagem());

  const atual = jogo.camada;
  const pts = PARADAS;
  // caminho já percorrido (verde, com brilho) e o que falta (azul/roxo tracejado)
  const feito = caminhoSuave(pts.slice(0, atual + 1));
  const falta = caminhoSuave(pts.slice(atual));
  if (falta) {
    svg.append(s('path', { d: falta, fill: 'none', stroke: '#7B6BFF', 'stroke-width': 9, 'stroke-opacity': 0.25, 'stroke-linecap': 'round' }));
    svg.append(s('path', { d: falta, fill: 'none', stroke: '#8EA8FF', 'stroke-width': 3.5, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round', class: 'caminho-futuro' }));
  }
  if (feito) {
    // pathLength=1: o caminho "se desenha" ao abrir o mapa (animação no CSS)
    svg.append(s('path', { d: feito, fill: 'none', stroke: '#43D17A', 'stroke-width': 12, 'stroke-opacity': 0.3, 'stroke-linecap': 'round', filter: 'url(#pano-luz)', pathLength: 1, class: 'caminho-feito' }));
    svg.append(s('path', { d: feito, fill: 'none', stroke: '#B8FF8A', 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 1, class: 'caminho-feito' }));
  }

  // títulos das duas partes da jornada
  svg.append(s('text', { x: 14, y: 448, class: 'pano-rotulo', fill: '#7DFFB0' }, 'Já conquistei'));
  svg.append(s('text', { x: 14, y: 178, class: 'pano-rotulo', fill: '#A9B8FF' }, 'Para onde vou'));

  // pinos e etiquetas, do mais longe para o mais perto (o de perto fica por cima)
  [...CAMADAS.keys()].reverse().forEach(k => {
    const c = CAMADAS[k], p = pts[k];
    const estado = k < atual ? 'feito' : (k === atual ? 'atual' : 'futuro');
    const cor = estado === 'feito' ? COR.feito : (estado === 'atual' ? COR.atual : COR.futuro[k - atual - 1] || '#B05BFF');
    const sub = estado === 'feito' ? '✓ conquistado'
      : (estado === 'atual' ? (k === CAMADAS.length - 1 ? `${moedasNaCamada(jogo, k)} notas` : `${moedasNaCamada(jogo, k)}/${metaDaCamada(k)} notas`) : 'a conquistar');
    const grupo = s('g', { class: 'parada tocavel', style: `--atraso:${0.25 + k * 0.18}s` }); // pinos caem um por um
    grupo.append(etiqueta(p, k % 2 === 0 ? 'dir' : 'esq', cor, `${c.icone} ${c.nome}`, sub), pino(p, cor, c.icone, estado));
    grupo.addEventListener('click', () => (estado === 'futuro' ? aoBloqueado?.(k) : aoEscolher?.(k)));
    svg.append(grupo);
  });

  // heróis em cima das paradas (o meu maior; os irmãos menores, ao lado)
  const caixa = el('div', { class: 'panorama' }, el('h2', { class: 'panorama-titulo' }, 'Mapa de Conquistas'), svg);
  const porCamada = {};
  for (const j of jogadores) (porCamada[j.camada || 0] ||= []).push(j);
  for (const [k, lista] of Object.entries(porCamada)) {
    const p = pts[k]; if (!p) continue;
    lista.sort((a, b) => (b.eu ? 1 : 0) - (a.eu ? 1 : 0)).forEach((j, n) => {
      const h = desenharHeroi(j.heroi, j.usando, 'pequeno');
      h.classList.add('heroi-no-mapa', j.eu ? 'eu' : 'irmao');
      const lado = Number(k) % 2 === 0 ? -1 : 1; // do lado contrário ao da etiqueta
      const dx = lado * (36 + 30 * n);           // ao lado do pino, em pé no anel
      h.style.left = `${((p.x + dx * p.e) / L) * 100}%`;
      h.style.top = `${((p.y + 4 * p.e) / A) * 100}%`;
      h.title = j.apelido || '';
      caixa.append(h);
      if (!j.eu) caixa.append(el('span', { class: 'nome-no-mapa', style: `left:${((p.x + dx * p.e) / L) * 100}%;top:${((p.y + 8 * p.e) / A) * 100}%` }, j.apelido || ''));
    });
  }
  return caixa;
}
