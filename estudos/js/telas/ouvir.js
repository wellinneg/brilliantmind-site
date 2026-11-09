// 🎧 Ouvir (#/ouvir): o celular narra a história/tema do dia; depois, 3 perguntas.
import { el, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { MATERIAS } from '../rodizio.js';
import { carregarEpisodio } from '../conteudo.js';
import { carregarContexto } from './hoje.js';
import { prepararQuiz } from '../quiz.js';
import { rodarQuiz } from '../quiz-ui.js';
import { criarNarradorComAudio } from '../narrador.js';
import { comemorarJogo } from '../comemorar.js';

export async function render(raiz) {
  const { reg } = await carregarContexto();
  if (!reg?.ouvir) { navegar('#/hoje'); return; }
  const ep = await carregarEpisodio(reg.ouvir.ep);
  const m = MATERIAS[ep.materia] || { icone: '🎧', nome: '', cor: '#CEF010' };

  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'),
    el('div', { class: 'ouvir-topo', style: `--cor:${m.cor}` },
      el('span', { class: 'ouvir-icone' }, ep.icone),
      el('div', {}, el('small', {}, `🎧 Ouvir · episódio ${ep.ep} · ~${ep.minutos} min`), el('h1', {}, ep.titulo))));

  const textos = ep.paragrafos.map(p => el('p', { class: 'ouvir-paragrafo' }, p));
  const texto = el('div', { class: 'ouvir-texto' }, textos);
  const area = el('div', {});
  const botaoPerguntas = el('button', { class: 'botao grande', disabled: !reg.ouvir.feito, onclick: iniciarQuiz },
    reg.ouvir.feito ? 'Responder de novo (treino)' : '📝 Responder as 3 perguntas');
  const status = el('p', { class: 'dica' });

  {
    const tocar = el('button', { class: 'botao grande botao-ouvir' }, '▶ Ouvir');
    // 🎙️ Thalita e Antônio se revezam por parágrafo (áudio gravado); sem o arquivo, usa a voz do celular
    const urls = ep.paragrafos.map((_, k) => `midia/ouvir/ep-${String(ep.ep).padStart(2, '0')}-p${k + 1}.mp3`);
    const narrador = criarNarradorComAudio(ep.paragrafos, urls, {
      aoMudar: (i, pausado) => {
        textos.forEach((t, k) => t.classList.toggle('lendo', k === i && !pausado));
        if (i >= 0 && !pausado) textos[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        tocar.textContent = narrador.tocando ? '⏸ Pausar' : (i < 0 ? '🔁 Ouvir de novo' : '▶ Continuar');
      },
      aoTerminar: () => { botaoPerguntas.disabled = false; status.textContent = 'Terminou! Agora responda as perguntas.'; },
    });
    tocar.addEventListener('click', () => { if (narrador.tocando) narrador.pausar(); else narrador.tocar(); tocar.textContent = narrador.tocando ? '⏸ Pausar' : '▶ Continuar'; });
    textos.forEach((t, k) => t.addEventListener('click', () => narrador.irPara(k)));
    const vel = el('select', { 'aria-label': 'Velocidade', onchange: e => narrador.velocidade(Number(e.target.value)) },
      [['0.85', 'Devagar'], ['1', 'Normal'], ['1.2', 'Rápido']].map(([v, n]) => el('option', { value: v, selected: v === '1' }, n)));
    const mostrar = el('label', { class: 'mostrar-texto' }, el('input', { type: 'checkbox', checked: true, onchange: e => texto.classList.toggle('escondido', !e.target.checked) }), ' Mostrar o texto');
    // celular sem voz em português (ou que não sai som): dá para ler e responder do mesmo jeito
    const semSom = el('button', { class: 'link', onclick: () => { narrador.parar(); botaoPerguntas.disabled = false; texto.classList.remove('escondido'); semSom.remove(); status.textContent = 'Leia o texto com atenção e responda.'; } }, 'Sem som? Ler e responder');
    raiz.append(el('div', { class: 'controles-ouvir' }, tocar, vel), mostrar,
      el('p', { class: 'dica' }, 'Toque num parágrafo para ouvir a partir dele. As perguntas liberam no fim do áudio.'), semSom);
    // para a voz quando sair da tela
    addEventListener('hashchange', () => narrador.parar(), { once: true });
  }
  raiz.append(texto, status, botaoPerguntas, area);

  function iniciarQuiz() {
    texto.classList.add('escondido');
    botaoPerguntas.remove();
    rodarQuiz(area, prepararQuiz(ep.perguntas, { ouvir: ep.ep }), async ({ acertos, total, respostas }) => {
      const r = await estado.registrarOuvir(reg, ep.materia, acertos, total, respostas);
      area.replaceChildren();
      if (r.treino) area.append(el('div', { class: 'retorno certo' }, el('strong', {}, `Treino: ${acertos} de ${total}.`)));
      else if (r.aprovado) area.append(el('div', { class: 'celebracao' }, `Você acertou ${acertos} de ${total}! +${reg.ouvir.pontos} 💵`), comemorarJogo(r.jogo));
      else area.append(el('div', { class: 'retorno errado' }, el('strong', {}, `${acertos} de ${total}.`), el('p', {}, 'Dá para ouvir de novo quando quiser. Prestar atenção no áudio é um treino!')));
      area.append(el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
    });
    area.scrollIntoView({ behavior: 'smooth' });
  }
}
