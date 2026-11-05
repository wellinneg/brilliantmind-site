import { calcularSequencia, DIFICULDADES } from './rodizio.js';

export const MEDALHAS = [
  { id: 'primeiro-dia', emoji: '👣', nome: 'Primeiro passo', desc: 'Fechou o primeiro dia', teste: e => e.diasFechados >= 1 },
  { id: 'perfeito', emoji: '🎯', nome: 'Gabaritou', desc: 'Acertou 5 de 5 num quiz', teste: e => e.quizzesPerfeitos >= 1 },
  { id: 'supremo', emoji: '👑', nome: 'Coroa suprema', desc: 'Venceu uma lição no Supremo', teste: e => (e.porDificuldade.supremo?.aprovados || 0) >= 1 },
  { id: 'volta-por-cima', emoji: '🔁', nome: 'Volta por cima', desc: 'Venceu uma lição na revisão', teste: e => e.revisoesVencidas >= 1 },
  { id: 'seq-5', emoji: '🔥', nome: 'Semana de fogo', desc: '5 dias seguidos', teste: e => e.recordeSequencia >= 5 },
  { id: 'leitor-10', emoji: '🎙️', nome: 'Voz de leitor', desc: '10 leituras gravadas', teste: e => e.leituras >= 10 },
  { id: 'financas-10', emoji: '💰', nome: 'Mente financeira', desc: '10 lições de finanças', teste: e => (e.porMateria.financas || 0) >= 10 },
  { id: 'supremo-10', emoji: '🏰', nome: 'Rei do Supremo', desc: '10 lições vencidas no Supremo', teste: e => (e.porDificuldade.supremo?.aprovados || 0) >= 10 },
  { id: 'dias-20', emoji: '🏁', nome: 'Trilha completa', desc: '20 dias fechados', teste: e => e.diasFechados >= 20 },
  { id: 'seq-20', emoji: '🚀', nome: 'Imparável', desc: '20 dias seguidos', teste: e => e.recordeSequencia >= 20 },
];

export function estatisticas(registros, hoje) {
  const fechados = registros.filter(r => r.fechado).map(r => r.data);
  const conjunto = new Set(fechados);
  const porMateria = {}, somaNota = {}, qtdNota = {};
  const porDificuldade = Object.fromEntries(Object.keys(DIFICULDADES).map(d => [d, { feitos: 0, aprovados: 0 }]));
  let quizzesPerfeitos = 0, revisoesVencidas = 0;
  const ativos = registros.filter(r => !r.continuadoEm); // dia continuado conta só uma vez
  for (const r of ativos) {
    for (const b of r.blocos) {
      if (!b.feito || !b.materia) continue;
      if (b.aprovado) porMateria[b.materia] = (porMateria[b.materia] || 0) + 1;
      if (b.nota === 5) quizzesPerfeitos++;
      somaNota[b.materia] = (somaNota[b.materia] || 0) + b.nota;
      qtdNota[b.materia] = (qtdNota[b.materia] || 0) + 1;
      const d = porDificuldade[b.dificuldade];
      if (d) { d.feitos++; if (b.aprovado) d.aprovados++; }
    }
    for (const rv of r.revisoes || []) if (rv.feito && rv.aprovado) revisoesVencidas++;
  }
  const mediaPorMateria = {};
  for (const m of Object.keys(somaNota)) mediaPorMateria[m] = Math.round((somaNota[m] / (qtdNota[m] * 5)) * 100);
  return {
    diasFechados: fechados.length,
    sequencia: calcularSequencia(conjunto, hoje),
    recordeSequencia: [...conjunto].reduce((max, d) => Math.max(max, calcularSequencia(conjunto, d)), 0),
    pontos: registros.reduce((s, r) => s + (r.pontos || 0), 0),
    porMateria, mediaPorMateria, porDificuldade, quizzesPerfeitos, revisoesVencidas,
    leituras: ativos.filter(r => r.audioLeitura).length,
  };
}

export function medalhasConquistadas(est) { return MEDALHAS.filter(m => m.teste(est)); }

// Perguntas que mais erra (1ª tentativa dos blocos e das revisões), de um ano escolar.
export function maisErradas(registros, ano, limite = 5) {
  const contagem = new Map();
  const somar = (dia, bloco, dificuldade, q) => {
    const chave = `${dia}|${bloco}|${dificuldade}|${q}`;
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  };
  for (const r of registros.filter(x => !x.continuadoEm && x.ano === ano)) {
    r.blocos.forEach((b, bloco) => { if (b.dificuldade) (b.erros || []).forEach(q => somar(r.diaConteudo, bloco, b.dificuldade, q)); });
    (r.revisoes || []).forEach(rv => (rv.erros || []).forEach(q => somar(rv.dia, rv.bloco, rv.dificuldade, q)));
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([chave, vezes]) => {
      const [dia, bloco, dificuldade, q] = chave.split('|');
      return { dia: Number(dia), bloco: Number(bloco), dificuldade, q: Number(q), vezes };
    });
}
