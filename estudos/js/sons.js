// Efeitos sonoros curtos, sintetizados na hora (sem arquivos de música).
let ctx = null;
const LIGADO = 'trilha-som';

export function somLigado() {
  try { return localStorage.getItem(LIGADO) !== 'nao'; } catch { return true; }
}
export function alternarSom() {
  const novo = !somLigado();
  try { localStorage.setItem(LIGADO, novo ? 'sim' : 'nao'); } catch { /* sem armazenamento: só nesta sessão */ }
  return novo;
}

function tocar(notas, tipo = 'square', volume = 0.06) {
  if (!somLigado()) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of notas) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = tipo; o.frequency.value = freq;
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur);
      t += dur * 0.9;
    }
  } catch { /* navegador sem áudio: segue em silêncio */ }
}

export const sons = {
  moeda: () => tocar([[988, 0.08], [1319, 0.16]]),
  conquista: () => tocar([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]]),
  roubo: () => tocar([[784, 0.08], [622, 0.08], [880, 0.2]], 'sawtooth', 0.05),
  camada: () => tocar([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.35]], 'triangle', 0.09),
  compra: () => tocar([[660, 0.07], [880, 0.07], [1175, 0.15]]),
  erro: () => tocar([[220, 0.15], [180, 0.25]], 'triangle', 0.07),
};
