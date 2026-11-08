import { el, navegar, aviso, campoFoto } from '../ui.js';
import * as estado from '../estado.js';
import { MATERIAS, DIFICULDADES, COM_APROFUNDAMENTO } from '../rodizio.js';
import { prepararQuiz } from '../quiz.js';
import { rodarQuiz } from '../quiz-ui.js';
import { carregarContexto } from './hoje.js';
import { comemorarJogo } from '../comemorar.js';
import { tocarIntroducaoProva } from '../intro-prova.js';

// Partes da lição usadas também na revisão (retorno.js).
export function corpoDaLicao(b, comAprofundamento) {
  const m = MATERIAS[b.materia];
  return [
    el('div', {}, el('span', { class: 'etiqueta', style: `--cor:${m.cor}` }, `${m.icone} ${m.nome}`)),
    el('h1', {}, b.titulo),
    ...b.licao.paragrafos.map(p => el('p', {}, p)),
    ...(b.licao.exemplos || []).map(ex => el('div', { class: 'exemplo' },
      el('strong', {}, 'Exemplo: '), ex.enunciado,
      el('details', {}, el('summary', {}, 'Ver resolução'), el('p', {}, ex.resolucao)))),
    comAprofundamento && b.aprofundamento?.length
      ? el('div', { class: 'aprofundamento' }, el('h2', {}, '🔎 Aprofundamento'), ...b.aprofundamento.map(p => el('p', {}, p)))
      : null,
  ];
}

export async function render(raiz, [indice]) {
  const i = Number(indice);
  const { reg, dia } = await carregarContexto();
  if (!reg || !(i >= 0 && i < dia.blocos.length)) { navegar('#/hoje'); return; }
  const b = dia.blocos[i];
  const rb = reg.blocos[i];

  raiz.append(el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'));
  const corpo = el('div', {});
  raiz.append(corpo);
  const desenharCorpo = dif => corpo.replaceChildren(...corpoDaLicao(b, COM_APROFUNDAMENTO.has(dif)).filter(Boolean));
  desenharCorpo(rb.dificuldade);

  if (b.desafio_pratico) {
    raiz.append(el('div', { class: 'desafio' },
      el('h2', {}, '🛠️ Desafio prático'), el('p', {}, b.desafio_pratico),
      campoFoto('Foto do resultado (opcional)', !!reg.fotoDesafio?.[i], blob => estado.salvarDesafio(reg, i, blob).then(() => aviso('Foto salva!')))));
  }

  const area = el('div', {});
  raiz.append(area);

  if (rb.dificuldade) mostrarInicio(rb.dificuldade);
  else escolherNivel();

  function escolherNivel() {
    area.replaceChildren(
      el('h2', {}, 'Escolha o nível do quiz'),
      el('p', { class: 'dica' }, 'Depois de começar, o nível desta lição fica travado. Difícil e Supremo mostram um aprofundamento antes do quiz.'),
      el('div', { class: 'niveis' }, Object.entries(DIFICULDADES).map(([chave, d]) => el('button', {
        class: `nivel nivel-${chave}`,
        onclick: async () => {
          await estado.escolherDificuldade(reg, i, chave);
          desenharCorpo(chave);
          if (COM_APROFUNDAMENTO.has(chave)) { mostrarInicio(chave); corpo.querySelector('.aprofundamento')?.scrollIntoView({ behavior: 'smooth' }); }
          else iniciar(chave);
        },
      }, el('span', { class: 'emoji' }, d.icone), el('strong', {}, d.nome), el('small', {}, d.desc), el('small', {}, `+${d.pontos} ⭐`)))));
  }

  function mostrarInicio(dif) {
    const d = DIFICULDADES[dif];
    area.replaceChildren(
      el('p', { class: 'subtitulo' }, `Nível escolhido: ${d.icone} ${d.nome}`),
      el('button', { class: 'botao grande', onclick: () => iniciar(dif) },
        rb.feito ? 'Refazer o quiz (só para treinar)' : 'Começar o quiz'));
  }

  function iniciar(dif) {
    rodarQuiz(area, prepararQuiz(b.quiz[dif], { dia: reg.diaConteudo, bloco: i, dificuldade: dif }), async ({ acertos, total, erros, respostas }) => {
      const r = await estado.registrarQuiz(reg, i, b.materia, dif, acertos, total, erros.map(o => o.q), respostas);
      area.replaceChildren();
      if (r.treino) {
        area.append(el('div', { class: 'retorno certo' }, el('strong', {}, `Treino: ${acertos} de ${total}.`), el('p', {}, 'Treino não muda a nota nem os pontos.')),
          el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
      } else if (r.aprovado) {
        area.append(el('div', { class: 'celebracao' }, `Você acertou ${acertos} de ${total}! +${reg.blocos[i].pontos} ⭐`),
          comemorarJogo(r.jogo),
          el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
      } else {
        area.append(el('div', { class: 'retorno errado' },
          el('strong', {}, `Você acertou ${acertos} de ${total}.`),
          el('p', {}, 'Tudo bem! Esta lição volta daqui a 2 dias de trilha, com dicas para ajudar. Hoje você pode seguir para o próximo bloco.')),
          el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Seguir em frente'));
      }
      // ⚡ Dia de prova: sem aviso nenhum antes, ela entra logo depois da 1ª lição terminada.
      if (!r.treino && reg.prova && !reg.prova.revelada) {
        await estado.revelarProva(reg);
        setTimeout(async () => { await tocarIntroducaoProva(); navegar('#/prova'); }, 1800);
      }
    });
  }
}
