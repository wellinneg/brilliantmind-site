// Apresentação do personagem (~3 s) quando a criança escolhe o animal: toca o vídeo criado
// pelo Wellington (já traz o nome do animal) e mostra o apelido embaixo. Toque pula.
// Sem vídeo (sem internet na 1ª vez, navegador antigo), mostra a imagem entrando em 3D.
import { HEROIS } from './jogo.js';
import { desenharHeroi, videoDoHeroi, cenarioDoHeroi } from './herois.js';
import { sons } from './sons.js';

export function apresentarPersonagem(heroi, apelido, duracao = 3300) {
  return new Promise(resolve => {
    const h = HEROIS[heroi];
    const palco = document.createElement('div');
    palco.className = 'apresentacao';
    palco.style.backgroundImage = `url(${cenarioDoHeroi(heroi)})`;
    const video = document.createElement('video');
    Object.assign(video, { src: videoDoHeroi(heroi), muted: true, playsInline: true, autoplay: true, preload: 'auto' });
    video.className = 'apresentacao-video';
    video.setAttribute('playsinline', '');
    palco.append(video);
    const apelidoEl = document.createElement('div');
    apelidoEl.className = 'apresentacao-apelido';
    apelidoEl.textContent = apelido;
    palco.append(apelidoEl);
    document.body.append(palco);
    sons.camada();

    // plano B: sem vídeo, o animal entra girando com o nome
    const semVideo = () => {
      if (palco.classList.contains('sem-video')) return;
      palco.classList.add('sem-video');
      video.remove();
      const giro = document.createElement('div');
      giro.className = 'apresentacao-giro';
      giro.append(desenharHeroi(heroi, {}, 'grande'));
      const nome = document.createElement('div');
      nome.className = 'apresentacao-nome';
      nome.innerHTML = `<small>${h.titulo}</small><strong>${h.nome}</strong>`;
      palco.prepend(giro, nome);
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
    setTimeout(fim, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : duracao + 1500); // garantia
  });
}
