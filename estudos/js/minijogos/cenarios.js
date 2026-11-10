// 🎨 Cenários desenhados por código para o Caça-objetos (arte própria da Trilha): cidade, praia, parque,
// feira, festa e escola, bem cheios de detalhes (casas, árvores, pessoas, carros, barracas…).
// Tudo sorteado com o `aleatorio` recebido: com a mesma semente, o desenho sai igual (duelo).
const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...filhos) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const f of filhos.flat()) if (f) n.append(f);
  return n;
}

export const TEMAS = {
  cidade: { nome: 'Praça da Vila', icone: '🏘️' },
  praia: { nome: 'Praia Cheia', icone: '🏖️' },
  parque: { nome: 'Parque da Cidade', icone: '🌳' },
  feira: { nome: 'Feira de Domingo', icone: '🧺' },
  festa: { nome: 'Festa na Rua', icone: '🎪' },
  escola: { nome: 'Pátio da Escola', icone: '🏫' },
  fabrica: { nome: 'Fábrica em Produção', icone: '🏭', movimento: true },
  trem: { nome: 'Ferrovia', icone: '🚆', movimento: true },
  rodovia: { nome: 'Rodovia Movimentada', icone: '🛣️', movimento: true },
};

const PELES = ['#F5D0B0', '#E8B48A', '#C68642', '#8D5524', '#FFDBAC', '#A0673A'];
const ROUPAS = ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#FB8C00', '#00ACC1', '#D81B60', '#5E35B1', '#6D4C41', '#F06292', '#26A69A'];
const PASTEIS = ['#F8BBD0', '#B3E5FC', '#C8E6C9', '#FFF9C4', '#D1C4E9', '#FFE0B2', '#B2DFDB', '#F0F4C3', '#FFCCBC', '#CFD8DC'];
const TELHADOS = ['#C62828', '#1565C0', '#6A1B9A', '#2E7D32', '#EF6C00', '#4E342E', '#00838F', '#AD1457'];

/** Desenha o cenário `tema` num SVG de W×H. */
export function desenharCenario(tema, aleatorio, W = 1560, H = 1000) {
  const r = (a, b) => a + aleatorio() * (b - a);
  const um = lista => lista[Math.floor(aleatorio() * lista.length)];
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'cenario-svg', 'aria-hidden': 'true' });
  const fundo = s('g'), chao = s('g'), coisas = [];   // coisas: [y, elemento] para desenhar de trás para frente
  const por = (y, el) => coisas.push([y, el]);

  // ---------- peças de desenho ----------
  const pessoa = (x, y, k = 1) => {
    const pele = um(PELES), roupa = um(ROUPAS), calca = um(['#37474F', '#1A237E', '#4E342E', '#263238', '#5D4037', roupa]);
    const g = s('g', { transform: `translate(${x} ${y}) scale(${k})` },
      s('ellipse', { cx: 0, cy: 2, rx: 7, ry: 2.5, fill: '#000', opacity: 0.18 }),
      s('rect', { x: -4.5, y: -12, width: 3.5, height: 12, rx: 1.5, fill: calca }), s('rect', { x: 1, y: -12, width: 3.5, height: 12, rx: 1.5, fill: calca }),
      s('rect', { x: -6, y: -26, width: 12, height: 15, rx: 4, fill: roupa }),
      s('circle', { cx: 0, cy: -31, r: 5.5, fill: pele }),
      s('path', { d: `M-5.5 -32 Q0 ${-40 - r(0, 3)} 5.5 -32 Z`, fill: um(['#212121', '#4E342E', '#795548', '#FBC02D', '#000']) }));
    por(y, g);
  };
  const arvore = (x, y, k = 1) => {
    const verde = um(['#2E7D32', '#388E3C', '#43A047', '#1B5E20', '#558B2F']);
    por(y, s('g', { transform: `translate(${x} ${y}) scale(${k})` },
      s('ellipse', { cx: 0, cy: 2, rx: 18, ry: 5, fill: '#000', opacity: 0.18 }),
      s('rect', { x: -4, y: -26, width: 8, height: 28, rx: 2, fill: '#6D4C41' }),
      s('circle', { cx: 0, cy: -40, r: 22, fill: verde }), s('circle', { cx: -14, cy: -30, r: 14, fill: verde }), s('circle', { cx: 14, cy: -30, r: 14, fill: verde }),
      s('circle', { cx: -6, cy: -48, r: 8, fill: '#fff', opacity: 0.12 })));
  };
  const coqueiro = (x, y) => por(y, s('g', { transform: `translate(${x} ${y})` },
    s('path', { d: 'M0 0 Q6 -40 2 -80', stroke: '#8D6E63', 'stroke-width': 7, fill: 'none' }),
    ...[0, 72, 144, 216, 288].map(a => s('ellipse', { cx: 2, cy: -80, rx: 28, ry: 7, fill: '#2E7D32', transform: `rotate(${a + r(-15, 15)} 2 -80) translate(20 0)` }))));
  const casa = (x, y, k = 1) => {
    const w = r(70, 110) * k, h = r(55, 80) * k, parede = um(PASTEIS), telhado = um(TELHADOS);
    const janelas = [];
    for (let i = 0; i < Math.floor(w / 26); i++) janelas.push(s('rect', { x: x - w / 2 + 10 + i * 26, y: y - h + 12, width: 14, height: 14, fill: '#81D4FA', stroke: '#fff', 'stroke-width': 2 }));
    por(y, s('g', {},
      s('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: parede, stroke: '#455A64', 'stroke-width': 2 }),
      s('path', { d: `M${x - w / 2 - 8} ${y - h} L${x} ${y - h - r(28, 45) * k} L${x + w / 2 + 8} ${y - h} Z`, fill: telhado, stroke: '#37474F', 'stroke-width': 2 }),
      ...janelas,
      s('rect', { x: x - 8, y: y - 24, width: 16, height: 24, fill: '#6D4C41' })));
  };
  const predio = (x, y) => {
    const w = r(70, 100), h = r(140, 220), cor = um(PASTEIS);
    const jan = [];
    for (let yy = y - h + 12; yy < y - 20; yy += 22) for (let xx = x - w / 2 + 8; xx < x + w / 2 - 12; xx += 20) jan.push(s('rect', { x: xx, y: yy, width: 12, height: 14, fill: aleatorio() < 0.3 ? '#FFF59D' : '#90CAF9' }));
    por(y, s('g', {}, s('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: cor, stroke: '#455A64', 'stroke-width': 2 }), ...jan));
  };
  const carro = (x, y) => {
    const cor = um(ROUPAS);
    por(y, s('g', { transform: `translate(${x} ${y})` },
      s('rect', { x: -26, y: -18, width: 52, height: 14, rx: 5, fill: cor }), s('rect', { x: -14, y: -28, width: 28, height: 12, rx: 4, fill: cor }),
      s('rect', { x: -11, y: -26, width: 10, height: 8, fill: '#B3E5FC' }), s('rect', { x: 2, y: -26, width: 10, height: 8, fill: '#B3E5FC' }),
      s('circle', { cx: -15, cy: -3, r: 6, fill: '#212121' }), s('circle', { cx: 15, cy: -3, r: 6, fill: '#212121' })));
  };
  const barraca = (x, y) => {
    const c1 = um(ROUPAS), w = r(70, 95);
    const listras = Array.from({ length: 6 }, (_, i) => s('rect', { x: x - w / 2 + i * (w / 6), y: y - 70, width: w / 6, height: 16, fill: i % 2 ? '#fff' : c1 }));
    const frutas = Array.from({ length: 10 }, (_, i) => s('circle', { cx: x - w / 2 + 8 + (i % 5) * (w - 16) / 4, cy: y - 30 + Math.floor(i / 5) * 9, r: 4.5, fill: um(['#E53935', '#FDD835', '#43A047', '#FB8C00', '#8E24AA']) }));
    por(y, s('g', {},
      s('rect', { x: x - w / 2 + 3, y: y - 54, width: 4, height: 54, fill: '#795548' }), s('rect', { x: x + w / 2 - 7, y: y - 54, width: 4, height: 54, fill: '#795548' }),
      s('rect', { x: x - w / 2, y: y - 40, width: w, height: 22, fill: '#A1887F', stroke: '#5D4037', 'stroke-width': 2 }),
      ...frutas, ...listras));
  };
  const guardaSol = (x, y) => {
    const c = um(ROUPAS);
    por(y, s('g', {}, s('rect', { x: x - 1.5, y: y - 55, width: 3, height: 55, fill: '#8D6E63' }),
      s('path', { d: `M${x - 32} ${y - 50} Q${x} ${y - 82} ${x + 32} ${y - 50} Z`, fill: c, stroke: '#fff', 'stroke-width': 3 }),
      s('rect', { x: x - 18, y: y - 6, width: 36, height: 14, fill: um(PASTEIS), transform: `rotate(${r(-15, 15)} ${x} ${y})` })));
  };
  const flor = (x, y) => por(y, s('g', {}, s('rect', { x: x - 1, y: y - 10, width: 2, height: 10, fill: '#388E3C' }), s('circle', { cx: x, cy: y - 12, r: 4, fill: um(['#E91E63', '#FFEB3B', '#FF5722', '#9C27B0', '#fff']) })));
  const arbusto = (x, y) => por(y, s('g', {}, s('circle', { cx: x - 10, cy: y - 8, r: 11, fill: '#43A047' }), s('circle', { cx: x + 8, cy: y - 9, r: 12, fill: '#388E3C' }), s('circle', { cx: x, cy: y - 16, r: 10, fill: '#4CAF50' })));
  const banco = (x, y) => por(y, s('g', {}, s('rect', { x: x - 22, y: y - 14, width: 44, height: 6, fill: '#8D6E63' }), s('rect', { x: x - 22, y: y - 24, width: 44, height: 5, fill: '#A1887F' }),
    s('rect', { x: x - 20, y: y - 8, width: 3, height: 8, fill: '#5D4037' }), s('rect', { x: x + 17, y: y - 8, width: 3, height: 8, fill: '#5D4037' })));
  const poste = (x, y) => por(y, s('g', {}, s('rect', { x: x - 2, y: y - 70, width: 4, height: 70, fill: '#455A64' }), s('circle', { cx: x, cy: y - 72, r: 7, fill: '#FFF59D', stroke: '#455A64', 'stroke-width': 2 })));
  const bandeirinhas = (y) => {
    const cores = ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA'];
    const g = s('g', {}, s('path', { d: `M0 ${y} Q${W / 2} ${y + 40} ${W} ${y}`, stroke: '#5D4037', 'stroke-width': 2, fill: 'none' }));
    for (let x = 10; x < W; x += 26) { const yy = y + 40 * 4 * (x / W) * (1 - x / W); g.append(s('path', { d: `M${x} ${yy} l12 0 l-6 14 Z`, fill: cores[(x / 26 | 0) % cores.length] })); }
    por(y + 60, g);
  };
  const balao = (x, y) => por(y, s('g', {}, s('path', { d: `M${x} ${y} q-4 20 2 40`, stroke: '#757575', fill: 'none' }), s('ellipse', { cx: x, cy: y - 10, rx: 11, ry: 14, fill: um(ROUPAS) })));
  const tenda = (x, y) => {
    const c = um(ROUPAS);
    por(y, s('g', {}, s('path', { d: `M${x - 60} ${y} L${x} ${y - 110} L${x + 60} ${y} Z`, fill: c, stroke: '#fff', 'stroke-width': 3 }),
      s('path', { d: `M${x - 30} ${y} L${x} ${y - 110} L${x + 30} ${y} Z`, fill: '#fff', opacity: 0.5 }), s('path', { d: `M${x} ${y - 110} l0 -18 l16 6 l-16 6`, fill: um(ROUPAS) })));
  };
  const caixaParada = (x, y) => s('g', { transform: `translate(${x} ${y})` }, caixa(um(['#D7A86E', '#C49A6C', '#BCAAA4'])));
  const espalhar = (n, fn, { x0 = 20, x1 = W - 20, y0 = 60, y1 = H - 10 } = {}) => { for (let i = 0; i < n; i++) fn(r(x0, x1), r(y0, y1)); };
  // ---------- coisas que andam (CSS anima; no modo "parado" a animação fica congelada) ----------
  const faixas = [];   // { y, dir, dur }: objetos escondidos também andam nessas faixas
  const andando = (y, dir, dur, desenho) => {
    // desenho feito em x = 0; a animação leva de um lado ao outro, começando em ponto sorteado
    const g = s('g', { class: `anda ${dir > 0 ? 'anda-dir' : 'anda-esq'}`, style: `animation-duration:${dur}s;animation-delay:${-r(0, dur)}s` },
      s('g', { transform: `translate(0 ${y})` }, desenho));   // a altura da faixa; a animação cuida do x
    por(y + 0.5, g);
  };
  const caixa = cor => s('g', {}, s('rect', { x: -14, y: -26, width: 28, height: 24, fill: cor, stroke: '#5D4037', 'stroke-width': 2 }),
    s('path', { d: 'M-14 -14 L14 -14 M0 -26 L0 -2', stroke: '#5D4037', 'stroke-width': 1.5 }));
  const veiculo = (cor, caminhao) => caminhao
    ? s('g', {}, s('rect', { x: -60, y: -40, width: 80, height: 34, fill: cor, stroke: '#37474F', 'stroke-width': 2 }), s('rect', { x: 20, y: -30, width: 30, height: 24, rx: 4, fill: '#ECEFF1', stroke: '#37474F' }),
      s('rect', { x: 34, y: -26, width: 12, height: 10, fill: '#90CAF9' }), ...[-44, -14, 34].map(cx => s('circle', { cx, cy: -4, r: 7, fill: '#212121' })))
    : s('g', {}, s('rect', { x: -26, y: -18, width: 52, height: 14, rx: 5, fill: cor }), s('rect', { x: -14, y: -28, width: 28, height: 12, rx: 4, fill: cor }),
      s('rect', { x: -11, y: -26, width: 10, height: 8, fill: '#B3E5FC' }), s('rect', { x: 2, y: -26, width: 10, height: 8, fill: '#B3E5FC' }),
      s('circle', { cx: -15, cy: -3, r: 6, fill: '#212121' }), s('circle', { cx: 15, cy: -3, r: 6, fill: '#212121' }));
  const trem = cor => {
    const vagoes = [];
    for (let i = 0; i < 7; i++) {
      const x = -90 - i * 92;
      vagoes.push(s('rect', { x, y: -48, width: 86, height: 40, rx: 6, fill: i ? um(PASTEIS) : cor, stroke: '#37474F', 'stroke-width': 2 }),
        ...[0, 1, 2].map(j => s('rect', { x: x + 8 + j * 26, y: -42, width: 18, height: 14, fill: '#B3E5FC' })),
        s('circle', { cx: x + 16, cy: -6, r: 7, fill: '#263238' }), s('circle', { cx: x + 70, cy: -6, r: 7, fill: '#263238' }));
    }
    return s('g', {}, s('path', { d: 'M0 -8 L0 -52 Q0 -60 -10 -60 L-40 -60 L-40 -8 Z', fill: cor, stroke: '#37474F', 'stroke-width': 2 }),
      s('rect', { x: -36, y: -54, width: 18, height: 16, fill: '#B3E5FC' }), s('circle', { cx: -12, cy: -6, r: 8, fill: '#263238' }), s('circle', { cx: -32, cy: -6, r: 8, fill: '#263238' }), ...vagoes);
  };

  // ---------- os temas ----------
  if (tema === 'praia') {
    fundo.append(s('rect', { width: W, height: H * 0.32, fill: '#4FC3F7' }), s('rect', { y: H * 0.26, width: W, height: H * 0.1, fill: '#81D4FA' }));
    for (let x = 0; x < W; x += 60) fundo.append(s('path', { d: `M${x} ${H * 0.33} q15 -10 30 0 t30 0`, stroke: '#fff', 'stroke-width': 3, fill: 'none' }));
    chao.append(s('rect', { y: H * 0.35, width: W, height: H * 0.65, fill: '#FFE0A3' }));
    espalhar(40, guardaSol, { y0: H * 0.42 }); espalhar(170, (x, y) => pessoa(x, y), { y0: H * 0.38 }); espalhar(14, coqueiro, { y0: H * 0.5 });
    espalhar(30, (x, y) => por(y, s('circle', { cx: x, cy: y - 5, r: 5, fill: um(['#FFF', '#FFCCBC', '#D7CCC8']) })), { y0: H * 0.4 });
  } else if (tema === 'parque') {
    chao.append(s('rect', { width: W, height: H, fill: '#9CCC65' }), s('ellipse', { cx: W * 0.5, cy: H * 0.45, rx: 260, ry: 120, fill: '#4FC3F7', stroke: '#81D4FA', 'stroke-width': 10 }),
      s('path', { d: `M0 ${H * 0.8} Q${W / 2} ${H * 0.65} ${W} ${H * 0.85}`, stroke: '#D7CCC8', 'stroke-width': 40, fill: 'none' }));
    espalhar(70, arvore); espalhar(60, arbusto); espalhar(140, flor); espalhar(20, banco); espalhar(150, (x, y) => pessoa(x, y)); espalhar(12, poste);
  } else if (tema === 'feira') {
    chao.append(s('rect', { width: W, height: H, fill: '#BDBDBD' }));
    for (let y = 120; y < H; y += 150) chao.append(s('rect', { y: y - 8, width: W, height: 16, fill: '#E0E0E0' }));
    for (let y = 130; y < H; y += 150) for (let x = 60; x < W; x += r(100, 130)) barraca(x, y);
    espalhar(220, (x, y) => pessoa(x, y)); espalhar(40, (x, y) => por(y, s('rect', { x: x - 10, y: y - 14, width: 20, height: 14, fill: '#8D6E63', stroke: '#5D4037' })));
  } else if (tema === 'festa') {
    chao.append(s('rect', { width: W, height: H, fill: '#D7CCC8' }));
    for (let y = 80; y < H; y += 220) bandeirinhas(y);
    espalhar(9, tenda, { y0: 150 }); espalhar(260, (x, y) => pessoa(x, y)); espalhar(60, balao); espalhar(15, poste);
    espalhar(25, (x, y) => barraca(x, y), { y0: 200 });
  } else if (tema === 'escola') {
    chao.append(s('rect', { width: W, height: H, fill: '#CFD8DC' }), s('rect', { x: 80, y: 520, width: 520, height: 300, fill: '#66BB6A', stroke: '#fff', 'stroke-width': 6 }),
      s('circle', { cx: 340, cy: 670, r: 50, fill: 'none', stroke: '#fff', 'stroke-width': 5 }));
    for (let x = 60; x < W; x += 230) predio(x + 100, 260);
    espalhar(40, arvore, { y0: 300 }); espalhar(230, (x, y) => pessoa(x, y), { y0: 290 }); espalhar(25, banco, { y0: 320 }); espalhar(60, flor, { y0: 300 });
  } else if (tema === 'fabrica') {
    chao.append(s('rect', { width: W, height: H, fill: '#B0BEC5' }), s('rect', { width: W, height: 90, fill: '#78909C' }));
    for (let x = 30; x < W; x += 160) fundo.append(s('rect', { x, y: 20, width: 110, height: 50, fill: '#90CAF9', stroke: '#455A64', 'stroke-width': 3 }));
    for (const [y, dir] of [[270, 1], [520, -1], [770, 1]]) {
      chao.append(s('rect', { y: y - 18, width: W, height: 26, fill: '#37474F' }), s('rect', { y: y - 18, width: W, height: 5, fill: '#90A4AE' }));
      for (let x = 10; x < W; x += 34) chao.append(s('circle', { cx: x, cy: y + 2, r: 5, fill: '#263238' }));
      const dur = r(22, 30);
      faixas.push({ y: y - 18, dir, dur });
      for (let i = 0; i < 14; i++) andando(y - 16, dir, dur, caixa(um(['#D7A86E', '#C49A6C', '#E0B97E', '#BCAAA4', ...ROUPAS.slice(0, 4)])));
      for (let x = 60; x < W; x += r(110, 170)) pessoa(x, y + 60);
    }
    espalhar(14, (x, y) => por(y, s('g', {}, s('rect', { x: x - 30, y: y - 70, width: 60, height: 70, fill: um(['#FFB300', '#0288D1', '#7CB342', '#E64A19']), stroke: '#37474F', 'stroke-width': 3 }),
      s('circle', { cx: x, cy: y - 45, r: 12, fill: '#ECEFF1', stroke: '#37474F', 'stroke-width': 2 }), s('path', { d: `M${x} ${y - 45} l8 -6`, stroke: '#D32F2F', 'stroke-width': 2 }))), { y0: 330, y1: 460 });
    espalhar(60, (x, y) => pessoa(x, y), { y0: 100 }); espalhar(30, (x, y) => por(y, caixaParada(x, y)), { y0: 100 });
  } else if (tema === 'trem') {
    fundo.append(s('rect', { width: W, height: H, fill: '#AED581' }), s('path', { d: `M0 260 Q300 120 620 240 T1200 220 T${W} 230 L${W} 0 L0 0 Z`, fill: '#81D4FA' }),
      s('path', { d: `M0 300 Q260 180 560 300 T1100 280 T${W} 300 L${W} 330 L0 330 Z`, fill: '#7CB342' }));
    for (const [y, dir] of [[480, 1], [700, -1]]) {
      chao.append(s('rect', { y: y - 4, width: W, height: 8, fill: '#6D4C41' }), s('rect', { y: y + 10, width: W, height: 8, fill: '#6D4C41' }));
      for (let x = 0; x < W; x += 24) chao.append(s('rect', { x, y: y - 8, width: 10, height: 30, fill: '#8D6E63' }));
      const dur = r(26, 34);
      faixas.push({ y: y - 30, dir, dur });
      andando(y + 6, dir, dur, trem(um(['#C62828', '#1565C0', '#2E7D32', '#F9A825'])));
      andando(y + 6, dir, dur, trem(um(['#6A1B9A', '#EF6C00', '#00838F'])));
    }
    chao.append(s('rect', { x: 200, y: 560, width: 520, height: 40, fill: '#BDBDBD', stroke: '#757575', 'stroke-width': 3 }));
    espalhar(30, (x, y) => pessoa(x, y), { x0: 210, x1: 710, y0: 565, y1: 598 });
    espalhar(45, arvore, { y0: 320, y1: 430 }); espalhar(40, arvore, { y0: 780 }); espalhar(12, casa, { y0: 820 }); espalhar(80, flor, { y0: 330 }); espalhar(60, (x, y) => pessoa(x, y), { y0: 780 });
  } else if (tema === 'rodovia') {
    chao.append(s('rect', { width: W, height: H, fill: '#9CCC65' }), s('rect', { y: 300, width: W, height: 400, fill: '#546E7A' }), s('rect', { y: 495, width: W, height: 10, fill: '#FDD835' }));
    for (const y of [400, 600]) for (let x = 0; x < W; x += 80) chao.append(s('rect', { x, y: y - 3, width: 40, height: 6, fill: '#fff' }));
    for (const [y, dir] of [[380, 1], [470, 1], [570, -1], [670, -1]]) {
      const dur = r(14, 22);
      faixas.push({ y: y - 24, dir, dur });
      for (let i = 0; i < 6; i++) andando(y, dir, dur, veiculo(um(ROUPAS), aleatorio() < 0.3));
    }
    espalhar(50, arvore, { y0: 60, y1: 290 }); espalhar(50, arvore, { y0: 740 }); espalhar(14, casa, { y0: 120, y1: 280 }); espalhar(14, casa, { y0: 780 });
    espalhar(90, (x, y) => pessoa(x, y), { y0: 720 }); espalhar(60, (x, y) => pessoa(x, y), { y0: 60, y1: 290 }); espalhar(16, poste, { y0: 290, y1: 300 });
  } else {   // cidade
    chao.append(s('rect', { width: W, height: H, fill: '#A5D6A7' }));
    for (let y = 0; y < H; y += 250) chao.append(s('rect', { y: y + 200, width: W, height: 46, fill: '#78909C' }), s('rect', { y: y + 221, width: W, height: 4, fill: '#FFF', 'stroke-dasharray': '20 20' }));
    for (let x = 0; x < W; x += 360) chao.append(s('rect', { x: x + 300, width: 46, height: H, fill: '#78909C' }));
    for (let y = 190; y < H; y += 250) for (let x = 50; x < W; x += r(110, 150)) (aleatorio() < 0.25 ? predio : casa)(x, y - r(0, 30));
    espalhar(45, arvore); espalhar(220, (x, y) => pessoa(x, y)); espalhar(35, carro); espalhar(20, poste); espalhar(40, arbusto); espalhar(60, flor);
  }
  coisas.sort((a, b) => a[0] - b[0]);
  svg.append(fundo, chao, ...coisas.map(c => c[1]));
  svg.faixas = faixas;   // onde os objetos escondidos também andam
  return svg;
}
