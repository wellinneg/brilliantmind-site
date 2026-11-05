// Heróis originais em pixel (10 × 16). Cada letra é uma cor; '.' é transparente.
// "acessorios" diz onde chapéu e óculos ficam em cada desenho (em % da altura/largura).
import { LOJA } from './jogo.js';

const SPRITES = {
  dino: {
    desenho: [
      '.....S.S..',
      '....GGGGG.',
      '...GGGEGGG',
      '...GGGGGGG',
      '...GGGMWMW',
      '...GGGGGG.',
      '...GGG....',
      'S..GGGGG..',
      'GS.GGBGGG.',
      '.GGGGBBG..',
      '.GGGGBBG..',
      '..GGGGGG..',
      '..GGGGGG..',
      '..GG..GG..',
      '..GG..GG..',
      '.GGG..GGG.',
    ],
    cores: { G: '#43A047', S: '#FF8F00', E: '#111111', M: '#5D1A1A', W: '#FFFFFF', B: '#C5E1A5' },
    acessorios: { cabeca: { top: '-22%', left: '68%' }, rosto: { top: '6%', left: '66%' } },
  },
  super: {
    desenho: [
      '..HHHHHH..',
      '.HHHHHHHH.',
      '.HSSSSSSH.',
      '.MMWMMWMM.',
      '..SSSSSS..',
      '...SmmS...',
      '.CUUUUUUC.',
      'SCUUYYUUCS',
      'SCUYYUUUCS',
      'SCUUYYUUCS',
      '.CUUUYUUC.',
      '.CUUUUUUC.',
      '.CUUU.UUC.',
      '..UUU.UUU.',
      '..BBB.BBB.',
      '.BBB..BBB.',
    ],
    cores: { H: '#212121', S: '#E0A47A', M: '#111111', W: '#FFFFFF', m: '#8E3B2E', C: '#D32F2F', U: '#1E63D6', Y: '#FFD600', B: '#D32F2F' },
    acessorios: { cabeca: { top: '-26%' }, rosto: { top: '10%' } },
  },
  carro: {
    desenho: [
      '..........',
      '..........',
      '..........',
      '..........',
      '...RRRR...',
      '..RKKKKR..',
      '..RKEKER..',
      '..RKKKKR..',
      '.RRRRRRRR.',
      'RRRRRRRRRR',
      'RWWWWWWWRY',
      'RRRRRRRRRR',
      'RRRRRRRRRR',
      '.TTT..TTT.',
      '.TGT..TGT.',
      '.TTT..TTT.',
    ],
    cores: { R: '#E53935', K: '#B3E5FC', E: '#0A191E', W: '#FFFFFF', Y: '#FFEB3B', T: '#212121', G: '#9E9E9E' },
    acessorios: { cabeca: { top: '0%' }, rosto: { top: '30%' } },
  },
  alien: {
    desenho: [
      '.A......A.',
      '..L....L..',
      '..LGGGGL..',
      '.GGGGGGGG.',
      'GGWEGGWEGG',
      'GGEEGGEEGG',
      '.GGGGGGGG.',
      '..GGMMGG..',
      '...GGGG...',
      '.CCCCCCCC.',
      'GCCCYYCCCG',
      'GCCCYYCCCG',
      '.CCCCCCCC.',
      '..CC..CC..',
      '..GG..GG..',
      '.GGG..GGG.',
    ],
    cores: { A: '#FFEB3B', L: '#2E7D32', G: '#7CD957', W: '#FFFFFF', E: '#111111', M: '#2E5D1F', C: '#7E57C2', Y: '#CEF010' },
    acessorios: { cabeca: { top: '-12%' }, rosto: { top: '18%' } },
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

export const desenhosDosHerois = SPRITES; // usado nos testes (tamanho dos desenhos)

/** Desenha o herói com os itens da loja que estiver usando. */
export function desenharHeroi(heroi, usando = {}, tamanho = 'medio') {
  const s = SPRITES[heroi] || SPRITES.dino;
  const caixa = document.createElement('div');
  caixa.className = `heroi heroi-${tamanho}`;
  caixa.append(svgDe(s.desenho, s.cores));
  for (const [parte, id] of Object.entries(usando || {})) {
    const item = id && LOJA.find(i => i.id === id);
    if (!item) continue;
    const span = document.createElement('span');
    span.className = `acessorio acessorio-${parte}`;
    span.textContent = item.icone;
    Object.assign(span.style, s.acessorios?.[parte] || {});
    caixa.append(span);
  }
  return caixa;
}
