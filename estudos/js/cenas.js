// Cena de cada lugar do mapa (Supermercado parece supermercado, Shopping parece shopping…).
// Desenho original em SVG, montado com alguns "tipos" de cena + os objetos de cada lugar.
const NS = 'http://www.w3.org/2000/svg';
const L = 360, A = 240;

// tipo de cena, objetos (emojis) e cor de destaque de cada território
export const CENAS = {
  'bairro:supermercado': { tipo: 'mercado', itens: ['🍎', '🥖', '🥛', '🧀', '🍌', '🥫', '🍫', '🧃', '🥚', '🍉'], cor: '#E53935' },
  'bairro:escola': { tipo: 'estante', itens: ['📚', '📘', '📗', '📕', '🔬', '🌍', '✏️', '📐'], cor: '#FB8C00', quadro: 'A + B = C' },
  'bairro:shopping': { tipo: 'shopping', itens: ['👟', '👕', '🎧', '📱', '🍦', '🎮'], cor: '#AB47BC' },
  'bairro:bras': { tipo: 'feira', itens: ['🧵', '👗', '👖', '🧶', '👜', '👚', '🧣', '👒'], cor: '#EC407A' },
  'bairro:empresas': { tipo: 'predio', itens: ['💼', '📊', '🖨️', '📈'], cor: '#42A5F5' },
  'bairro:alphaville': { tipo: 'tech', itens: ['💻', '🤖', '🚀', '📱'], cor: '#00E5FF' },

  'cidade:bolsa': { tipo: 'tech', itens: ['📈', '📉', '💹', '💲'], cor: '#66BB6A' },
  'cidade:museu': { tipo: 'estante', itens: ['🦕', '🔬', '🧪', '🪐', '🦴', '🧬'], cor: '#26A69A', quadro: 'H₂O' },
  'cidade:estudio': { tipo: 'tech', itens: ['🎥', '🎙️', '📺', '💡'], cor: '#FF7043' },
  'cidade:fabricas': { tipo: 'predio', itens: ['🏭', '⚙️', '📦', '🔧'], cor: '#8D6E63' },
  'cidade:forum': { tipo: 'predio', itens: ['⚖️', '📜', '🏛️', '🗂️'], cor: '#FFCA28' },
  'cidade:parque': { tipo: 'tech', itens: ['💡', '🔋', '🤖', '🛰️'], cor: '#CEF010' },

  'estado:financeiro': { tipo: 'predio', itens: ['🏦', '💰', '📈', '💳'], cor: '#43A047' },
  'estado:universidade': { tipo: 'estante', itens: ['🎓', '📚', '🧪', '🔭', '📖'], cor: '#5C6BC0', quadro: 'E = mc²' },
  'estado:festival': { tipo: 'feira', itens: ['🎸', '🎤', '🎪', '🎶', '🥁', '🎹'], cor: '#F06292' },
  'estado:porto': { tipo: 'feira', itens: ['🚢', '📦', '⚓', '🛳️', '🏗️', '📦'], cor: '#29B6F6' },
  'estado:assembleia': { tipo: 'predio', itens: ['🏛️', '📜', '🗳️', '⚖️'], cor: '#FFB300' },
  'estado:espacial': { tipo: 'tech', itens: ['🛰️', '🚀', '🌌', '👨‍🚀'], cor: '#7E57C2' },

  'pais:moeda': { tipo: 'mercado', itens: ['💰', '🪙', '💵', '💎', '🏅', '💳'], cor: '#FDD835' },
  'pais:biblioteca': { tipo: 'estante', itens: ['📚', '📜', '📖', '🗺️', '📕'], cor: '#8D6E63', quadro: 'Brasil' },
  'pais:tv': { tipo: 'tech', itens: ['📺', '🎬', '📡', '🎙️'], cor: '#EF5350' },
  'pais:rodovias': { tipo: 'feira', itens: ['🚚', '📦', '🛣️', '⛽', '🚛', '📦'], cor: '#FFA726' },
  'pais:congresso': { tipo: 'predio', itens: ['🏛️', '🗳️', '📜', '🇧🇷'], cor: '#26C6DA' },
  'pais:aeroespacial': { tipo: 'tech', itens: ['✈️', '🛩️', '🚀', '🛰️'], cor: '#90CAF9' },

  'mundo:wallstreet': { tipo: 'predio', itens: ['🗽', '💹', '💵', '🏦'], cor: '#66BB6A' },
  'mundo:alexandria': { tipo: 'estante', itens: ['📜', '📚', '🏺', '🧭', '🗺️'], cor: '#D4A24C', quadro: 'π ≈ 3,14' },
  'mundo:cinema': { tipo: 'shopping', itens: ['🎬', '🍿', '🎟️', '🎥', '⭐', '🎞️'], cor: '#E91E63' },
  'mundo:seda': { tipo: 'feira', itens: ['🐫', '🧵', '🏺', '🧂', '🫖', '🪔'], cor: '#FF8F00' },
  'mundo:onu': { tipo: 'predio', itens: ['🌐', '🕊️', '🤝', '📜'], cor: '#42A5F5' },
  'mundo:silicio': { tipo: 'tech', itens: ['💻', '🤖', '📱', '🧠'], cor: '#00E676' },
};

function s(tag, attrs = {}, ...filhos) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const f of filhos.flat()) if (f) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return n;
}
const emoji = (x, y, txt, tam = 22) => s('text', { x, y, 'font-size': tam, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, txt);
const item = (c, k) => c.itens[k % c.itens.length];

function piso(cor1, cor2, y0 = 196) {
  const g = s('g');
  g.append(s('rect', { x: 0, y: y0, width: L, height: A - y0, fill: cor1 }));
  for (let x = 0; x < L; x += 24) for (let y = y0, k = 0; y < A; y += 12, k++) {
    if ((x / 24 + k) % 2) g.append(s('rect', { x, y, width: 24, height: 12, fill: cor2 }));
  }
  return g;
}

const TIPOS = {
  // corredor de supermercado: prateleiras cheias, placas de preço e carrinho
  mercado(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#F4F1E8' }));
    g.append(s('rect', { x: 0, y: 0, width: L, height: 30, fill: c.cor }));
    for (let x = 30; x < L; x += 80) g.append(s('rect', { x, y: 6, width: 40, height: 4, rx: 2, fill: '#FFFFFF', opacity: 0.8 }));
    for (const [y, k0] of [[62, 0], [112, 3], [162, 6]]) {
      g.append(s('rect', { x: 14, y: y + 16, width: L - 28, height: 8, fill: '#B0BEC5' }));
      for (let k = 0; k < 9; k++) {
        g.append(emoji(34 + k * 37, y, item(c, k0 + k), 24));
        if (k % 3 === 1) g.append(s('rect', { x: 22 + k * 37, y: y + 26, width: 24, height: 10, fill: '#FFEB3B', stroke: '#F57F17', 'stroke-width': 0.8 }));
      }
    }
    g.append(piso('#E0E0E0', '#CFD8DC'));
    g.append(emoji(300, 205, '🛒', 46));
    return g;
  },
  // estante de biblioteca/escola com lousa
  estante(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#5D4037' }));
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: c.cor, opacity: 0.12 }));
    g.append(s('rect', { x: 120, y: 40, width: 120, height: 70, rx: 4, fill: '#1B5E20', stroke: '#8D6E63', 'stroke-width': 6 }));
    g.append(s('text', { x: 180, y: 80, fill: '#F1F8E9', 'font-size': 18, 'text-anchor': 'middle', 'font-family': 'monospace' }, c.quadro || 'Estude!'));
    for (const lado of [0, 1]) {
      const x0 = lado ? 252 : 8;
      g.append(s('rect', { x: x0, y: 30, width: 100, height: 165, fill: '#795548', stroke: '#4E342E', 'stroke-width': 4 }));
      for (let r = 0; r < 4; r++) {
        g.append(s('rect', { x: x0, y: 68 + r * 40, width: 100, height: 5, fill: '#4E342E' }));
        for (let k = 0; k < 3; k++) g.append(emoji(x0 + 18 + k * 32, 52 + r * 40, item(c, lado * 5 + r + k), 20));
      }
    }
    g.append(piso('#8D6E63', '#795548'));
    g.append(emoji(180, 165, '🪑', 34));
    return g;
  },
  // shopping: 2 andares de vitrines, escada rolante e teto de vidro
  shopping(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#ECEFF1' }));
    for (let x = 0; x < L; x += 45) g.append(s('line', { x1: x, y1: 0, x2: x + 20, y2: 26, stroke: '#90CAF9', 'stroke-width': 2 }));
    g.append(s('rect', { x: 0, y: 0, width: L, height: 26, fill: '#BBDEFB', opacity: 0.5 }));
    const cores = [c.cor, '#26A69A', '#FFA726', '#5C6BC0', '#EC407A', '#66BB6A'];
    for (const [y, k0] of [[34, 0], [118, 3]]) {
      g.append(s('rect', { x: 0, y: y + 72, width: L, height: 8, fill: '#B0BEC5' }));
      for (let k = 0; k < 3; k++) {
        const x = 12 + k * 118;
        g.append(s('rect', { x, y, width: 104, height: 72, fill: '#FFFFFF', stroke: '#90A4AE', 'stroke-width': 2 }));
        for (let f = 0; f < 6; f++) g.append(s('rect', { x: x + f * 17.3, y, width: 17.3, height: 12, fill: f % 2 ? '#FFFFFF' : cores[(k0 + k) % 6] }));
        g.append(s('rect', { x: x + 8, y: y + 18, width: 88, height: 48, fill: '#E3F2FD' }));
        g.append(emoji(x + 52, y + 42, item(c, k0 + k), 30));
      }
    }
    g.append(s('path', { d: 'M150,200 L190,118 L214,118 L174,200 Z', fill: '#9E9E9E', opacity: 0.85 }));
    for (let k = 0; k < 8; k++) g.append(s('line', { x1: 154 + k * 5, y1: 192 - k * 10, x2: 177 + k * 5, y2: 192 - k * 10, stroke: '#616161', 'stroke-width': 1.5 }));
    g.append(piso('#FAFAFA', '#EEEEEE', 204));
    g.append(emoji(300, 214, '🛍️', 30));
    return g;
  },
  // feira de rua: barracas com toldo listrado
  feira(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#81D4FA' }));
    g.append(s('circle', { cx: 320, cy: 30, r: 18, fill: '#FFF176' }));
    g.append(s('rect', { x: 0, y: 70, width: L, height: 40, fill: '#B0BEC5' }));
    for (let x = 0; x < L; x += 30) g.append(s('rect', { x, y: 60 + (x % 4), width: 26, height: 50, fill: '#90A4AE' }));
    const cores = [c.cor, '#43A047', '#1E88E5'];
    for (let k = 0; k < 3; k++) {
      const x = 10 + k * 118;
      g.append(s('rect', { x: x + 4, y: 100, width: 4, height: 96, fill: '#5D4037' }), s('rect', { x: x + 96, y: 100, width: 4, height: 96, fill: '#5D4037' }));
      for (let f = 0; f < 6; f++) g.append(s('path', { d: `M${x + f * 17.3},100 l17.3,0 l0,18 q-8.6,8 -17.3,0 Z`, fill: f % 2 ? '#FFFFFF' : cores[k] }));
      g.append(s('rect', { x, y: 160, width: 104, height: 16, fill: '#A1887F' }));
      for (let f = 0; f < 3; f++) g.append(emoji(x + 20 + f * 32, 146, item(c, k * 3 + f), 24));
    }
    g.append(s('rect', { x: 0, y: 196, width: L, height: A - 196, fill: '#9E9E9E' }));
    for (let x = 0; x < L; x += 40) g.append(s('rect', { x, y: 216, width: 22, height: 4, fill: '#FFFFFF', opacity: 0.6 }));
    return g;
  },
  // prédio de escritórios / órgão público: fachada com janelas acesas
  predio(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#1A2A44' }));
    g.append(s('rect', { x: 0, y: 120, width: L, height: 80, fill: c.cor, opacity: 0.15 }));
    for (const [x, w, h] of [[10, 70, 120], [280, 70, 140]]) {
      g.append(s('rect', { x, y: 196 - h, width: w, height: h, fill: '#263850' }));
      for (let r = 0; r < h / 18 - 1; r++) for (let k = 0; k < 3; k++) {
        g.append(s('rect', { x: x + 8 + k * 21, y: 196 - h + 10 + r * 18, width: 12, height: 9, fill: (r + k) % 3 ? '#FFE082' : '#37474F' }));
      }
    }
    g.append(s('rect', { x: 95, y: 22, width: 170, height: 174, fill: '#37516E', stroke: c.cor, 'stroke-width': 3 }));
    for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) {
      g.append(s('rect', { x: 106 + k * 31, y: 34 + r * 22, width: 22, height: 14, fill: (r * 5 + k) % 4 ? '#B3E5FC' : '#FFE082', opacity: 0.9 }));
    }
    [[1, 1], [3, 2], [2, 4], [4, 0]].forEach(([k, r], n) => g.append(emoji(117 + k * 31, 41 + r * 22, item(c, n), 13)));
    g.append(s('rect', { x: 160, y: 166, width: 40, height: 30, fill: '#0A191E', stroke: c.cor, 'stroke-width': 2 }));
    g.append(s('rect', { x: 0, y: 196, width: L, height: A - 196, fill: '#455A64' }));
    g.append(emoji(70, 214, item(c, 0), 26));
    return g;
  },
  // laboratório / sala de tecnologia com telas brilhando
  tech(c) {
    const g = s('g');
    g.append(s('rect', { x: 0, y: 0, width: L, height: A, fill: '#0B1020' }));
    for (let x = -360; x < 720; x += 40) g.append(s('line', { x1: x, y1: A, x2: 180 + (x - 180) * 0.25, y2: 150, stroke: c.cor, 'stroke-opacity': 0.25 }));
    for (let k = 0; k < 4; k++) g.append(s('line', { x1: 0, y1: 160 + k * k * 6, x2: L, y2: 160 + k * k * 6, stroke: c.cor, 'stroke-opacity': 0.25 }));
    for (let k = 0; k < 3; k++) {
      const x = 22 + k * 110;
      g.append(s('rect', { x, y: 34, width: 96, height: 70, rx: 6, fill: '#101A33', stroke: c.cor, 'stroke-width': 2.5 }));
      g.append(s('rect', { x: x + 6, y: 40, width: 84, height: 58, rx: 3, fill: c.cor, opacity: 0.12 }));
      g.append(emoji(x + 48, 69, item(c, k), 30));
      g.append(s('rect', { x: x + 40, y: 104, width: 16, height: 14, fill: '#37474F' }));
    }
    g.append(s('rect', { x: 20, y: 120, width: 320, height: 12, rx: 3, fill: '#263238', stroke: c.cor, 'stroke-opacity': 0.6 }));
    g.append(emoji(300, 176, item(c, 3), 40));
    return g;
  },
};

/** Desenha a cena do território `t` (com nome na placa). */
export function desenharCena(t) {
  const c = CENAS[t.id] || { tipo: 'predio', itens: [t.icone], cor: '#CEF010' };
  const svg = s('svg', { viewBox: `0 0 ${L} ${A}`, class: 'cena-svg', role: 'img', 'aria-label': `Cena: ${t.nome}` });
  svg.append(TIPOS[c.tipo](c));
  // placa com o nome do lugar
  const largura = Math.min(300, 40 + t.nome.length * 10.5);
  svg.append(s('rect', { x: (L - largura) / 2, y: 4, width: largura, height: 26, rx: 6, fill: '#0A191E', stroke: c.cor, 'stroke-width': 2.5 }));
  svg.append(s('text', { x: L / 2, y: 18, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#FFFFFF', 'font-size': 14, 'font-weight': 800 }, `${t.icone} ${t.nome.toUpperCase()}`));
  return svg;
}
