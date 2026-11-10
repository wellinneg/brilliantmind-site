import { el, navegar, campoFoto } from '../ui.js';
import * as estado from '../estado.js';
import { lerMidia } from '../db.js';
import { statusDoDia } from '../rodizio.js';
import { suportaGravacao, iniciarGravacao } from '../audio.js';
import { carregarContexto } from './hoje.js';

function atualizar() {
  const raiz = document.getElementById('app');
  const frag = document.createDocumentFragment();
  render(frag).then(() => raiz.replaceChildren(frag));
}

export async function render(raiz) {
  const { reg, dia } = await carregarContexto();
  if (!reg || !statusDoDia(reg).blocosOk) { navegar('#/hoje'); return; }
  const st = statusDoDia(reg);
  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'),
    el('h1', {}, '📖 Leitura em voz alta'),
    el('h2', {}, dia.leitura.titulo),
    ...dia.leitura.texto.split('\n\n').map(p => el('p', { class: 'texto-leitura' }, p)),
    gravador(reg),
    ...(reg.semEscrita ? [] : [          // 👨‍👩‍👧 Pai/Mãe não tem a lição escrita
      el('h1', {}, '✍️ Escrita'),
      el('p', {}, dia.escrita.proposta),
      el('p', { class: 'dica' }, 'Escreva no caderno, com letra caprichada. Depois tire a foto da folha.'),
      campoFoto('Foto da escrita', !!reg.fotoEscrita, blob => estado.salvarEscrita(reg, blob).then(atualizar))]));
  if (st.fechamentoOk) {
    raiz.append(
      el('div', { class: 'celebracao' }, reg.fechado ? '🎉 Dia concluído!' : 'Fechamento feito! Falta só a lição de casa na tela Hoje.'),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
  }
}

function gravador(reg) {
  const caixa = el('div', { class: 'gravador' });
  if (!suportaGravacao()) {
    caixa.append(el('p', { class: 'erro' }, 'Este celular não permite gravar áudio pelo app. Avise o seu responsável.'));
    return caixa;
  }
  const status = el('p', {}, reg.audioLeitura
    ? `✅ Leitura gravada (${reg.duracaoLeitura} s). Pode ouvir ou gravar de novo.`
    : 'Aperte "Gravar" e leia o texto em voz alta, com calma.');
  const player = el('audio', { controls: true, hidden: !reg.audioLeitura });
  if (reg.audioLeitura) lerMidia(reg.audioLeitura).then(m => { if (m) player.src = URL.createObjectURL(m.blob); });
  let sessao = null, relogio = null;
  const botao = el('button', { class: 'botao grande' }, reg.audioLeitura ? '🎙 Gravar de novo' : '🎙 Gravar');
  botao.addEventListener('click', async () => {
    if (sessao) { botao.disabled = true; sessao.parar(); return; }
    try { sessao = await iniciarGravacao(); }
    catch {
      status.textContent = 'Não consegui usar o microfone. Toque nos 3 pontinhos (ou no cadeado) → Permissões → Microfone → Permitir. Depois tente de novo.';
      return;
    }
    botao.textContent = '⏹ Parar'; botao.classList.add('gravando');
    const t0 = Date.now();
    relogio = setInterval(() => { status.textContent = `🔴 Gravando… ${Math.round((Date.now() - t0) / 1000)} s`; }, 500);
    sessao.fim.then(async ({ blob, duracaoSeg }) => {
      clearInterval(relogio); sessao = null;
      if (duracaoSeg < 10) {
        botao.disabled = false; botao.classList.remove('gravando'); botao.textContent = '🎙 Gravar';
        status.textContent = 'Gravação muito curta. Leia o texto inteiro em voz alta e grave de novo.';
        return;
      }
      await estado.salvarLeitura(reg, blob, duracaoSeg);
      atualizar();
    });
  });
  caixa.append(status, botao, player);
  return caixa;
}
