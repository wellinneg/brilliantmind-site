import * as db from './db.js';
import { novoRegistro, statusDoDia, idRegistro } from './rodizio.js';
import { PONTOS, resultadoQuiz, pontosDoBloco, nivelDeAjuda } from './quiz.js';
import { estatisticas } from './conquistas.js';
import { hojeISO } from './datas.js';
import { registrarMoedas, registrarBonus } from './jogo.js';
import { sincronizarDepois } from './familia.js';
import { ganharTurnoEmpresa } from './empresa.js';

export const perfil = () => db.lerConfig('perfil');

// Cada ano escolar tem o próprio progresso e as próprias revisões pendentes.
const chaveProximo = ano => `proximoDia:${ano}`;
const chavePendentes = ano => `pendentes:${ano}`;
export const proximoDia = async ano => (await db.lerConfig(chaveProximo(ano))) || 1;
export const pendentes = async ano => (await db.lerConfig(chavePendentes(ano))) || [];
const gravarPendentes = (ano, lista) => db.gravarConfig(chavePendentes(ano), lista);

export const REVISOES_POR_DIA = 2;
export const DIAS_PARA_VOLTAR = 2;

export async function trocarAno(ano) {
  const p = await perfil();
  await db.gravarConfig('perfil', { ...p, ano });
}

export async function registroDeHoje(ano, totalDias, hoje = hojeISO()) {
  const existente = await db.lerDia(idRegistro(ano, hoje));
  if (existente) return existente;
  const proximo = await proximoDia(ano);
  if (proximo > totalDias) return null;
  const reg = novoRegistro(ano, hoje, proximo);
  // Se o mesmo dia de conteúdo ficou pela metade antes, aproveita o que já foi feito
  // (blocos, revisões, leitura e escrita). A lição de casa da escola é de cada data e recomeça.
  const anterior = (await db.listarDias())
    .filter(r => r.ano === ano && r.data < hoje && !r.fechado && !r.continuadoEm && r.diaConteudo === proximo)
    .sort((a, b) => b.data.localeCompare(a.data))[0];
  if (anterior) {
    reg.blocos = anterior.blocos.map(b => ({ ...b }));
    reg.revisoes = (anterior.revisoes || []).map(r => ({ ...r }));
    if (anterior.ouvir) reg.ouvir = { ...anterior.ouvir };
    if (anterior.prova) reg.prova = { ...anterior.prova };
    reg.pontos = anterior.pontos;
    anterior.pontos = 0; // os pontos passam para o registro novo, para não contar duas vezes
    reg.audioLeitura = anterior.audioLeitura;
    reg.duracaoLeitura = anterior.duracaoLeitura;
    reg.fotoEscrita = anterior.fotoEscrita;
    reg.fotoDesafio = { ...anterior.fotoDesafio };
    anterior.continuadoEm = hoje;
    await db.gravarDia(anterior);
  } else {
    reg.revisoes = (await pendentes(ano))
      .filter(p => p.voltaNoDia <= proximo)
      .sort((a, b) => a.voltaNoDia - b.voltaNoDia)
      .slice(0, REVISOES_POR_DIA)
      .map(p => ({ pendente: p.id, dia: p.dia, bloco: p.bloco, materia: p.materia, dificuldade: p.dificuldade, ajuda: nivelDeAjuda(p.voltas), feito: false }));
  }
  await db.gravarDia(reg);
  return reg;
}

export async function escolherDificuldade(reg, i, dificuldade) {
  const b = reg.blocos[i];
  if (b.feito || b.dificuldade) return;
  b.dificuldade = dificuldade;
  await db.gravarDia(reg);
}

export async function registrarQuiz(reg, i, materia, dificuldade, acertos, total, errosIdx, respostas = []) {
  const b = reg.blocos[i];
  const r = resultadoQuiz(acertos, total);
  if (b.feito) return { ...r, treino: true }; // refazer é só treino
  Object.assign(b, { materia, dificuldade, feito: true, aprovado: r.aprovado, nota: acertos, erros: errosIdx, respostas });
  if (r.aprovado) {
    b.pontos = pontosDoBloco(r, dificuldade);
    reg.pontos += b.pontos;
    r.jogo = await registrarMoedas({ materia, moedas: b.pontos, dificuldade });
    sincronizarDepois();
  } else {
    const lista = (await pendentes(reg.ano)).filter(p => p.id !== `${reg.diaConteudo}-${i}`);
    lista.push({ id: `${reg.diaConteudo}-${i}`, dia: reg.diaConteudo, bloco: i, materia, dificuldade, voltas: 0, voltaNoDia: reg.diaConteudo + DIAS_PARA_VOLTAR });
    await gravarPendentes(reg.ano, lista);
  }
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
  }
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

export async function fecharDiaSePossivel(reg) {
  if (reg.fechado || !statusDoDia(reg).podeFechar) return false;
  reg.fechado = true;
  reg.fechadoEm = new Date().toISOString();
  reg.pontos += PONTOS.dia;
  await db.gravarDia(reg);
  await registrarBonus(PONTOS.dia);
  await ganharTurnoEmpresa(); // cada dia de estudo fechado vale um dia de negócio
  await db.gravarConfig(chaveProximo(reg.ano), reg.diaConteudo + 1);
  return true;
}

export async function resumo(hoje = hojeISO()) { return estatisticas(await db.listarDias(), hoje); }
