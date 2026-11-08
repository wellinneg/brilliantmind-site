// Introdução da ⚡ Prova surpresa (vídeo de ~3 s criado pelo Wellington). Toque pula.
// Sem vídeo, mostra o mesmo recado por cima do cenário de tempestade.
import { sons } from './sons.js';

export function tocarIntroducaoProva(duracao = 3300) {
  return new Promise(resolve => {
    const palco = document.createElement('div');
    palco.className = 'apresentacao intro-prova';
    palco.style.backgroundImage = 'url(midia/prova/tempestade.webp)';
    const video = document.createElement('video');
    Object.assign(video, { src: 'midia/prova/introducao.mp4', muted: true, playsInline: true, autoplay: true, preload: 'auto' });
    video.setAttribute('playsinline', '');
    video.className = 'apresentacao-video';
    palco.append(video);
    document.body.append(palco);
    sons.roubo();
    const semVideo = () => {
      if (palco.classList.contains('sem-video')) return;
      palco.classList.add('sem-video');
      video.remove();
      palco.insertAdjacentHTML('beforeend', '<div class="apresentacao-nome"><small>Atenção</small><strong>PROVA SURPRESA</strong></div>');
    };
    video.addEventListener('error', semVideo);
    video.play?.().catch(semVideo);
    let feito = false;
    const fim = () => {
      if (feito) return;
      feito = true;
      palco.classList.add('saindo');
      setTimeout(() => { palco.remove(); resolve(); }, 350);
    };
    video.addEventListener('ended', fim);
    palco.addEventListener('click', fim);
    setTimeout(fim, duracao + 1500); // garantia
  });
}
