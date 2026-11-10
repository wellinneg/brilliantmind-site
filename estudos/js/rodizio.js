import { diaAnterior, ehFimDeSemana } from './datas.js';

export const ANOS = { '6ano': '6º ano', '7ano': '7º ano', '8ano': '8º ano', '9ano': '9º ano' };

export const MATERIAS = {
  matematica:  { nome: 'Matemática', icone: '➗', cor: '#4FC3F7' },
  portugues:   { nome: 'Português', icone: '📝', cor: '#FFB74D' },
  ciencias:    { nome: 'Ciências', icone: '🔬', cor: '#81C784' },
  financas:    { nome: 'Educação financeira', icone: '💰', cor: '#CEF010' },
  programacao: { nome: 'Programação', icone: '💻', cor: '#B39DDB' },
  excel:       { nome: 'Excel', icone: '📊', cor: '#66BB6A' },
  word:        { nome: 'Word', icone: '📄', cor: '#64B5F6' },
  ingles:      { nome: 'Inglês', icone: '🇬🇧', cor: '#F06292' },
  redes:       { nome: 'Redes sociais e internet segura', icone: '📱', cor: '#4DD0E1' },
  cidadania:   { nome: 'Cidadania e vida prática', icone: '🏛️', cor: '#FFD54F' },
  leis:        { nome: 'Leis', icone: '⚖️', cor: '#FF8A65' },
  empreendedorismo: { nome: 'Empreendedorismo', icone: '🚀', cor: '#BA68C8' },
};

export const DIFICULDADES = {
  fraldinha: { nome: 'Fraldinha', icone: '🍼', pontos: 5, desc: 'Bem fácil, para pegar o jeito' },
  moderado:  { nome: 'Moderado', icone: '🙂', pontos: 10, desc: 'O nível do seu ano' },
  dificil:   { nome: 'Difícil', icone: '💪', pontos: 15, desc: 'Para quem quer suar' },
  supremo:   { nome: 'Supremo', icone: '👑', pontos: 25, desc: 'Desafio de campeão' },
};
export const COM_APROFUNDAMENTO = new Set(['dificil', 'supremo']);

// Português todo dia: nos dias sem Português ele entra como último bloco (desde 09/11/2026).
export const SEMANA = [
  ['matematica', 'financas', 'programacao', 'portugues'],
  ['portugues', 'ingles', 'excel', 'leis'],
  ['ciencias', 'financas', 'redes', 'portugues'],
  ['matematica', 'programacao', 'word', 'empreendedorismo', 'portugues'],
  ['portugues', 'ingles', 'cidadania'],
];

export function materiasDoDia(diaConteudo) { return SEMANA[(diaConteudo - 1) % 5]; }

export const idRegistro = (ano, data) => `${ano}|${data}`;

// 🎧 Ouvir: história/tema narrado nos dias 1, 3 e 5 de cada semana da trilha (episódios em sequência).
export const EPISODIOS_OUVIR = 36;   // padrão; o número real vem do indice.json (a tarefa de reforço pode acrescentar episódios)
let totalEpisodios = EPISODIOS_OUVIR;
export function definirEpisodios(n) { if (Number(n) > 0) totalEpisodios = Number(n); }
export const temOuvir = dia => [0, 2, 4].includes((dia - 1) % 5);
export function episodioDoDia(dia) {
  const idx = [0, 2, 4].indexOf((dia - 1) % 5);
  if (idx < 0) return null;
  return ((Math.floor((dia - 1) / 5) * 3 + idx) % totalEpisodios) + 1;
}
// ⚡ Prova surpresa a cada 3 dias da trilha, com perguntas dos últimos dias; vale 50% a mais.
export const temProva = dia => dia >= 3 && dia % 3 === 0;
export const BONUS_PROVA = 1.5;

export function novoRegistro(ano, data, diaConteudo, nBlocos = materiasDoDia(diaConteudo).length) {
  return {
    id: idRegistro(ano, data), ano, data, diaConteudo,
    blocos: Array.from({ length: nBlocos }, () => ({})), revisoes: [], temLicao: null,
    fotos: { inicio: null, fim: null }, audioLeitura: null, duracaoLeitura: null,
    fotoEscrita: null, fotoDesafio: {}, fechado: false, fechadoEm: null, pontos: 0,
    ouvir: temOuvir(diaConteudo) ? { ep: episodioDoDia(diaConteudo), feito: false } : null,
    prova: temProva(diaConteudo) ? { feito: false } : null,
  };
}

export function statusDoDia(reg) {
  const blocosOk = reg.blocos.every(b => b?.feito === true);
  const revisoesOk = (reg.revisoes || []).every(r => r.feito === true);
  const pais = reg.semEscrita === true;   // 👨‍👩‍👧 Pai/Mãe: sem leitura, sem escrita e sem lição de casa
  const fechamentoOk = pais || (!!reg.audioLeitura && !!reg.fotoEscrita);
  const casaOk = pais || reg.temLicao === false || (reg.temLicao === true && !!reg.fotos.inicio && !!reg.fotos.fim);
  const ouvirOk = !reg.ouvir || reg.ouvir.feito === true;   // dias sem Ouvir/Prova (ou registros antigos): ok
  const provaOk = !reg.prova || reg.prova.feito === true;
  return { blocosOk, revisoesOk, fechamentoOk, casaOk, ouvirOk, provaOk, podeFechar: blocosOk && revisoesOk && fechamentoOk && casaOk && ouvirOk && provaOk };
}

export function calcularSequencia(fechados, hoje) {
  let dia = fechados.has(hoje) ? hoje : diaAnterior(hoje);
  let seq = 0;
  for (let i = 0; i < 3660; i++) {
    if (fechados.has(dia)) seq++;
    else if (!ehFimDeSemana(dia)) break;
    dia = diaAnterior(dia);
  }
  return seq;
}
