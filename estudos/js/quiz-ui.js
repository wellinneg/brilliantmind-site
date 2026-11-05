import { el } from './ui.js';
import { corrigir } from './quiz.js';

// Questões podem vir com ajuda (revisão): mostrarDica, riscadas (índices) e fixos (ordenar).
export function rodarQuiz(area, questoes, aoTerminar) {
  let j = 0, acertos = 0, inicio = 0;
  const erros = [];
  const respostas = []; // o que a criança marcou e quanto tempo levou, para o painel dos pais

  function mostrar() {
    area.replaceChildren();
    if (j >= questoes.length) return aoTerminar({ acertos, total: questoes.length, erros, respostas });
    const q = questoes[j];
    area.append(el('p', { class: 'contador' }, `Pergunta ${j + 1} de ${questoes.length}`), el('h2', {}, q.pergunta));
    if (q.mostrarDica && q.dica) area.append(el('div', { class: 'caixa-dica' }, el('strong', {}, '💡 Dica: '), q.dica));
    if (q.tipo === 'ordenar') ordenar(q); else escolha(q);
    inicio = Date.now();
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function responder(certo, q, escolhida) {
    if (certo) acertos++; else erros.push(q.origem);
    respostas.push({ q: q.origem?.q ?? j, escolhida, certo, segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)) });
    area.append(
      el('div', { class: `retorno ${certo ? 'certo' : 'errado'}` },
        el('strong', {}, certo ? 'Acertou! 🎉' : 'Não foi dessa vez.'),
        !certo && q.tipo === 'ordenar' ? el('ol', {}, q.itens.map(i => el('li', {}, i))) : null,
        el('p', {}, q.explicacao)),
      el('button', { class: 'botao grande', onclick: () => { j++; mostrar(); } },
        j + 1 < questoes.length ? 'Próxima' : 'Ver resultado'));
  }

  function escolha(q) {
    const riscadas = new Set(q.riscadas || []);
    const botoes = q.alternativas.map((texto, k) => el('button', {
      class: `alternativa ${riscadas.has(k) ? 'riscada' : ''}`,
      disabled: riscadas.has(k),
      onclick: () => {
        botoes.forEach(b => { b.disabled = true; });
        botoes[q.correta].classList.add('certa');
        if (k !== q.correta) botoes[k].classList.add('errada');
        responder(k === q.correta, q, q.alternativas[k]);
      },
    }, texto));
    area.append(el('div', { class: 'alternativas' }, botoes));
  }

  function ordenar(q) {
    const fixos = q.itens.slice(0, q.fixos || 0);
    const escolhidos = [];
    const lista = el('ol', { class: 'ordem' });
    const botoes = q.embaralhados.map(item => el('button', {
      class: 'alternativa',
      onclick: e => {
        escolhidos.push(item);
        e.currentTarget.disabled = true;
        lista.append(el('li', {}, item));
        if (escolhidos.length === q.itens.length) { recomecar.remove(); responder(corrigir(q, escolhidos), q, [...escolhidos]); }
      },
    }, item));
    function inicio() {
      escolhidos.length = 0; lista.replaceChildren();
      botoes.forEach((b, k) => { b.disabled = false; b.classList.remove('riscada'); });
      for (const item of fixos) {
        escolhidos.push(item);
        lista.append(el('li', { class: 'fixo' }, `${item} 📌`));
        const b = botoes[q.embaralhados.indexOf(item)];
        b.disabled = true; b.classList.add('riscada');
      }
    }
    const recomecar = el('button', { class: 'link', onclick: inicio }, 'Recomeçar a ordem');
    area.append(el('p', { class: 'dica' }, fixos.length ? `Toque nos itens na ordem certa. ${fixos.length === 1 ? 'O primeiro já está' : 'Os primeiros já estão'} no lugar 📌.` : 'Toque nos itens na ordem certa.'),
      lista, el('div', { class: 'alternativas' }, botoes), recomecar);
    inicio();
  }

  mostrar();
}
