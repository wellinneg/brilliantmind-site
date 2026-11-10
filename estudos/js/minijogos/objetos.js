// Caça-objetos: cenários grandes DESENHADOS (cidade, praia, parque, feira, festa, escola), cheios de
// detalhes, com zoom (dois dedos ou ➕➖) e arrastar.
// Vários cenários por partida, cada um com a sua lista de objetos escondidos. Toque errado = multa em segundos.
import { el } from '../ui.js';
import { CENAS } from '../cenas.js';
import { TEMAS, desenharCenario } from './cenarios.js';
import * as db from '../db.js';

const CHAVE_MOVIMENTO = 'objetos:movimento';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const BAGUNCA = ['🔑', '🧦', '📎', '🧸', '⚽', '🎈', '🕶️', '🪀', '🧩', '🔦', '🧲', '✂️', '🪥', '🧢', '🎒', '📌', '🖍️', '🥄', '🧤', '⏰', '📷', '🎲', '🪁', '🔔', '🍕', '🧃', '🎧', '📚'];
// Objetos que se parecem: no nível Extremo, o "gêmeo" de cada alvo aparece na bagunça para confundir.
export const PARECIDOS = { '🔑': '🗝️', '🧦': '🧤', '⚽': '🏀', '🎈': '🎀', '🕶️': '👓', '🧩': '🎲', '🔦': '🕯️', '📌': '📍', '🖍️': '✏️',
  '⏰': '⌚', '📷': '📸', '🔔': '🛎️', '🍕': '🥪', '🎧': '📻', '📚': '📖', '🧢': '👒', '🥄': '🍴', '✂️': '📏', '🧸': '🐻', '🧃': '🥤',
  '🎲': '🧊', '🪁': '🎏', '🧲': '🪝', '🪥': '🖌️', '🎒': '👜', '📎': '🖇️', '🧤': '🧦', '🪀': '🎯' };
export const NIVEIS_OBJETOS = {
  // cenas = cenários por partida; porCena = objetos para achar em cada um; cols×linhas = peças por cenário;
  // tam = tamanho no cenário grande (px do "mundo" de 1560×1000); esconder = transparência para camuflar
  facil: { nome: 'Fácil', icone: '🍼', alvos: 5, cenas: 1, porCena: 5, cols: 6, linhas: 8, tam: [36, 12], giro: 40, multa: 3, rapido: 60, bonus: 1 },
  medio: { nome: 'Médio', icone: '🙂', alvos: 8, cenas: 2, porCena: 4, cols: 7, linhas: 10, tam: [30, 10], giro: 70, multa: 3, rapido: 120, bonus: 1.2 },
  dificil: { nome: 'Difícil', icone: '💪', alvos: 12, cenas: 3, porCena: 4, cols: 10, linhas: 10, tam: [25, 8], giro: 120, multa: 4, rapido: 200, bonus: 1.5, esconder: 0.25 },
  extremo: { nome: 'Extremo', icone: '🔥', alvos: 15, cenas: 3, porCena: 5, cols: 12, linhas: 16, tam: [21, 6], giro: 180, multa: 5, rapido: 300, bonus: 2, esconder: 0.4, parecidos: true, gemeos: 6 },
};
const MUNDO = { w: 1560, h: 1000 };   // horizontal, como as fotos: a criança arrasta para os lados

/** Sorteia os alvos e a bagunça (cada alvo aparece uma vez só). Com `parecidos`, os gêmeos dos alvos entram como distração. */
export function montarBagunca(itensDoLugar, quantosAlvos, total, aleatorio = Math.random, { parecidos = false, gemeos: quantosGemeos = 3 } = {}) {
  const mistura = a => [...a].sort(() => aleatorio() - 0.5);
  const gemeos = new Set(Object.values(PARECIDOS));
  const pool = [...new Set([...itensDoLugar, ...BAGUNCA])].filter(x => !parecidos || !gemeos.has(x) || itensDoLugar.includes(x));
  const alvos = mistura(pool).slice(0, quantosAlvos);
  let resto = pool.filter(x => !alvos.includes(x));
  if (parecidos) {   // cada alvo ganha vários gêmeos espalhados (quando existe um parecido)
    const extras = alvos.flatMap(a => (PARECIDOS[a] && !alvos.includes(PARECIDOS[a]) ? Array(quantosGemeos).fill(PARECIDOS[a]) : []));
    resto = [...extras, ...extras, ...resto];
  }
  const distracoes = Array.from({ length: total - quantosAlvos }, (_, k) => resto[(k + Math.floor(aleatorio() * resto.length)) % resto.length]);
  return { alvos, pecas: mistura([...alvos.map(e => ({ e, alvo: true })), ...distracoes.map(e => ({ e, alvo: false }))]) };
}

export function iniciar(area, { t, ano, nivel, movimento = true }) {
  if (!NIVEIS_OBJETOS[nivel]) return escolherNivel(area, { t, ano });
  const N = NIVEIS_OBJETOS[nivel];
  // cenários desenhados, temas sorteados (tudo desenhado já no início: no duelo sai igual para os dois)
  const temas = Object.keys(TEMAS).sort(() => Math.random() - 0.5).slice(0, N.cenas);
  const cenas = temas.map(tema => ({
    tema,
    desenho: desenharCenario(tema, Math.random, MUNDO.w, MUNDO.h),
    ...montarBagunca(CENAS[t.id]?.itens || [t.icone], N.porCena, N.cols * N.linhas, Math.random, { parecidos: !!N.parecidos, gemeos: N.gemeos || 3 }),
    posicoes: Array.from({ length: N.cols * N.linhas }, (_, k) => {
      const col = k % N.cols, lin = Math.floor(k / N.cols), solto = N.parecidos ? 1.1 : 0.8;
      return {
        x: (col + (1 - solto) / 2 + Math.random() * solto) / N.cols * 100,
        y: (lin + (1 - solto) / 2 + Math.random() * solto) / N.linhas * 100,
        tam: N.tam[0] + Math.random() * N.tam[1],
        giro: Math.round(Math.random() * N.giro * 2 - N.giro),
        opa: N.esconder ? 1 - Math.random() * N.esconder : 1,
      };
    }),
  }));
  // nos cenários com movimento, 1 em cada 4 objetos anda nas esteiras, trilhos ou pistas
  for (const c of cenas) {
    const faixas = c.desenho.faixas || [];
    if (!faixas.length) continue;
    c.posicoes.forEach((q, k) => {
      if (k % 4 !== 0) return;
      const f = faixas[Math.floor(Math.random() * faixas.length)];
      Object.assign(q, { y: (f.y / MUNDO.h) * 100, anda: f.dir, dur: f.dur, atraso: -Math.random() * f.dur, giro: 0 });
    });
  }
  let atual = 0, erros = 0, achados = 0;
  const visor = el('span', { class: 'cronometro' });
  const titulo = el('strong', {});
  const lista = el('div', { class: 'alvos' });
  const palco = el('div', { class: 'palco-cena' });
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, titulo, visor),
    lista, palco,
    el('p', { class: 'dica' }, `Use dois dedos (ou ➕ ➖) para dar zoom e arraste para procurar. Toque errado custa +${N.multa} segundos.`),
    el('button', { class: 'link', onclick: () => terminar(true) }, 'Desistir'));
  const relogio = cronometro(visor);
  mostrarCena();

  function mostrarCena() {
    const c = cenas[atual];
    const faltam = new Set(c.alvos);
    titulo.textContent = `${N.icone} Cena ${atual + 1} de ${cenas.length}`;
    lista.replaceChildren(...c.alvos.map(a => el('span', { class: 'alvo', 'data-e': a }, a)));
    const mundo = el('div', { class: `mundo-cena nivel-${nivel} ${movimento ? '' : 'parado'}`, style: `width:${MUNDO.w}px;height:${MUNDO.h}px` });
    c.desenho.classList.add('foto-mundo');
    mundo.append(c.desenho);
    const janela = criarJanelaComZoom(mundo);
    c.pecas.forEach((p, k) => {
      const q = c.posicoes[k];
      const anda = q.anda ? `animation-duration:${q.dur}s;animation-delay:${q.atraso}s;` : '';
      const b = el('button', {
        class: `peca ${q.anda ? (q.anda > 0 ? 'peca-anda peca-dir' : 'peca-anda peca-esq') : ''}`, type: 'button',
        style: `${anda}left:${q.x}%;top:${q.y}%;font-size:${q.tam}px;opacity:${q.opa};transform:translate(-50%,-50%) rotate(${q.giro}deg)`,
        onclick: () => { if (!janela.arrastou()) tocar(p, b); },
      }, p.e);
      mundo.append(b);
    });
    palco.replaceChildren(el('div', { class: 'placa-foto placa-cena' }, `${TEMAS[c.tema].icone} ${TEMAS[c.tema].nome.toUpperCase()}`), janela.el);
    janela.ajustar();

    function tocar(p, b) {
      if (p.alvo && faltam.has(p.e)) {
        faltam.delete(p.e); achados++;
        b.classList.add('achou'); b.disabled = true;
        const marca = lista.querySelector(`[data-e="${p.e}"]`);
        marca?.classList.add('ok'); pop(marca);
        sons.moeda();
        if (!faltam.size) {
          if (atual + 1 < cenas.length) { sons.conquista(); atual++; setTimeout(mostrarCena, 700); }
          else terminar(false);
        }
      } else {
        erros++; relogio.multa(N.multa); sons.erro(); pop(b, 'tremer');
      }
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
      linhas: [`Nível: ${N.icone} ${N.nome}`, `Objetos: ${achados} de ${N.porCena * cenas.length}`, `Cenários: ${completo ? cenas.length : atual} de ${cenas.length}`, `Tempo (com multas): ${formatarTempo(s)}`, `Toques errados: ${erros}`],
      fim, t, tipo: 'objetos', jogarDeNovo: () => iniciar(area, { t, ano }),
    });
  }
}

/** Janela com zoom (dois dedos, roda do mouse ou ➕➖) e arrastar sobre um "mundo" maior que a tela. */
function criarJanelaComZoom(mundo) {
  const janela = el('div', { class: 'janela-cena' }, mundo);
  let esc = 1, min = 1, x = 0, y = 0, moveu = 0, ultimoArrasto = 0;
  const ZOOM_MAX = 4;
  const toques = new Map();
  const limitar = () => {
    const vw = janela.clientWidth, vh = janela.clientHeight;
    x = Math.min(0, Math.max(vw - MUNDO.w * esc, x));
    y = Math.min(0, Math.max(vh - MUNDO.h * esc, y));
  };
  const aplicar = () => { limitar(); mundo.style.transform = `translate(${x}px,${y}px) scale(${esc})`; };
  const zoomEm = (fator, cx, cy) => {
    const novo = Math.min(min * ZOOM_MAX, Math.max(min, esc * fator));
    x = cx - (cx - x) * (novo / esc); y = cy - (cy - y) * (novo / esc); esc = novo; aplicar();
  };
  let ajustado = false;
  const medir = () => {
    const vw = janela.clientWidth, vh = janela.clientHeight;
    if (!vw || !vh) return;
    const novoMin = Math.max(vw / MUNDO.w, vh / MUNDO.h);
    if (!ajustado) { esc = novoMin; x = (vw - MUNDO.w * esc) / 2; y = 0; ajustado = true; }   // começa no meio da foto
    else esc = Math.max(novoMin, Math.min(esc, novoMin * ZOOM_MAX));
    min = novoMin; aplicar();
  };
  // mede já e sempre que a janela mudar de tamanho (não depende de animação, que pausa em segundo plano)
  const ajustar = () => { medir(); setTimeout(medir, 50); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(medir).observe(janela);
  const pos = e => { const r = janela.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  janela.addEventListener('pointerdown', e => { toques.set(e.pointerId, pos(e)); if (toques.size === 1) moveu = 0; });
  janela.addEventListener('pointermove', e => {
    if (!toques.has(e.pointerId)) return;
    const antes = toques.get(e.pointerId), agora = pos(e);
    if (toques.size === 1) {
      x += agora[0] - antes[0]; y += agora[1] - antes[1];
      moveu += Math.abs(agora[0] - antes[0]) + Math.abs(agora[1] - antes[1]);
      aplicar();
    } else if (toques.size === 2) {
      const outro = [...toques.entries()].find(([id]) => id !== e.pointerId)[1];
      const d0 = Math.hypot(antes[0] - outro[0], antes[1] - outro[1]), d1 = Math.hypot(agora[0] - outro[0], agora[1] - outro[1]);
      if (d0 > 0) zoomEm(d1 / d0, (agora[0] + outro[0]) / 2, (agora[1] + outro[1]) / 2);
      moveu += 20;
    }
    toques.set(e.pointerId, agora);
  });
  const soltar = e => { toques.delete(e.pointerId); if (moveu > 8) ultimoArrasto = Date.now(); };
  janela.addEventListener('pointerup', soltar);
  janela.addEventListener('pointercancel', soltar);
  janela.addEventListener('pointerleave', soltar);
  janela.addEventListener('wheel', e => { e.preventDefault(); const [cx, cy] = pos(e); zoomEm(e.deltaY < 0 ? 1.15 : 1 / 1.15, cx, cy); }, { passive: false });
  const botoes = el('div', { class: 'zoom-botoes' },
    el('button', { type: 'button', 'aria-label': 'Aproximar', onclick: () => zoomEm(1.5, janela.clientWidth / 2, janela.clientHeight / 2) }, '➕'),
    el('button', { type: 'button', 'aria-label': 'Afastar', onclick: () => zoomEm(1 / 1.5, janela.clientWidth / 2, janela.clientHeight / 2) }, '➖'));
  const caixa = el('div', { class: 'caixa-cena' }, janela, botoes);
  return { el: caixa, ajustar, arrastou: () => Date.now() - ultimoArrasto < 250 };
}

/** Antes de começar: escolher o nível e se os cenários têm movimento (fábrica, trem, rodovia andando). */
async function escolherNivel(area, { t, ano }) {
  let movimento = (await db.lerConfig(CHAVE_MOVIMENTO)) ?? true;
  const botoesMov = [[true, '🎬 Com movimento'], [false, '🖼️ Parado']].map(([valor, texto]) => el('button', {
    class: `opcao-duelo hora ${valor === movimento ? 'ativa' : ''}`, type: 'button',
    onclick: e => { movimento = valor; db.gravarConfig(CHAVE_MOVIMENTO, valor); botoesMov.forEach(b => b.classList.remove('ativa')); e.currentTarget.classList.add('ativa'); },
  }, texto));
  area.replaceChildren(
    el('p', {}, 'Os cenários:'),
    el('div', { class: 'linha horarios-duelo' }, botoesMov),
    el('p', { class: 'dica' }, 'Com movimento, a fábrica, o trem e a rodovia andam, e alguns objetos andam junto!'),
    el('p', {}, 'Escolha o nível:'),
    el('div', { class: 'niveis-cofre' }, Object.entries(NIVEIS_OBJETOS).map(([id, n]) => el('button', { class: 'botao secundario grande', type: 'button', onclick: () => { sons.moeda(); iniciar(area, { t, ano, nivel: id, movimento }); } },
      `${n.icone} ${n.nome}`, el('small', {}, `${n.cenas} cenário${n.cenas > 1 ? 's' : ''} · ${n.porCena * n.cenas} objetos · ${n.cols * n.linhas} peças por cena${n.parecidos ? ' · objetos parecidos' : ''}`)))));
}
