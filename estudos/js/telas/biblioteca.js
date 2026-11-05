// Biblioteca dos pais: qualquer lição de qualquer série, sem trava e sem mexer no progresso.
// Mostra a lição inteira, as perguntas dos 4 níveis com a resposta certa e, nos dias que a
// criança já fez, o nível escolhido, a nota e as perguntas que ela errou.
import { el, navegar } from '../ui.js';
import * as db from '../db.js';
import { MATERIAS, DIFICULDADES, ANOS } from '../rodizio.js';
import { carregarIndice, carregarDia } from '../conteudo.js';
import { paisLiberado } from '../sessao-pais.js';
import { exibir } from '../datas.js';
import { corpoDaLicao } from './licao.js';

const LETRAS = ['A', 'B', 'C', 'D'];

export async function render(raiz, [ano, diaTxt]) {
  if (!paisLiberado()) { navegar('#/pais'); return; }
  const perfil = await db.lerConfig('perfil');
  ano = ANOS[ano] ? ano : perfil.ano;
  const dia = Number(diaTxt);
  if (dia >= 1) return renderDia(raiz, ano, dia);

  const indice = await carregarIndice();
  const total = indice.anos[ano]?.dias || 0;
  const feitos = feitosDoAno(await db.listarDias(), ano);
  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/pais') }, '← Painel dos pais'),
    el('h1', {}, '📚 Todas as lições'),
    el('p', { class: 'dica' }, 'Acesso livre para o responsável: abra qualquer dia de qualquer série. Ver uma lição aqui não muda nada no progresso da criança.'),
    el('div', { class: 'opcoes grade' }, Object.entries(ANOS).map(([a, nome]) =>
      el('button', { class: `botao ${a === ano ? '' : 'secundario'}`, onclick: () => navegar(`#/biblioteca/${a}`) }, nome))),
    el('h2', {}, `${ANOS[ano]} · ${total} dias`),
    el('p', { class: 'dica' }, '✅ = a criança já fez esse dia'),
    el('div', { class: 'grade-dias' }, Array.from({ length: total }, (_, k) => k + 1).map(d =>
      el('button', { class: `botao ${feitos.has(d) ? 'feito' : 'secundario'}`, onclick: () => navegar(`#/biblioteca/${ano}/${d}`) },
        `${feitos.has(d) ? '✅ ' : ''}Dia ${d}`))));
}

function feitosDoAno(registros, ano) {
  const s = new Set();
  for (const r of registros) if (r.ano === ano && r.blocos.some(b => b.feito)) s.add(r.diaConteudo);
  return s;
}

/** O que a criança fez em cada bloco deste dia (junta registros continuados) e as revisões dele. */
function historicoDoDia(registros, ano, dia) {
  const blocos = {};
  const revisoes = {};
  for (const r of registros) {
    if (r.ano !== ano) continue;
    if (r.diaConteudo === dia) r.blocos.forEach((b, i) => { if (b.feito) blocos[i] = { ...b, data: r.data }; });
    for (const rv of r.revisoes || []) {
      if (rv.dia === dia && rv.feito) (revisoes[rv.bloco] ||= []).push({ ...rv, data: r.data });
    }
  }
  return { blocos, revisoes };
}

async function renderDia(raiz, ano, dia) {
  const conteudo = await carregarDia(ano, dia).catch(() => null);
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar(`#/biblioteca/${ano}`) }, `← Dias do ${ANOS[ano]}`));
  if (!conteudo) { raiz.append(el('p', { class: 'erro' }, 'Não consegui abrir este dia.')); return; }
  const hist = historicoDoDia(await db.listarDias(), ano, dia);
  raiz.append(el('h1', {}, `${ANOS[ano]} · Dia ${dia}`));

  conteudo.blocos.forEach((b, i) => {
    const m = MATERIAS[b.materia];
    const feito = hist.blocos[i];
    const det = el('details', { class: 'cartao', style: `--cor:${m.cor}` },
      el('summary', {}, `${m.icone} Bloco ${i + 1} · ${b.titulo}${feito ? ` · ${feito.aprovado ? '✅' : '🔁'} ${feito.nota}/5` : ''}`));
    det.append(...corpoDaLicao(b, true).filter(Boolean));
    if (b.desafio_pratico) det.append(el('div', { class: 'desafio' }, el('h2', {}, '🛠️ Desafio prático'), el('p', {}, b.desafio_pratico)));
    if (feito) {
      const nivel = DIFICULDADES[feito.dificuldade];
      det.append(el('div', { class: 'resultado-filho' },
        el('strong', {}, 'O que a criança fez: '),
        `${nivel?.icone || ''} ${nivel?.nome || ''}, ${feito.nota}/5 ${feito.aprovado ? '✅ conseguiu' : '🔁 não conseguiu (volta com dicas)'}${tempoTotal(feito)}`,
        ...(hist.revisoes[i] || []).map(rv => el('div', {}, `🔁 Revisão (ajuda ${rv.ajuda}): ${rv.nota}/5 ${rv.aprovado ? '✅' : '🔁'}${tempoTotal(rv)}`))));
    }
    const tentativas = feito ? [
      { rotulo: `Lição (${exibir(feito.data)})`, ...feito },
      ...(hist.revisoes[i] || []).map((rv, n) => ({ rotulo: `Revisão ${n + 1} (${exibir(rv.data)})`, ...rv, dificuldade: feito.dificuldade })),
    ] : [];
    for (const [chave, d] of Object.entries(DIFICULDADES)) {
      const lista = b.quiz?.[chave] || [];
      const doNivel = tentativas.filter(t => t.dificuldade === chave);
      det.append(el('details', { class: 'nivel-biblioteca', open: doNivel.length > 0 },
        el('summary', {}, `${d.icone} ${d.nome}${doNivel.length ? ' · nível que a criança fez' : ''}`),
        el('ol', {}, lista.map((q, k) => perguntaComResposta(q, k, doNivel)))));
    }
    raiz.append(det);
  });

  raiz.append(el('details', { class: 'cartao' },
    el('summary', {}, `📖 Leitura e escrita · ${conteudo.leitura.titulo}`),
    el('h2', {}, conteudo.leitura.titulo),
    ...String(conteudo.leitura.texto).split(/\n+/).map(p => el('p', {}, p)),
    el('h2', {}, '✍️ Proposta de escrita'),
    el('p', {}, conteudo.escrita.proposta)));
}

function duracao(seg) {
  return seg >= 60 ? `${Math.floor(seg / 60)} min ${seg % 60} s` : `${seg} s`;
}
function tempoTotal(t) {
  const soma = (t.respostas || []).reduce((a, r) => a + r.segundos, 0);
  return soma ? ` · ⏱ ${duracao(soma)} no quiz` : '';
}

/** Uma pergunta com a resposta certa e, embaixo, o que a criança marcou em cada tentativa. */
function perguntaComResposta(q, k, tentativas) {
  const marcas = tentativas.map(t => {
    const r = (t.respostas || []).find(x => x.q === k);
    if (r) {
      const marcou = Array.isArray(r.escolhida) ? r.escolhida.join(' → ') : r.escolhida;
      return el('div', { class: `resposta-filho ${r.certo ? 'certo' : 'errado'}` },
        `${t.rotulo}: ${r.certo ? '✔️' : '❌'} marcou “${marcou}” · ⏱ ${duracao(r.segundos)}`);
    }
    // Dias feitos antes de o app guardar as respostas: só se sabe se errou.
    const errou = (t.erros || []).includes(k);
    return el('div', { class: `resposta-filho ${errou ? 'errado' : 'certo'}` },
      `${t.rotulo}: ${errou ? '❌ errou' : '✔️ acertou'} (resposta e tempo não registrados)`);
  });
  const errouAlguma = marcas.some(m => m.classList.contains('errado'));
  const resposta = q.tipo === 'ordenar'
    ? el('ol', { class: 'ordem-certa' }, q.itens.map(t => el('li', {}, t)))
    : el('ul', { class: 'alternativas-biblioteca' }, q.alternativas.map((a, n) =>
      el('li', { class: n === q.correta ? 'certa' : '' }, `${LETRAS[n]}) ${a}${n === q.correta ? '  ✅' : ''}`)));
  return el('li', { class: `pergunta-biblioteca ${errouAlguma ? 'errou' : ''}` },
    el('p', {}, el('strong', {}, q.pergunta)),
    q.tipo === 'ordenar' ? el('p', { class: 'dica' }, 'Ordem certa:') : null,
    resposta,
    ...marcas,
    el('p', { class: 'dica' }, `💡 Dica: ${q.dica}`),
    el('p', { class: 'dica' }, `📝 Explicação: ${q.explicacao}`));
}
