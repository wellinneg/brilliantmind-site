// Heróis: os animais criados pelo Wellington (imagens, cenários e vídeos em midia/herois/,
// versões leves geradas a partir de "Desktop\Animais Trilha").
// "acessorios" diz onde chapéu e óculos da loja ficam sobre a cabeça de cada um (em % da caixa).
import { LOJA } from './jogo.js';

const PASTA = 'midia/herois';

export const ARTE = {
  rino: { arquivo: 'rocha', acessorios: { cabeca: { top: '2%', left: '67%' }, rosto: { top: '21%', left: '70%' } } },
  leao: { arquivo: 'juba', acessorios: { cabeca: { top: '0%', left: '62%' }, rosto: { top: '20%', left: '62%' } } },
  aguia: { arquivo: 'ventania', acessorios: { cabeca: { top: '-6%', left: '61%' }, rosto: { top: '8%', left: '62%' } } },
  furao: { arquivo: 'faisca', acessorios: { cabeca: { top: '36%', left: '73%' }, rosto: { top: '52%', left: '73%' } } },
  gato: { arquivo: 'bigode', acessorios: { cabeca: { top: '1%', left: '69%' }, rosto: { top: '20%', left: '69%' } } },
};

const arteDe = heroi => ARTE[heroi] || ARTE.leao;
export const imagemDoHeroi = heroi => `${PASTA}/${arteDe(heroi).arquivo}.webp`;
export const cenarioDoHeroi = heroi => `${PASTA}/${arteDe(heroi).arquivo}-cenario.webp`;
export const videoDoHeroi = heroi => `${PASTA}/${arteDe(heroi).arquivo}-apresentacao.mp4`;
export const desenhosDosHerois = ARTE; // usado nos testes

/** Desenha o herói com os itens da loja que estiver usando. */
export function desenharHeroi(heroi, usando = {}, tamanho = 'medio') {
  const id = heroi in ARTE ? heroi : 'leao';
  const caixa = document.createElement('div');
  caixa.className = `heroi heroi-${tamanho} heroi-${id}`;
  const img = document.createElement('img');
  img.src = imagemDoHeroi(id);
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  caixa.append(img);
  for (const [parte, itemId] of Object.entries(usando || {})) {
    const item = itemId && LOJA.find(i => i.id === itemId);
    if (!item) continue;
    const span = document.createElement('span');
    span.className = `acessorio acessorio-${parte}`;
    span.textContent = item.icone;
    Object.assign(span.style, ARTE[id].acessorios?.[parte] || {});
    caixa.append(span);
  }
  return caixa;
}
