// 📊 Resumo de estudo para a família (Firebase): em que dia da trilha a criança está e como foi
// em cada bloco (nota de 0 a 5, nível, se passou). Sem fotos, gravações nem textos.
// A tarefa diária do computador do pai usa isso para criar lições de reforço nos temas fracos
// quando faltarem 10 dias de conteúdo.
import * as db from './db.js';

// Compacto para caber no registro do Firebase (limite de 20 mil caracteres): só os últimos 60 dias,
// cada bloco = [dia, bloco, nota 0–5, nível (f/m/d/s), passou 1/0, revisão 1/0]. A matéria sai do conteúdo.
const NIVEL = { fraldinha: 'f', moderado: 'm', dificil: 'd', supremo: 's' };
const JANELA_DIAS = 60;

/** Resumo do ano atual: { ano, proximoDia, blocos, em }. */
export async function resumoDeEstudo() {
  const perfil = await db.lerConfig('perfil');
  if (!perfil?.ano) return null;
  const ano = perfil.ano;
  const proximoDia = (await db.lerConfig(`proximoDia:${ano}`)) || 1;
  const blocos = [];
  for (const r of await db.listarDias()) {
    if (r.ano !== ano) continue;
    (r.blocos || []).forEach((b, i) => {
      if (b.feito) blocos.push([r.diaConteudo, i, b.nota ?? 0, NIVEL[b.dificuldade] || '', b.aprovado ? 1 : 0, 0]);
    });
    for (const rv of r.revisoes || []) {
      if (rv.feito && rv.dia) blocos.push([rv.dia, rv.bloco, rv.nota ?? 0, NIVEL[rv.dificuldade] || '', rv.aprovado ? 1 : 0, 1]);
    }
  }
  const recentes = blocos.filter(b => b[0] > proximoDia - 1 - JANELA_DIAS).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { ano, proximoDia, blocos: recentes, em: new Date().toISOString().slice(0, 10) };
}
