// Tela de um lugar do mapa (#/lugar/<camada:território>): a cena do lugar, quem manda ali,
// o pote de moedas e o botão que leva direto à lição de hoje que conquista o lugar.
import { el, navegar } from '../ui.js';
import { MATERIAS } from '../rodizio.js';
import {
  CAMADAS, RIVAL, EU, lerJogo, donoDe, calcularTerritorio, nomeDoDono, territorioDaMateria, empateDe, proporcaoDe,
} from '../jogo.js';
import { desenharHeroi } from '../herois.js';
import { desenharCena } from '../cenas.js';
import { carregarContexto } from './hoje.js';
import { entrarComLuz } from '../efeitos.js';
import { situacaoDesempate } from '../desempate.js';
import { corDoDono } from '../tabuleiro.js';
import { MINIJOGOS, situacao, recordeDe, formatarTempo, PREMIOS_POR_DIA } from '../minijogos/motor.js';

export async function render(raiz, [id]) {
  const jogo = await lerJogo();
  const k = CAMADAS.findIndex(c => c.territorios.some(t => t.id === id));
  if (!jogo.heroi || k < 0 || k > jogo.camada) { navegar('#/mapa'); return; }
  const camada = CAMADAS[k];
  const t = camada.territorios.find(x => x.id === id);
  const est = calcularTerritorio(jogo, t);
  const dono = donoDe(est);
  const nome = qual => (qual === EU ? `Você (${jogo.apelido || 'herói'})` : (qual === RIVAL.id ? `${RIVAL.icone} ${RIVAL.nome}` : `⭐ ${nomeDoDono(jogo, qual)}`));

  raiz.append(el('button', { class: 'voltar', onclick: () => navegar(`#/mapa/${k}/ir`) }, `← ${camada.icone} ${camada.nome}`));

  // cena com o meu herói na frente e a bandeira de quem manda
  const cena = el('div', { class: 'cena' }, desenharCena(t));
  const heroi = desenharHeroi(jogo.heroi, jogo.usando, 'medio');
  heroi.classList.add('heroi-na-cena');
  cena.append(heroi, el('span', { class: 'bandeira-cena' }, dono === EU ? '🚩' : (dono === RIVAL.id ? RIVAL.icone : (dono ? '⭐' : '🏳️'))));
  raiz.append(cena);

  const usado = camada.pote - est.pote;
  raiz.append(el('section', { class: 'cartao' },
    el('p', { class: 'dono-lugar' }, dono === EU ? '🚩 Este lugar é seu!' : (dono ? `Quem manda aqui: ${nome(dono)}` : (empateDe(est) ? '⚖️ Empate! O lugar está dividido.' : 'Ninguém manda aqui ainda.'))),
    // fatia de cada um (proporção das notas no lugar)
    el('div', { class: 'barra-proporcao' }, proporcaoDe(est).map(f => el('div', { style: `flex:${f.n};background:${corDoDono(jogo, f.id)}`, title: `${nome(f.id)}: ${String(f.pct).replace('.', ',')}%` }))),
    el('p', { class: 'legenda-proporcao' }, proporcaoDe(est).map(f => `${nome(f.id)} ${String(f.pct).replace('.', ',')}%`).join(' · ')),
    el('p', {}, `Matérias que valem aqui: ${t.materias.map(m => `${MATERIAS[m]?.icone} ${MATERIAS[m]?.nome}`).join(', ')}`),
    el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${Math.round((usado / camada.pote) * 100)}%` }), el('span', {}, `pote: restam ${est.pote} de ${camada.pote} 💵`)),
    el('table', { class: 'tabela' },
      el('tr', {}, el('th', {}, 'Quem'), el('th', {}, 'Notas')),
      Object.entries(est.donos).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
        .map(([qual, n]) => el('tr', { class: qual === EU ? 'linha-eu' : '' }, el('td', {}, nome(qual)), el('td', {}, n)))),
    est.pote === 0 && dono !== EU ? el('p', { class: 'caixa-dica' }, '👑 Pote vazio: só uma lição Supremo dessas matérias rouba notas de quem manda aqui!') : null));

  const desemp = situacaoDesempate(jogo, t);
  if (desemp.empate && desemp.euNoEmpate) {
    const outros = desemp.participantes.filter(p => !p.eu).map(p => (p.magnata ? `${RIVAL.icone} ${RIVAL.nome}` : `⭐ ${p.nome}`)).join(' e ');
    raiz.append(el('section', { class: 'cartao cartao-desempate' },
      el('h2', {}, '⚔️ Quer fazer uma disputa em minijogo?'),
      el('p', {}, `Você e ${outros} empataram com ${desemp.notas} notas aqui. Quem vencer a Tabuada relâmpago fica com o lugar.`),
      desemp.eu.jogou
        ? el('p', { class: 'dica' }, desemp.todosJogaram ? 'A disputa já terminou. Veja o resultado.' : `Você já jogou (${desemp.eu.pontos} contas). Esperando ${outros} jogar.`)
        : null,
      el('button', { class: 'botao grande', onclick: () => navegar(`#/desempate/${t.id}`) }, desemp.eu.jogou ? 'Ver a disputa' : '⚔️ Desempatar no minijogo')));
  }
  raiz.append(await caminhoParaConquistar(jogo, t, k));
  raiz.append(await secaoMinijogos(jogo, t));
}

const mostrarRecorde = (tipo, v) => {
  if (v == null) return 'sem recorde';
  if (tipo === 'memoria') return `${v} jogadas`;
  if (tipo === 'cofre') return `${v} tentativas`;
  if (tipo === 'quente') return `${v} palpites`;
  if (['caixa', 'tabuada', 'vf', 'desejo'].includes(tipo)) return `${v} certas`;
  return formatarTempo(v);
};

async function secaoMinijogos(jogo, t) {
  let reg = null;
  try { ({ reg } = await carregarContexto()); } catch { /* sem conteúdo */ }
  const sit = await situacao(reg);
  return el('section', { class: 'cartao minijogos' },
    el('h2', {}, '🎮 Minijogos deste lugar'),
    el('p', { class: 'dica' }, !sit.liberado
      ? '🔒 Liberam depois que você termina os blocos de lição de hoje.'
      : (sit.premiosRestantes ? `Hoje ainda ${sit.premiosRestantes === 1 ? 'vale 1 partida' : `valem ${sit.premiosRestantes} partidas`} com notas (de ${PREMIOS_POR_DIA}). Depois, é por diversão e recorde.` : 'As partidas com notas de hoje acabaram. Jogue para bater o seu recorde!')),
    el('div', { class: 'grade-minijogos' }, Object.entries(MINIJOGOS).map(([tipo, m]) => el('button', {
      class: `minijogo ${sit.liberado ? '' : 'trancado'}`, type: 'button',
      onclick: () => navegar(`#/jogo/${tipo}/${t.id}`),
    }, el('span', { class: 'icone-minijogo' }, sit.liberado ? m.icone : '🔒'), el('strong', {}, m.nome), el('small', {}, m.desc),
      el('small', { class: 'recorde' }, `🏅 ${mostrarRecorde(tipo, recordeDe(jogo, tipo, t.id))}`)))));
}

/** Botões que levam direto à lição (ou revisão) de hoje que vale moedas para este lugar. */
async function caminhoParaConquistar(jogo, t, k) {
  const area = el('section', { class: 'cartao conquistar' }, el('h2', {}, '⚔️ Conquistar'));
  if (k !== jogo.camada) {
    const destino = territorioDaMateria(jogo.camada, t.materias[0]);
    area.append(el('p', { class: 'dica' }, `Você já está em ${CAMADAS[jogo.camada].nome}: agora as lições dessas matérias valem notas em ${destino.icone} ${destino.nome}.`));
  }
  let ctx;
  try { ctx = await carregarContexto(); } catch { ctx = null; }
  if (!ctx?.reg) {
    area.append(el('p', { class: 'dica' }, 'Não há lição de hoje disponível.'));
    return area;
  }
  const { reg, dia } = ctx;
  let algum = false;
  dia.blocos.forEach((b, i) => {
    if (!t.materias.includes(b.materia)) return;
    algum = true;
    const m = MATERIAS[b.materia];
    area.append(reg.blocos[i]?.feito
      ? el('p', {}, `✅ Hoje você já fez ${m.icone} ${b.titulo}.`)
      : el('button', { class: 'botao grande', onclick: e => entrarComLuz(e.currentTarget, () => navegar(`#/licao/${i}`)) }, `⚔️ Conquistar agora: ${m.icone} ${b.titulo}`));
  });
  (reg.revisoes || []).forEach((rv, n) => {
    if (!t.materias.includes(rv.materia) || rv.feito) return;
    algum = true;
    area.append(el('button', { class: 'botao secundario grande', onclick: () => navegar(`#/retorno/${n}`) }, `🔁 Revisão de ${MATERIAS[rv.materia]?.nome} (vale notas aqui)`));
  });
  if (!algum) {
    const nomes = t.materias.map(m => MATERIAS[m]?.nome).join(' ou ');
    area.append(el('p', { class: 'dica' }, `Hoje a trilha não tem lição de ${nomes}. Ela aparece em outro dia; hoje, as lições das outras matérias conquistam outros lugares.`),
      el('button', { class: 'botao secundario grande', onclick: () => navegar('#/hoje') }, 'Ver as lições de hoje'));
  }
  return area;
}
