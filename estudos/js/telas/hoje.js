import { el, navegar, campoFoto } from '../ui.js';
import * as estado from '../estado.js';
import { MATERIAS, DIFICULDADES, ANOS, statusDoDia } from '../rodizio.js';
import { carregarIndice, carregarDia } from '../conteudo.js';
import { alternarSeletorDeSerie } from './serie.js';
import { lerJogo, CAMADAS, moedasNaCamada, metaDaCamada } from '../jogo.js';
import { aplicacoesAtivas } from '../banco.js';

export async function carregarContexto() {
  const perfil = await estado.perfil();
  const indice = await carregarIndice();
  const total = indice.anos[perfil.ano]?.dias || 0;
  const reg = await estado.registroDeHoje(perfil.ano, total);
  const dia = reg ? await carregarDia(perfil.ano, reg.diaConteudo) : null;
  if (reg) for (let d = reg.diaConteudo + 1; d <= Math.min(reg.diaConteudo + 2, total); d++) carregarDia(perfil.ano, d).catch(() => {});
  return { perfil, reg, dia };
}

function atualizar() {
  const raiz = document.getElementById('app');
  const frag = document.createDocumentFragment();
  render(frag).then(() => raiz.replaceChildren(frag));
}

function estadoDoBloco(b) {
  if (!b?.feito) return b?.dificuldade ? `▶ ${DIFICULDADES[b.dificuldade].icone}` : '▶';
  return b.aprovado ? `✅ ${DIFICULDADES[b.dificuldade].icone}` : '🔁';
}

export async function render(raiz) {
  const { perfil, reg, dia } = await carregarContexto();
  const r = await estado.resumo();
  raiz.append(el('header', { class: 'topo' },
    el('h1', {}, `Olá, ${perfil.nome}!`),
    el('div', { class: 'placar' }, el('span', { title: 'Dias seguidos' }, `🔥 ${r.sequencia}`), el('span', { title: 'Pontos' }, `⭐ ${r.pontos}`))));
  const jogo = await lerJogo();
  const cam = CAMADAS[jogo.camada];
  raiz.append(el('button', { class: 'cartao bloco mini-mapa', onclick: () => navegar('#/mapa') },
    el('span', { class: 'icone' }, cam.icone),
    el('span', { class: 'textos' },
      el('small', {}, jogo.heroi ? `Conquista · ${cam.tipo}` : 'Jogo de conquista'),
      el('strong', {}, jogo.heroi ? `${cam.nome}: ${moedasNaCamada(jogo, jogo.camada)}/${metaDaCamada(jogo.camada)} 🪙` : 'Escolha seu herói e conquiste a cidade!')),
    el('span', {}, `🪙 ${jogo.carteira}`)));
  const prontas = aplicacoesAtivas(jogo).filter(a => a.vencida);
  if (prontas.length) {
    raiz.append(el('button', { class: 'cartao bloco aplicacao-pronta', onclick: () => navegar('#/banco') },
      el('span', { class: 'icone' }, '💰'),
      el('span', { class: 'textos' }, el('small', {}, 'Banco Brilliant'), el('strong', {}, `${prontas.length === 1 ? 'Uma aplicação venceu' : `${prontas.length} aplicações venceram`}: resgate com rendimento!`)),
      el('span', {}, '▶')));
  }
  const caixaSerie = el('div', {});
  const linhaSerie = texto => [el('div', { class: 'linha-serie' },
    el('p', { class: 'subtitulo' }, texto),
    el('button', { class: 'botao secundario pequeno', onclick: () => alternarSeletorDeSerie(caixaSerie, perfil.ano, { pedirSenha: true }) }, '🎓 Mudar a série')),
  caixaSerie];

  if (!reg) {
    raiz.append(...linhaSerie(ANOS[perfil.ano]));
    raiz.append(el('section', { class: 'cartao' },
      el('h2', {}, `Você terminou todo o conteúdo do ${ANOS[perfil.ano]} publicado! 🎉`),
      el('p', {}, 'Lições novas chegam em breve. Enquanto isso, revise as perguntas que você mais errou.'),
      el('button', { class: 'botao grande', onclick: () => navegar('#/revisao') }, 'Fazer revisão')));
    return;
  }

  const st = statusDoDia(reg);
  if (reg.fechado) raiz.append(el('div', { class: 'celebracao' }, '🎉 Dia concluído! Volte amanhã para continuar a trilha.'));
  raiz.append(...linhaSerie(`${ANOS[perfil.ano]} · Dia ${reg.diaConteudo} da trilha`));

  dia.blocos.forEach((b, i) => {
    const m = MATERIAS[b.materia];
    const rb = reg.blocos[i];
    const legenda = rb?.feito && !rb.aprovado ? ' · volta com dicas' : '';
    raiz.append(el('button', { class: `cartao bloco ${rb?.feito ? 'feito' : ''}`, style: `--cor:${m.cor}`, onclick: () => navegar(`#/licao/${i}`) },
      el('span', { class: 'icone' }, m.icone),
      el('span', { class: 'textos' }, el('small', {}, `Bloco ${i + 1} · ${m.nome} · ~${b.minutos} min${legenda}`), el('strong', {}, b.titulo)),
      el('span', {}, estadoDoBloco(rb))));
  });

  for (const [k, rv] of (reg.revisoes || []).entries()) {
    const m = MATERIAS[rv.materia] || { icone: '🔁', nome: '', cor: '#CEF010' };
    const original = await carregarDia(perfil.ano, rv.dia).catch(() => null);
    const titulo = original?.blocos[rv.bloco]?.titulo || `Lição do dia ${rv.dia}`;
    raiz.append(el('button', { class: `cartao bloco revisao ${rv.feito ? 'feito' : ''}`, style: `--cor:${m.cor}`, onclick: () => navegar(`#/retorno/${k}`) },
      el('span', { class: 'icone' }, '🔁'),
      el('span', { class: 'textos' },
        el('small', {}, `Revisão · ${m.icone} ${m.nome} · ${DIFICULDADES[rv.dificuldade]?.icone || ''} · ${'💡'.repeat(rv.ajuda || 1)}`),
        el('strong', {}, titulo)),
      el('span', {}, rv.feito ? (rv.aprovado ? '✅' : '🔁') : '▶')));
  }

  raiz.append(el('button', { class: `cartao bloco ${st.fechamentoOk ? 'feito' : ''}`, disabled: !st.blocosOk, onclick: () => navegar('#/fechamento') },
    el('span', { class: 'icone' }, '📖'),
    el('span', { class: 'textos' },
      el('small', {}, 'Fechamento · leitura e escrita · ~10 min'),
      el('strong', {}, st.blocosOk ? dia.leitura.titulo : `Libera depois dos ${dia.blocos.length} blocos`)),
    el('span', {}, st.fechamentoOk ? '✅' : (st.blocosOk ? '▶' : '🔒'))));

  if (st.blocosOk && jogo.heroi) {
    raiz.append(el('button', { class: 'cartao bloco minijogos-liberados', onclick: () => navegar('#/mapa') },
      el('span', { class: 'icone' }, '🎮'),
      el('span', { class: 'textos' }, el('small', {}, 'Lições do dia feitas!'), el('strong', {}, 'Minijogos liberados: escolha um lugar no mapa')),
      el('span', {}, '▶')));
  }
  raiz.append(secaoLicaoDeCasa(reg));
  if (!reg.fechado && st.blocosOk && st.fechamentoOk && st.casaOk && !st.revisoesOk) {
    raiz.append(el('p', { class: 'dica' }, 'Falta só a revisão 🔁 para fechar o dia.'));
  }
}

function secaoLicaoDeCasa(reg) {
  const s = el('section', { class: 'cartao' }, el('h2', {}, '📚 Lição de casa da escola'));
  const marcar = valor => async () => { await estado.definirLicao(reg, valor); atualizar(); };
  if (reg.temLicao === null) {
    s.append(el('p', {}, 'Hoje tem lição de casa (Escola Online, Matific ou outra)?'),
      el('div', { class: 'linha' },
        el('button', { class: 'botao', onclick: marcar(true) }, 'Sim'),
        el('button', { class: 'botao secundario', onclick: marcar(false) }, 'Não')));
  } else if (reg.temLicao === false) {
    s.append(el('p', {}, 'Marcado: hoje não tem lição de casa.'),
      reg.fechado ? null : el('button', { class: 'link', onclick: marcar(true) }, 'Mudar: tem lição sim'));
  } else {
    s.append(el('p', {}, 'Tire uma foto quando começar e outra quando terminar.'),
      campoFoto('Foto do início', !!reg.fotos.inicio, blob => estado.salvarFotoCasa(reg, 'inicio', blob).then(atualizar)),
      campoFoto('Foto do fim', !!reg.fotos.fim, blob => estado.salvarFotoCasa(reg, 'fim', blob).then(atualizar)),
      reg.fechado ? null : el('button', { class: 'link', onclick: marcar(false) }, 'Mudar: hoje não tem lição'));
  }
  return s;
}
