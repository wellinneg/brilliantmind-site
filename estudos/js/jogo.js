// Jogo de conquista de territórios (etapa 2; a etapa 3 junta os irmãos pelo Firebase).
// As moedas de cada lição saem do pote do território da matéria, na camada atual do jogador.
// Dono do território = quem tem mais moedas ali. Pote vazio: só lição Supremo rouba do dono.
// Personagens, nomes e desenhos são originais da Trilha Brilliant Mind.
import * as db from './db.js';

// Grupos de matérias: o mesmo grupo ocupa a mesma posição em todas as camadas.
export const GRUPOS = [
  ['matematica', 'financas'],
  ['portugues', 'ciencias'],
  ['redes', 'ingles'],
  ['empreendedorismo'],
  ['leis', 'excel', 'word'],
  ['programacao', 'cidadania'],
];

export const CAMADAS = [
  { id: 'bairro', nome: 'Vila Brilliant', tipo: 'Bairro', icone: '🏘️', pote: 80, territorios: [
    ['supermercado', '🛒', 'Supermercado'], ['escola', '🏫', 'Escola e Biblioteca'], ['shopping', '🛍️', 'Shopping'],
    ['bras', '🧵', 'Brás'], ['empresas', '🏢', 'Centro de Empresas'], ['alphaville', '🚀', 'Polo Tech Alphaville']] },
  { id: 'cidade', nome: 'Cidade Brilliant', tipo: 'Cidade', icone: '🏙️', pote: 150, territorios: [
    ['bolsa', '💹', 'Bolsa de Valores'], ['museu', '🔬', 'Museu de Ciências'], ['estudio', '📡', 'Estúdio de TV'],
    ['fabricas', '🏭', 'Polo das Fábricas'], ['forum', '⚖️', 'Fórum e Prefeitura'], ['parque', '💡', 'Parque Tecnológico']] },
  { id: 'estado', nome: 'Estado Brilliant', tipo: 'Estado', icone: '🗺️', pote: 300, territorios: [
    ['financeiro', '🏦', 'Centro Financeiro'], ['universidade', '🎓', 'Universidade'], ['festival', '🎪', 'Festival de Música'],
    ['porto', '🚢', 'Porto de Exportação'], ['assembleia', '🏛️', 'Assembleia'], ['espacial', '🛰️', 'Centro Espacial']] },
  { id: 'pais', nome: 'Brasil', tipo: 'País', icone: '🇧🇷', pote: 500, territorios: [
    ['moeda', '💰', 'Casa da Moeda'], ['biblioteca', '📚', 'Biblioteca Nacional'], ['tv', '📺', 'Rede Nacional de TV'],
    ['rodovias', '🛣️', 'Rodovias do Comércio'], ['congresso', '🏛️', 'Congresso Nacional'], ['aeroespacial', '🛩️', 'Polo Aeroespacial']] },
  { id: 'mundo', nome: 'Mundo', tipo: 'Mundo', icone: '🌍', pote: 1000, territorios: [
    ['wallstreet', '🗽', 'Bolsa de Nova York'], ['alexandria', '🏛️', 'Grande Biblioteca'], ['cinema', '🎬', 'Capital do Cinema'],
    ['seda', '🐫', 'Rota do Comércio'], ['onu', '🌐', 'Sede das Nações'], ['silicio', '💻', 'Vale do Silício']] },
].map(c => ({ ...c, territorios: c.territorios.map(([id, icone, nome], g) => ({ id: `${c.id}:${id}`, icone, nome, grupo: g, materias: GRUPOS[g] })) }));

export const PARA_LIBERAR = 0.6;          // 60% das moedas da camada libera a próxima
export const PARTE_DO_RIVAL = 0.25;       // o rival começa com 25% de cada pote
export const EU = 'eu';
export const RIVAL = { id: 'barao', nome: 'Barão Bagunça', icone: '🎩' };

export const HEROIS = {
  aurora: { nome: 'Aurora', titulo: 'Exploradora' },
  cosmo: { nome: 'Cosmo', titulo: 'Astronauta' },
  sombra: { nome: 'Sombra', titulo: 'Ninja' },
  faisca: { nome: 'Faísca', titulo: 'Inventora' },
};

export const LOJA = [
  { id: 'bone', parte: 'cabeca', icone: '🧢', nome: 'Boné', preco: 30 },
  { id: 'cartola', parte: 'cabeca', icone: '🎩', nome: 'Cartola', preco: 80 },
  { id: 'capacete', parte: 'cabeca', icone: '⛑️', nome: 'Capacete', preco: 120 },
  { id: 'coroa', parte: 'cabeca', icone: '👑', nome: 'Coroa', preco: 300 },
  { id: 'oculos', parte: 'rosto', icone: '🕶️', nome: 'Óculos escuros', preco: 40 },
  { id: 'mascara', parte: 'rosto', icone: '🥽', nome: 'Óculos de inventor', preco: 90 },
  { id: 'mochila', parte: 'costas', icone: '🎒', nome: 'Mochila', preco: 50 },
  { id: 'paraquedas', parte: 'costas', icone: '🪂', nome: 'Paraquedas', preco: 150 },
  { id: 'cachorro', parte: 'amigo', icone: '🐶', nome: 'Cachorro', preco: 100 },
  { id: 'gato', parte: 'amigo', icone: '🐱', nome: 'Gato', preco: 100 },
  { id: 'papagaio', parte: 'amigo', icone: '🦜', nome: 'Papagaio', preco: 160 },
  { id: 'robo', parte: 'amigo', icone: '🤖', nome: 'Robô ajudante', preco: 250 },
];

export function territorioDaMateria(camada, materia) {
  const g = GRUPOS.findIndex(gr => gr.includes(materia));
  return g < 0 ? null : CAMADAS[camada].territorios[g];
}

// O que cada jogador fez fica guardado como "tirou do pote" e "roubou de quem".
// As moedas de cada um num território são CALCULADAS juntando todos os jogadores da família
// (etapa 3): assim cada celular só escreve o próprio registro e ninguém mexe no do outro.
export const PARA_LIBERAR_POR_POTE = 0.1; // ou: sobrou 10% ou menos nos potes da camada

export function novoJogo() {
  return {
    versao: 2, heroi: null, apelido: '', camada: 0, carteira: 0, itens: [], usando: {},
    uid: null, meu: { doPote: {}, roubos: {} }, outros: {}, historico: [],
  };
}

const rivalInicial = camada => Math.round(camada.pote * PARTE_DO_RIVAL);

/** Moedas de cada um e o que sobra no pote de um território, juntando todos os jogadores. */
export function calcularTerritorio(jogo, t) {
  const camada = CAMADAS.find(c => c.territorios.includes(t)) || CAMADAS.find(c => t.id.startsWith(c.id + ':'));
  const inicial = rivalInicial(camada);
  const donos = { [RIVAL.id]: inicial };
  const jogadores = [[EU, jogo.meu], ...Object.entries(jogo.outros || {})];
  const idDe = id => (id === jogo.uid ? EU : id);
  let tirado = 0;
  for (const [id, d] of jogadores) {
    const v = d?.doPote?.[t.id] || 0;
    if (v) { donos[id] = (donos[id] || 0) + v; tirado += v; }
  }
  for (const [id, d] of jogadores) {
    for (const [vitima, n] of Object.entries(d?.roubos?.[t.id] || {})) {
      donos[idDe(vitima)] = (donos[idDe(vitima)] || 0) - n;
      donos[id] = (donos[id] || 0) + n;
    }
  }
  for (const id of Object.keys(donos)) donos[id] = Math.max(0, donos[id]);
  return { pote: Math.max(0, camada.pote - inicial - tirado), donos };
}

export function calcularMapa(jogo) {
  const mapa = {};
  for (const c of CAMADAS) for (const t of c.territorios) mapa[t.id] = calcularTerritorio(jogo, t);
  return mapa;
}

/** Quem manda no território: quem tem mais moedas ali (empate fica com quem já era dono). */
export function donoDe(t, donoAnterior = null) {
  let dono = null, max = 0;
  for (const [id, n] of Object.entries(t.donos)) if (n > max) { dono = id; max = n; }
  if (donoAnterior && (t.donos[donoAnterior] || 0) === max && max > 0) return donoAnterior;
  return dono;
}

export function moedasNaCamada(jogo, camada, jogador = EU) {
  return CAMADAS[camada].territorios.reduce((s, t) => s + (calcularTerritorio(jogo, t).donos[jogador] || 0), 0);
}
export function sobraNaCamada(jogo, camada) {
  return CAMADAS[camada].territorios.reduce((s, t) => s + calcularTerritorio(jogo, t).pote, 0);
}
export const totalDaCamada = camada => CAMADAS[camada].pote * 6;
export const metaDaCamada = camada => Math.ceil(totalDaCamada(camada) * PARA_LIBERAR);

/** A próxima camada libera com 60% das moedas da camada, ou quando os potes quase acabaram. */
export function podeSubir(jogo) {
  if (jogo.camada >= CAMADAS.length - 1) return false;
  return moedasNaCamada(jogo, jogo.camada) >= metaDaCamada(jogo.camada)
    || sobraNaCamada(jogo, jogo.camada) <= totalDaCamada(jogo.camada) * PARA_LIBERAR_POR_POTE;
}

const somar = (obj, chave, n) => { obj[chave] = (obj[chave] || 0) + n; };

/**
 * Lição concluída: as moedas entram na carteira (para a loja) e disputam o território da matéria.
 * Devolve o que aconteceu, para a tela comemorar.
 */
export function ganharMoedas(jogo, { materia, moedas, dificuldade, quando = new Date().toISOString() }) {
  const res = { moedas, territorio: null, doPote: 0, roubou: 0, de: null, conquistou: false, liberou: null };
  if (!(moedas > 0)) return res;
  jogo.carteira += moedas;
  const t = territorioDaMateria(jogo.camada, materia);
  if (!t) return res;
  res.territorio = t;
  const antes = calcularTerritorio(jogo, t);
  const donoAntes = donoDe(antes);
  const doPote = Math.min(moedas, antes.pote);
  if (doPote) somar(jogo.meu.doPote, t.id, doPote);
  res.doPote = doPote;
  const sobra = moedas - doPote;
  if (sobra > 0 && dificuldade === 'supremo') {
    // Pote vazio: o Supremo rouba de quem tem mais moedas ali (que não seja eu).
    const alvo = Object.entries(antes.donos).filter(([id, n]) => id !== EU && n > 0).sort((a, b) => b[1] - a[1])[0];
    if (alvo) {
      const roubo = Math.min(sobra, alvo[1]);
      somar((jogo.meu.roubos[t.id] ||= {}), alvo[0], roubo);
      res.roubou = roubo; res.de = alvo[0]; res.deNome = nomeDoDono(jogo, alvo[0]);
    }
  }
  res.conquistou = donoAntes !== EU && donoDe(calcularTerritorio(jogo, t), donoAntes) === EU;
  if (podeSubir(jogo)) {
    jogo.camada += 1;
    res.liberou = CAMADAS[jogo.camada];
  }
  jogo.historico = [{ quando, materia, moedas, territorio: t.id, doPote, roubou: res.roubou, de: res.de, conquistou: res.conquistou }, ...jogo.historico].slice(0, 50);
  return res;
}

/** Nome para mostrar de qualquer dono (eu, rival ou irmão). */
export function nomeDoDono(jogo, id) {
  if (id === EU) return jogo.apelido || 'Você';
  if (id === RIVAL.id) return RIVAL.nome;
  return jogo.outros?.[id]?.apelido || 'Outro jogador';
}

export function ganharBonus(jogo, moedas) { if (moedas > 0) jogo.carteira += moedas; }

export function comprar(jogo, itemId) {
  const item = LOJA.find(i => i.id === itemId);
  if (!item) throw new Error('Item não existe.');
  if (jogo.itens.includes(itemId)) throw new Error('Você já tem este item.');
  if (jogo.carteira < item.preco) throw new Error(`Faltam ${item.preco - jogo.carteira} moedas.`);
  jogo.carteira -= item.preco;
  jogo.itens.push(itemId);
  jogo.usando[item.parte] = itemId;
  return item;
}

export function alternarItem(jogo, itemId) {
  const item = LOJA.find(i => i.id === itemId);
  if (!item || !jogo.itens.includes(itemId)) return;
  jogo.usando[item.parte] = jogo.usando[item.parte] === itemId ? null : itemId;
}

// ---- gravação (fica na config do IndexedDB, entra na cópia de segurança) ----
export async function lerJogo() {
  const j = await db.lerConfig('jogo');
  return j && j.versao === 2 ? j : novoJogo(); // versão 1 só existiu em teste, antes de publicar
}
export async function gravarJogo(jogo) { await db.gravarConfig('jogo', jogo); }

/** Atalho usado pelo estado: lê, aplica as moedas da lição e grava. */
export async function registrarMoedas(dados) {
  const jogo = await lerJogo();
  const res = ganharMoedas(jogo, dados);
  await gravarJogo(jogo);
  return res;
}
export async function registrarBonus(moedas) {
  const jogo = await lerJogo();
  ganharBonus(jogo, moedas);
  await gravarJogo(jogo);
}
