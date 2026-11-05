// Revisão de uma lição que não deu certo antes: mesmo nível, com dicas e alternativas riscadas.
import { el, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { DIFICULDADES } from '../rodizio.js';
import { prepararQuiz, aplicarAjuda } from '../quiz.js';
import { rodarQuiz } from '../quiz-ui.js';
import { comemorarJogo } from '../comemorar.js';
import { carregarDia } from '../conteudo.js';
import { carregarContexto } from './hoje.js';
import { corpoDaLicao } from './licao.js';

const AJUDAS = {
  1: 'Cada pergunta tem uma dica 💡.',
  2: 'Cada pergunta tem uma dica 💡 e uma alternativa errada já riscada.',
  3: 'Cada pergunta tem uma dica 💡 e duas alternativas erradas já riscadas.',
};

export async function render(raiz, [indice]) {
  const k = Number(indice);
  const { perfil, reg } = await carregarContexto();
  const rv = reg?.revisoes?.[k];
  if (!rv) { navegar('#/hoje'); return; }
  const original = await carregarDia(perfil.ano, rv.dia);
  const b = original.blocos[rv.bloco];
  const d = DIFICULDADES[rv.dificuldade];

  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'),
    el('div', { class: 'caixa-dica' }, el('strong', {}, '🔁 Revisão com ajuda. '), `Nível ${d.icone} ${d.nome}. ${AJUDAS[rv.ajuda] || AJUDAS[1]} Releia a lição com calma.`),
    ...corpoDaLicao(b, true).filter(Boolean));

  const area = el('div', {});
  raiz.append(area);
  area.append(el('button', { class: 'botao grande', onclick: iniciar }, rv.feito ? 'Refazer (só para treinar)' : 'Começar a revisão'));

  function iniciar() {
    const questoes = aplicarAjuda(prepararQuiz(b.quiz[rv.dificuldade], { dia: rv.dia, bloco: rv.bloco, dificuldade: rv.dificuldade }), rv.ajuda || 1);
    rodarQuiz(area, questoes, async ({ acertos, total, erros, respostas }) => {
      const r = await estado.registrarRevisao(reg, k, acertos, total, erros.map(o => o.q), respostas);
      area.replaceChildren();
      if (r.treino) area.append(el('div', { class: 'retorno certo' }, el('strong', {}, `Treino: ${acertos} de ${total}.`)));
      else if (r.aprovado) area.append(el('div', { class: 'celebracao' }, `Volta por cima! ${acertos} de ${total}. +${rv.pontos} ⭐`), comemorarJogo(r.jogo));
      else area.append(el('div', { class: 'retorno errado' }, el('strong', {}, `${acertos} de ${total}.`),
        el('p', {}, 'Ainda não foi. A lição volta de novo daqui a 2 dias, com mais ajuda. Se quiser, peça ajuda a alguém de casa.')));
      area.append(el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
    });
  }
}
