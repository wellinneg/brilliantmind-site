import { el, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { listarDias } from '../db.js';
import { maisErradas } from '../conquistas.js';
import { carregarDia } from '../conteudo.js';
import { prepararQuiz, aplicarAjuda } from '../quiz.js';
import { rodarQuiz } from '../quiz-ui.js';

export async function render(raiz) {
  const perfil = await estado.perfil();
  const top = maisErradas(await listarDias(), perfil.ano, 5);
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'), el('h1', {}, '🔁 Treino das que mais erro'));
  if (!top.length) { raiz.append(el('p', {}, 'Você ainda não errou nenhuma pergunta. Parabéns! 🎉')); return; }
  const questoes = [];
  for (const t of top) {
    const dia = await carregarDia(perfil.ano, t.dia).catch(() => null);
    const q = dia?.blocos[t.bloco]?.quiz?.[t.dificuldade]?.[t.q];
    if (q) questoes.push(q);
  }
  const area = el('div', {});
  raiz.append(el('p', { class: 'subtitulo' }, 'As perguntas que você mais errou, com dica. Treino não vale pontos, vale aprender!'), area);
  rodarQuiz(area, aplicarAjuda(prepararQuiz(questoes, {}), 1), ({ acertos, total }) => {
    area.replaceChildren(
      el('div', { class: 'celebracao' }, `Treino: ${acertos} de ${total}`),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
  });
}
