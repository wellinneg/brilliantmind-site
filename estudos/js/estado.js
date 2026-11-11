import * as db from './db.js';
import { novoRegistro, statusDoDia, idRegistro, materiasDoDia } from './rodizio.js';
import { PONTOS, resultadoQuiz, pontosDoBloco, nivelDeAjuda } from './quiz.js';
import { estatisticas } from './conquistas.js';
import { hojeISO, ehFimDeSemana, somarDias } from './datas.js';
import { registrarMoedas, registrarBonus } from './jogo.js';
import { sincronizarDepois } from './familia.js';
import { ganharTurnoEmpresa } from './empresa.js';
import { registrarEvento } from './missoes.js';

export const perfil = () => db.lerConfig('perfil');

// Cada ano escolar tem o próprio progresso e as próprias revisões pendentes.
const chaveProximo = ano => `proximoDia:${ano}`;
const chavePendentes = ano => `pendentes:${ano}`;
export const proximoDia = async ano => (await db.lerConfig(chaveProximo(ano))) || 1;
export const pendentes = async ano => (await db.lerConfig(chavePendentes(ano))) || [];
const gravarPendentes = (ano, lista) => db.gravarConfig(chavePendentes(ano), lista);

export const REVISOES_POR_DIA = 2;
// 📌 Lições atrasadas: o calendário não para (como na escola). Dia não terminado conta falta e as lições
// que ficaram entram nos dias seguintes, no máximo ATRASADAS_POR_DIA por dia, das mais antigas para as novas.
export const ATRASADAS_POR_DIA = 2;
const chaveAtrasadas = ano => `atrasadas:${ano}`;
export const atrasadas = async ano => (await db.lerConfig(chaveAtrasadas(ano))) || [];
const chaveLicao = a => `${a.dia}-${a.bloco}`;

/**
 * Fecha o que ficou para trás antes de começar o dia de hoje:
 * 1) dia começado e não terminado: fica encerrado (falta, se for dia de semana) e as lições não feitas viram atrasadas;
 * 2) dia de semana sem nada registrado (não abriu o app): conta falta e as lições daquele dia viram atrasadas.
 * Fim de semana sem estudo não conta falta nem gasta dia da trilha.
 */
export async function lancarFaltas(ano, totalDias, hoje = hojeISO()) {
  const regs = (await db.listarDias()).filter(r => r.ano === ano && r.data < hoje);
  if (!regs.length) return;                    // ainda não começou a trilha: nada a cobrar
  const fila = await atrasadas(ano);
  const naFila = new Set(fila.map(chaveLicao));
  const novas = [];
  const juntar = a => { if (!naFila.has(chaveLicao(a))) { naFila.add(chaveLicao(a)); novas.push({ dia: a.dia, bloco: a.bloco }); } };
  let proximo = await proximoDia(ano);
  for (const r of regs.filter(x => !x.fechado && !x.encerrado && !x.continuadoEm).sort((a, b) => a.data.localeCompare(b.data))) {
    if (statusDoDia(r).podeFechar) { await fecharDiaSePossivel(r); if (r.diaConteudo >= proximo) proximo = r.diaConteudo + 1; continue; }
    for (const a of r.atrasadas || []) if (!a.feito) juntar(a);          // as atrasadas que voltaram, primeiro
    r.blocos.forEach((b, i) => { if (!b?.feito) juntar({ dia: r.diaConteudo, bloco: i }); });
    r.encerrado = true;
    r.falta = !ehFimDeSemana(r.data);
    await db.gravarDia(r);
    if (r.diaConteudo >= proximo) proximo = r.diaConteudo + 1;
  }
  const ultima = regs.map(r => r.data).sort().pop();
  for (let d = somarDias(ultima, 1); d < hoje; d = somarDias(d, 1)) {
    if (ehFimDeSemana(d) || proximo > totalDias) continue;
    const f = novoRegistro(ano, d, proximo);
    Object.assign(f, { encerrado: true, falta: true, semAbrir: true, ouvir: null, prova: null });
    await db.gravarDia(f);
    materiasDoDia(proximo).forEach((_, i) => juntar({ dia: proximo, bloco: i }));
    proximo++;
  }
  const ordem = (a, b) => a.dia - b.dia || a.bloco - b.bloco;
  await db.gravarConfig(chaveAtrasadas(ano), [...fila, ...novas].sort(ordem));
  await db.gravarConfig(chaveProximo(ano), proximo);
}

/** Faltas entre o último dia em que estudou e hoje (para o aviso da tela Hoje): ['ontem', '10/11', ...]. */
export async function faltasRecentes(ano, hoje = hojeISO()) {
  const regs = (await db.listarDias()).filter(r => r.ano === ano && r.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
  const lista = [];
  for (const r of regs) {
    if (!r.falta) break;
    lista.push(r.data === somarDias(hoje, -1) ? 'Ontem' : `O dia ${r.data.slice(8)}/${r.data.slice(5, 7)}`);
  }
  return lista;
}

// Um "bloco" do dia pode ser um bloco normal (índice 0, 1, ...) ou uma lição atrasada ("a0", "a1", ...).
const ehAtrasada = i => String(i).startsWith('a');
export const blocoDoRegistro = (reg, i) => (ehAtrasada(i) ? reg.atrasadas?.[Number(String(i).slice(1))] : reg.blocos[i]);
const origemDe = (reg, i) => (ehAtrasada(i) ? { dia: blocoDoRegistro(reg, i).dia, bloco: blocoDoRegistro(reg, i).bloco } : { dia: reg.diaConteudo, bloco: i });
export const DIAS_PARA_VOLTAR = 2;

export async function trocarAno(ano) {
  const p = await perfil();
  await db.gravarConfig('perfil', { ...p, ano });
}

/** Se o conteúdo do dia tem outro número de blocos (ex.: entrou Português), o registro se ajusta sem perder o que foi feito. */
export async function ajustarBlocos(reg, n) {
  if (!n || reg.blocos.length === n) return reg;
  reg.blocos = Array.from({ length: n }, (_, i) => reg.blocos[i] || {});
  await db.gravarDia(reg);
  return reg;
}

export async function registroDeHoje(ano, totalDias, hoje = hojeISO()) {
  const existente = await db.lerDia(idRegistro(ano, hoje));
  if (existente) return existente;
  await lancarFaltas(ano, totalDias, hoje);
  const proximo = await proximoDia(ano);
  if (proximo > totalDias) return null;
  const reg = novoRegistro(ano, hoje, proximo);
  reg.revisoes = (await pendentes(ano))
    .filter(p => p.voltaNoDia <= proximo)
    .sort((a, b) => a.voltaNoDia - b.voltaNoDia)
    .slice(0, REVISOES_POR_DIA)
    .map(p => ({ pendente: p.id, dia: p.dia, bloco: p.bloco, materia: p.materia, dificuldade: p.dificuldade, ajuda: nivelDeAjuda(p.voltas), feito: false }));
  const fila = await atrasadas(ano);
  reg.atrasadas = fila.slice(0, ATRASADAS_POR_DIA).map(a => ({ dia: a.dia, bloco: a.bloco }));
  await db.gravarConfig(chaveAtrasadas(ano), fila.slice(ATRASADAS_POR_DIA));
  await db.gravarDia(reg);
  return reg;
}

export async function escolherDificuldade(reg, i, dificuldade) {
  const b = blocoDoRegistro(reg, i);
  if (b.feito || b.dificuldade) return;
  b.dificuldade = dificuldade;
  await db.gravarDia(reg);
}

export async function registrarQuiz(reg, i, materia, dificuldade, acertos, total, errosIdx, respostas = []) {
  const b = blocoDoRegistro(reg, i);
  const o = origemDe(reg, i);
  const r = resultadoQuiz(acertos, total);
  if (b.feito) return { ...r, treino: true }; // refazer é só treino
  Object.assign(b, { materia, dificuldade, feito: true, aprovado: r.aprovado, nota: acertos, total, erros: errosIdx, respostas });
  if (r.aprovado) {
    b.pontos = pontosDoBloco(r, dificuldade);
    reg.pontos += b.pontos;
    r.jogo = await registrarMoedas({ materia, moedas: b.pontos, dificuldade });
    sincronizarDepois();
    await registrarEvento('notas', { valor: b.pontos });
    if (r.jogo?.conquistou) await registrarEvento('conquista');
  } else {
    const lista = (await pendentes(reg.ano)).filter(p => p.id !== `${o.dia}-${o.bloco}`);
    lista.push({ id: `${o.dia}-${o.bloco}`, dia: o.dia, bloco: o.bloco, materia, dificuldade, voltas: 0, voltaNoDia: reg.diaConteudo + DIAS_PARA_VOLTAR });
    await gravarPendentes(reg.ano, lista);
  }
  await registrarEvento('licao', { dificuldade, aprovado: r.aprovado, nota: acertos });
  await gravarEFechar(reg);
  return r;
}

export async function registrarRevisao(reg, k, acertos, total, errosIdx, respostas = []) {
  const rv = reg.revisoes[k];
  const r = resultadoQuiz(acertos, total);
  if (rv.feito) return { ...r, treino: true };
  Object.assign(rv, { feito: true, aprovado: r.aprovado, nota: acertos, erros: errosIdx, respostas });
  const lista = await pendentes(reg.ano);
  const p = lista.find(x => x.id === rv.pendente);
  if (p) {
    if (r.aprovado) {
      rv.pontos = pontosDoBloco(r, p.dificuldade, { bonusPerfeito: false });
      reg.pontos += rv.pontos;
      r.jogo = await registrarMoedas({ materia: p.materia, moedas: rv.pontos, dificuldade: p.dificuldade });
      sincronizarDepois();
      await registrarEvento('notas', { valor: rv.pontos });
      if (r.jogo?.conquistou) await registrarEvento('conquista');
      lista.splice(lista.indexOf(p), 1);
    } else {
      p.voltas += 1;
      p.voltaNoDia = reg.diaConteudo + DIAS_PARA_VOLTAR;
    }
    await gravarPendentes(reg.ano, lista);
  }
  await gravarEFechar(reg);
  return r;
}

/** ⚡ A prova surpresa aparece (no Hoje) só depois que entra pela 1ª vez. */
export async function revelarProva(reg) {
  if (!reg.prova || reg.prova.revelada) return;
  reg.prova.revelada = true;
  await db.gravarDia(reg);
}

/** 🎧 Ouvir: 3 perguntas; com 2 ou mais certas ganha 10 (+5 se acertar as 3). */
export async function registrarOuvir(reg, materia, acertos, total, respostas = []) {
  const r = resultadoQuiz(acertos, total, 2);
  if (!reg.ouvir || reg.ouvir.feito) return { ...r, treino: true };
  Object.assign(reg.ouvir, { feito: true, aprovado: r.aprovado, nota: acertos, total, respostas });
  if (r.aprovado) {
    reg.ouvir.pontos = 10 + (acertos === total ? PONTOS.perfeito : 0);
    reg.pontos += reg.ouvir.pontos;
    r.jogo = await registrarMoedas({ materia, moedas: reg.ouvir.pontos, dificuldade: 'moderado' });
    sincronizarDepois();
    await registrarEvento('notas', { valor: reg.ouvir.pontos });
  }
  await registrarEvento('ouvir');
  await gravarEFechar(reg);
  return r;
}

/**
 * ⚡ Prova surpresa: cada acerto vale os pontos da pergunta (nível × 1,5); acertar tudo dá +10.
 * `perguntas` = [{ materia, valor }] na ordem do quiz; `respostas` vêm do quiz (q = índice).
 */
export async function registrarProva(reg, perguntas, respostas) {
  if (!reg.prova || reg.prova.feito) return { treino: true };
  const acertos = respostas.filter(x => x.certo).length;
  const porMateria = {};
  for (const x of respostas) if (x.certo) {
    const p = perguntas[x.q];
    porMateria[p.materia] = (porMateria[p.materia] || 0) + p.valor;
  }
  let pontos = Math.round(Object.values(porMateria).reduce((a, b) => a + b, 0));
  const perfeita = acertos === perguntas.length;
  if (perfeita) pontos += 10;
  Object.assign(reg.prova, { feito: true, nota: acertos, total: perguntas.length, pontos, respostas });
  reg.pontos += pontos;
  let jogo = null;
  // as notas conquistam os lugares das matérias que caíram na prova (o bônus vai para a maior)
  const ordem = Object.entries(porMateria).sort((a, b) => b[1] - a[1]);
  for (const [k, [materia, v]] of ordem.entries()) {
    const notas = Math.round(v) + (k === 0 && perfeita ? 10 : 0);
    const res = await registrarMoedas({ materia, moedas: notas, dificuldade: 'moderado', descricao: '⚡ Prova surpresa' });
    if (!jogo || res.conquistou) jogo = res;
  }
  if (ordem.length) sincronizarDepois();
  await registrarEvento('prova');
  if (pontos) await registrarEvento('notas', { valor: pontos });
  await gravarEFechar(reg);
  return { acertos, total: perguntas.length, pontos, perfeita, jogo };
}

async function salvarMidia(reg, tipo, blob) {
  const id = `${reg.id}:${tipo}`;
  await db.gravarMidia(id, blob, { data: reg.data, ano: reg.ano, tipo });
  return id;
}

async function gravarEFechar(reg) { await db.gravarDia(reg); await fecharDiaSePossivel(reg); }

export async function definirLicao(reg, valor) { reg.temLicao = valor; await gravarEFechar(reg); }
export async function salvarFotoCasa(reg, qual, blob) { reg.fotos[qual] = await salvarMidia(reg, `casa-${qual}`, blob); await gravarEFechar(reg); }
export async function salvarLeitura(reg, blob, duracaoSeg) { reg.audioLeitura = await salvarMidia(reg, 'leitura', blob); reg.duracaoLeitura = duracaoSeg; await gravarEFechar(reg); }
export async function salvarEscrita(reg, blob) { reg.fotoEscrita = await salvarMidia(reg, 'escrita', blob); await gravarEFechar(reg); }
export async function salvarDesafio(reg, i, blob) { reg.fotoDesafio[i] = await salvarMidia(reg, `desafio-${i}`, blob); await db.gravarDia(reg); }

/**
 * 👨‍👩‍👧 Pai/Mãe: se o registro de hoje é só a continuação de um dia anterior que JÁ estava pronto pela regra
 * dos pais (blocos feitos; sem leitura e lição de casa), fecha aquele dia com a data dele e começa o dia
 * seguinte hoje. Devolve o registro de hoje atualizado.
 */
export async function avancarDiaDosPais(reg, totalDias) {
  if (!reg || reg.fechado) return reg;
  const anterior = (await db.listarDias()).find(r => r.ano === reg.ano && r.continuadoEm === reg.data && r.diaConteudo === reg.diaConteudo && !r.fechado);
  if (!anterior) return reg;
  const igual = JSON.stringify(anterior.blocos.map(b => !!b.feito)) === JSON.stringify(reg.blocos.map(b => !!b.feito));
  const prontoAntes = statusDoDia({ ...anterior, semEscrita: true, blocos: reg.blocos, revisoes: reg.revisoes, ouvir: reg.ouvir, prova: reg.prova }).podeFechar;
  if (!igual || !prontoAntes) return reg;   // fez coisa nova hoje ou o dia anterior não estava pronto
  Object.assign(anterior, { semEscrita: true, continuadoEm: null, pontos: reg.pontos, blocos: reg.blocos, revisoes: reg.revisoes, ouvir: reg.ouvir, prova: reg.prova });
  await db.gravarDia(anterior);
  await fecharDiaSePossivel(anterior);
  await db.apagarDia(reg.id);
  const novo = await registroDeHoje(reg.ano, totalDias, reg.data);
  if (novo) { novo.semEscrita = true; await db.gravarDia(novo); }
  return novo;
}

export async function fecharDiaSePossivel(reg) {
  if (reg.fechado || !statusDoDia(reg).podeFechar) return false;
  reg.fechado = true;
  reg.fechadoEm = new Date().toISOString();
  reg.pontos += PONTOS.dia;
  await db.gravarDia(reg);
  await registrarBonus(PONTOS.dia);
  await ganharTurnoEmpresa(); // cada dia de estudo fechado vale um dia de negócio
  await registrarEvento('dia');
  await registrarEvento('notas', { valor: PONTOS.dia });
  await db.gravarConfig(chaveProximo(reg.ano), reg.diaConteudo + 1);
  return true;
}

export async function resumo(hoje = hojeISO()) { return estatisticas(await db.listarDias(), hoje); }
