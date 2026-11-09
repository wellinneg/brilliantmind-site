// Narrador: lê parágrafos em voz alta com a voz em português do próprio celular (Web Speech),
// um por vez, avisando qual está sendo lido. Sem voz no aparelho, o app mostra o texto para ler.

export const temVoz = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function vozPortugues() {
  const vozes = speechSynthesis.getVoices();
  return vozes.find(v => v.lang === 'pt-BR' && /google|natural|online/i.test(v.name))
    || vozes.find(v => v.lang === 'pt-BR')
    || vozes.find(v => v.lang?.startsWith('pt'))
    || null;
}

/** Cria um narrador para a lista de parágrafos. */
export function criarNarrador(paragrafos, { aoMudar, aoTerminar, velocidade = 1 } = {}) {
  let atual = 0, tocando = false, vel = velocidade, sessao = 0;

  function falar(i) {
    const minha = ++sessao;
    speechSynthesis.cancel();
    if (i >= paragrafos.length) { tocando = false; aoMudar?.(-1); aoTerminar?.(); return; }
    atual = i; tocando = true; aoMudar?.(i);
    const u = new SpeechSynthesisUtterance(paragrafos[i]);
    u.lang = 'pt-BR'; u.rate = vel;
    const voz = vozPortugues(); if (voz) u.voice = voz;
    u.onend = () => { if (minha === sessao && tocando) falar(i + 1); };
    u.onerror = e => { if (minha === sessao && e.error !== 'interrupted' && e.error !== 'canceled') falar(i + 1); };
    speechSynthesis.speak(u);
  }

  return {
    tocar() { if (!tocando) falar(atual); },
    pausar() { tocando = false; sessao++; speechSynthesis.cancel(); aoMudar?.(atual, true); },
    irPara(i) { falar(Math.max(0, Math.min(paragrafos.length - 1, i))); },
    velocidade(v) { vel = v; if (tocando) falar(atual); },
    parar() { tocando = false; sessao++; if (temVoz()) speechSynthesis.cancel(); },
    get tocando() { return tocando; },
  };
}

/** Narrador com áudio gravado (vozes neurais, um arquivo por parágrafo). Se um arquivo falhar
 *  (sem internet na 1ª vez, arquivo ainda não gerado), troca sozinho para a voz do celular. */
export function criarNarradorComAudio(paragrafos, urls, { aoMudar, aoTerminar, velocidade = 1 } = {}) {
  let atual = 0, tocando = false, vel = velocidade, reserva = null;
  const audio = new Audio();
  audio.preload = 'auto';
  const usarReserva = () => {
    if (!reserva) reserva = criarNarrador(paragrafos, { aoMudar, aoTerminar, velocidade: vel });
    audio.pause();
    return reserva;
  };
  function tocarParagrafo(i) {
    if (reserva) return reserva.irPara(i);
    if (i >= paragrafos.length) { tocando = false; aoMudar?.(-1); aoTerminar?.(); return; }
    atual = i; tocando = true; aoMudar?.(i);
    audio.src = urls[i];
    audio.playbackRate = vel;
    audio.play().catch(e => { if (e.name !== 'AbortError' && tocando && temVoz()) usarReserva().irPara(i); });   // AbortError = trocou de parágrafo, não é falha
  }
  audio.addEventListener('ended', () => { if (tocando) tocarParagrafo(atual + 1); });
  audio.addEventListener('error', () => { if (tocando && temVoz()) usarReserva().irPara(atual); });
  // o próximo parágrafo já vai baixando enquanto este toca
  audio.addEventListener('playing', () => { if (urls[atual + 1]) fetch(urls[atual + 1]).catch(() => {}); });
  return {
    tocar() { if (reserva) return reserva.tocar(); if (!tocando) { if (audio.src && !audio.ended && audio.currentTime > 0) { tocando = true; audio.play(); aoMudar?.(atual); } else tocarParagrafo(atual); } },
    pausar() { if (reserva) return reserva.pausar(); tocando = false; audio.pause(); aoMudar?.(atual, true); },
    irPara(i) { tocarParagrafo(Math.max(0, Math.min(paragrafos.length - 1, i))); },
    velocidade(v) { vel = v; audio.playbackRate = v; reserva?.velocidade(v); },
    parar() { tocando = false; audio.pause(); reserva?.parar(); },
    get tocando() { return reserva ? reserva.tocando : tocando; },
  };
}
