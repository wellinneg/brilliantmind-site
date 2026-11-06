// Efeitos visuais de jogo: confete, transição animada entre telas e "pop" de elementos.

/** Chuva de confete por ~2,5 s (canvas por cima da tela; some sozinho). */
export function confete({ quantidade = 120, cores = ['#CEF010', '#43D17A', '#FFD54F', '#FF7043', '#7E57C2', '#4FC3F7'] } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tela = document.createElement('canvas');
  tela.className = 'confete';
  const dpr = devicePixelRatio || 1;
  tela.width = innerWidth * dpr; tela.height = innerHeight * dpr;
  document.body.append(tela);
  const ctx = tela.getContext('2d');
  ctx.scale(dpr, dpr);
  const pedacos = Array.from({ length: quantidade }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, cor: cores[Math.floor(Math.random() * cores.length)],
  }));
  const inicio = performance.now();
  (function quadro(agora) {
    const t = agora - inicio;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pedacos) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - t / 2500);
      ctx.fillStyle = p.cor; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < 2500) requestAnimationFrame(quadro); else tela.remove();
  })(inicio);
}

/** Troca o conteúdo da tela com animação (View Transitions, quando o navegador tem). */
export function trocarComTransicao(trocar) {
  let feito = false;
  const umaVez = () => { if (!feito) { feito = true; trocar(); } };
  // Em segundo plano (app minimizado) o navegador pausa a animação: troca direto, sem esperar.
  if (document.startViewTransition && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
      const vt = document.startViewTransition(umaVez);
      // uma troca de tela pode interromper outra: isso é normal, não é erro
      for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p?.catch(() => {});
      setTimeout(umaVez, 700); // garantia: se a animação não começar, a tela troca assim mesmo
      return;
    } catch { /* cai no jeito simples */ }
  }
  umaVez();
}

/** Dá um "pulinho" num elemento (acerto, item comprado…). */
export function pop(elemento, classe = 'pop') {
  if (!elemento) return;
  elemento.classList.remove(classe);
  void elemento.offsetWidth; // reinicia a animação
  elemento.classList.add(classe);
}
