// Heróis originais em pixel (10 × 16). Cada letra é uma cor; '.' é transparente.
import { LOJA } from './jogo.js';

const CORPO = [
  '.CCCCCCCC.',
  'SCCCAACCCS',
  'SCCCAACCCS',
  'S.CCCCCC.S',
  '..CCCCCC..',
  '..PPP.PPP.',
  '..PPP.PPP.',
  '..PP...PP.',
  '.BBB...BBB',
];

const SPRITES = {
  aurora: {
    cabeca: ['...HHHH...', '.HHHHHHHH.', 'HHHHHHHHHH', '..SSSSSS..', '..SESSES..', '..SSSSSS..', '...SMMS...'],
    cores: { H: '#C8A15A', S: '#F2C9A0', E: '#1B1B1B', M: '#C0504D', C: '#3E8E5A', A: '#E9D27A', P: '#8A6A43', B: '#4A3220' },
  },
  cosmo: {
    cabeca: ['..HHHHHH..', '.HHHHHHHH.', '.HVVVVVVH.', '.HVEVVEVH.', '.HVVVVVVH.', '.HHHHHHHH.', '..HHHHHH..'],
    cores: { H: '#EEF3F5', V: '#4FC3F7', E: '#0A191E', S: '#EEF3F5', C: '#E8EEF0', A: '#FF7043', P: '#B0BEC5', B: '#607D8B' },
  },
  sombra: {
    cabeca: ['...HHHH...', '..HHHHHH..', '.HHHHHHHHA', '.HSESSESH.', '.HHHHHHHH.', '.HHHHHHHH.', '..HHHHHH..'],
    cores: { H: '#263238', A: '#E53935', S: '#F2C9A0', E: '#0A191E', C: '#37474F', P: '#263238', B: '#111111' },
  },
  faisca: {
    cabeca: ['.H.HHHH.H.', '.HHHHHHHH.', '.HSSSSSSH.', '.GGGSSGGG.', '..SESSES..', '..SSSSSS..', '...SMMS...'],
    cores: { H: '#FF8A3D', S: '#D9A47E', G: '#CEF010', E: '#1B1B1B', M: '#A0403A', C: '#5C6BC0', A: '#FFD54F', P: '#3949AB', B: '#283593' },
  },
};

function svgDe(linhas, cores) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 10 ${linhas.length}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  linhas.forEach((linha, y) => [...linha].forEach((c, x) => {
    if (c === '.' || !cores[c]) return;
    const r = document.createElementNS(ns, 'rect');
    Object.entries({ x, y, width: 1.02, height: 1.02, fill: cores[c] }).forEach(([k, v]) => r.setAttribute(k, v));
    svg.append(r);
  }));
  return svg;
}

/** Desenha o herói com os itens da loja que estiver usando. */
export function desenharHeroi(heroi, usando = {}, tamanho = 'medio') {
  const s = SPRITES[heroi] || SPRITES.aurora;
  const caixa = document.createElement('div');
  caixa.className = `heroi heroi-${tamanho}`;
  caixa.append(svgDe([...s.cabeca, ...CORPO], s.cores));
  for (const [parte, id] of Object.entries(usando || {})) {
    const item = id && LOJA.find(i => i.id === id);
    if (!item) continue;
    const span = document.createElement('span');
    span.className = `acessorio acessorio-${parte}`;
    span.textContent = item.icone;
    caixa.append(span);
  }
  return caixa;
}
