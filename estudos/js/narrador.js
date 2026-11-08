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
