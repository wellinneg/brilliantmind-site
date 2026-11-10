// Caça-objetos com CENAS ILUSTRADAS: uma ilustração grande e cheia de detalhes, com zoom e arrastar.
// A criança procura os objetos da lista e toca neles. Toque errado = multa em segundos.
// As posições de cada objeto (centro e raio, em pixels da ilustração) estão em cenas-ilustradas.js.
import { el } from '../ui.js';
import { CENAS_ILUSTRADAS, TAMANHO_CENA } from './cenas-ilustradas.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

// quantos objetos procurar em cada nível; nos níveis mais altos a lista mostra só o nome (sem o desenho)
export const NIVEIS_ILUSTRADOS = {
  facil: { nome: 'Fácil', icone: '🍼', alvos: 6, comEmoji: true, multa: 3, rapido: 90, bonus: 1 },
  medio: { nome: 'Médio', icone: '🙂', alvos: 9, comEmoji: true, multa: 3, rapido: 150, bonus: 1.2 },
  dificil: { nome: 'Difícil', icone: '💪', alvos: 12, comEmoji: false, multa: 4, rapido: 220, bonus: 1.5 },
  extremo: { nome: 'Extremo', icone: '🔥', alvos: 99, comEmoji: false, multa: 5, rapido: 300, bonus: 2 },
};
const FOLGA = 1.15;   // o toque vale um pouco além do círculo marcado (dedo de criança)

/** Sorteia a cena (evitando as últimas jogadas) e os objetos dela. Síncrono: no duelo sai igual para os dois. */
export function sortearPartida(nivel, aleatorio = Math.random, evitar = []) {
  const N = NIVEIS_ILUSTRADOS[nivel];
  const livres = CENAS_ILUSTRADAS.filter(c => !evitar.includes(c.cena));
  const opcoes = livres.length ? livres : CENAS_ILUSTRADAS;
  const cena = opcoes[Math.floor(aleatorio() * opcoes.length)];
  const alvos = [...cena.objetos].sort(() => aleatorio() - 0.5).slice(0, Math.min(N.alvos, cena.objetos.length));
  return { cena, alvos };
}

/** Qual objeto foi tocado (coordenadas da ilustração). Devolve o objeto ou null. */
export function objetoNoPonto(objetos, x, y, folga = FOLGA) {
  let melhor = null, menor = Infinity;
  for (const o of objetos) {
    const d = Math.hypot(o.x - x, o.y - y) / o.r;
    if (d <= folga && d < menor) { melhor = o; menor = d; }
  }
  return melhor;
}

export function iniciarIlustrado(area, { t, nivel, criarJanela, evitar = [], aoSortear }) {
  const N = NIVEIS_ILUSTRADOS[nivel] || NIVEIS_ILUSTRADOS.medio;
  const { cena, alvos } = sortearPartida(nivel, Math.random, evitar);
  aoSortear?.(cena.cena);
  const faltam = new Set(alvos);
  let erros = 0;
  const visor = el('span', { class: 'cronometro' });
  const lista = el('div', { class: 'alvos alvos-nomes' }, alvos.map(o => el('span', { class: 'alvo alvo-nome', 'data-n': o.nome },
    N.comEmoji ? `${o.emoji} ${o.nome}` : o.nome)));
  const W = TAMANHO_CENA.w, H = TAMANHO_CENA.h;
  const mundo = el('div', { class: 'mundo-cena', style: `width:${W}px;height:${H}px` },
    el('img', { class: 'foto-mundo', src: `midia/cenas-objetos/cena-${cena.cena}.webp`, alt: cena.titulo, draggable: 'false', style: `width:${W}px;height:${H}px` }));
  const janela = criarJanela(mundo, { w: W, h: H });
  mundo.addEventListener('click', e => {
    if (janela.arrastou()) return;
    const r = mundo.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
    tocar(x, y);
  });
  area.replaceChildren(
    el('div', { class: 'barra-jogo' }, el('strong', {}, `${N.icone} ${cena.titulo}`), visor),
    lista,
    el('div', { class: 'palco-cena' }, janela.el),
    el('p', { class: 'dica' }, `Use dois dedos (ou ➕ ➖) para dar zoom e arraste para procurar. Toque errado custa +${N.multa} segundos.`),
    el('button', { class: 'link', onclick: () => terminar(true) }, 'Desistir'));
  janela.ajustar();
  const relogio = cronometro(visor);

  function marcar(o, classe) {
    const m = el('span', { class: `marca-cena ${classe}`, style: `left:${o.x - o.r}px;top:${o.y - o.r}px;width:${o.r * 2}px;height:${o.r * 2}px` });
    mundo.append(m);
    return m;
  }

  function tocar(x, y) {
    const o = objetoNoPonto(alvos, x, y);
    if (o && faltam.has(o)) {
      faltam.delete(o);
      marcar(o, 'achou');
      const item = lista.querySelector(`[data-n="${CSS.escape(o.nome)}"]`);
      item?.classList.add('ok'); pop(item);
      sons.moeda();
      if (!faltam.size) { sons.conquista(); setTimeout(() => terminar(false), 700); }
    } else if (!o) {
      erros++; relogio.multa(N.multa); sons.erro();
      const m = marcar({ x, y, r: 26 }, 'errou');
      setTimeout(() => m.remove(), 600);
    }
  }

  async function terminar(desistiu) {
    if (terminar.feito) return; terminar.feito = true;
    const s = relogio.parar();
    const completo = !desistiu;
    const rapido = s <= N.rapido;
    const moedas = completo ? Math.round((erros === 0 && rapido ? 15 : (rapido || erros <= 2 ? 12 : 8)) * N.bonus) : 0;
    const fim = await encerrarPartida({ tipo: 'objetos', t, moedas, recorde: completo ? { valor: s, menorMelhor: true } : null });
    mostrarResultado(area, {
      titulo: completo ? '🎉 Achou tudo!' : 'Fica para a próxima!',
      linhas: [`Nível: ${N.icone} ${N.nome}`, `Cena: ${cena.titulo}`, `Objetos: ${alvos.length - faltam.size} de ${alvos.length}`, `Tempo (com multas): ${formatarTempo(s)}`, `Toques errados: ${erros}`],
      fim, t, tipo: 'objetos', jogarDeNovo: () => iniciarIlustrado(area, { t, nivel, criarJanela, evitar: [...evitar, cena.cena], aoSortear }),
    });
  }
}
