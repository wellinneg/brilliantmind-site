import * as db from './db.js';
import { novoRegistro, statusDoDia, idRegistro } from './rodizio.js';
import { PONTOS, resultadoQuiz, pontosDoBloco, nivelDeAjuda } from './quiz.js';
import { estatisticas } from './conquistas.js';
import { hojeISO } from './datas.js';
import { registrarMoedas, registrarBonus } from './jogo.js';
import { sincronizarDepois } from './familia.js';

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
  await db.gravarConfig(chaveProximo(reg.ano), reg.diaConteudo + 1);
  return true;
}

export async function resumo(hoje = hojeISO()) { return estatisticas(await db.listarDias(), hoje); }
