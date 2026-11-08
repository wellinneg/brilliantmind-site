// 🏆 Patrimônio: tudo o que a criança tem, somado. Dinheiro (carteira) + empresa (valuation:
// 5× o lucro + caixa + estoque) + banco (aplicações pelo valor de hoje). Vai para a família pelo registro público.
import { RAMOS } from './empresa.js';
import { aplicacoesAtivas } from './banco.js';
import { RIVAL } from './jogo.js';
import { hojeISO, diasEntre } from './datas.js';

const arred = v => Math.round(v * 100) / 100;

export const VALUATION = { multiplo: 5, dias: 20 };   // vale 5× o lucro dos últimos 20 dias de negócio

/** Valuation da empresa: 5× o lucro recente (prejuízo conta zero) + caixa + estoque pelo custo. */
export function valuationDaEmpresa(emp) {
  if (!emp) return { lucro: 0, peloLucro: 0, caixa: 0, estoque: 0, total: 0 };
  const lucro = arred((emp.historico || []).slice(0, VALUATION.dias).reduce((s, d) => s + (d.lucro || 0), 0));
  const peloLucro = arred(Math.max(0, lucro) * VALUATION.multiplo);
  const caixa = arred(Math.max(0, emp.caixa || 0));
  const estoque = arred((emp.estoque || 0) * (RAMOS[emp.ramo]?.custo || 0));
  return { lucro, peloLucro, caixa, estoque, total: arred(peloLucro + caixa + estoque) };
}
export const valorDaEmpresa = emp => valuationDaEmpresa(emp).total;

export function patrimonioDe(jogo, data = hojeISO()) {
  const dinheiro = Math.max(0, jogo.carteira || 0);
  const empresa = valorDaEmpresa(jogo.empresa);
  const banco = aplicacoesAtivas(jogo, data).reduce((s, a) => s + a.valorHoje, 0);
  return { dinheiro, empresa, banco: arred(banco), total: Math.floor(dinheiro + empresa + banco) };
}

// O Magnata também entra no ranking: começa com 500 e ganha 25 notas por dia desde o início do jogo.
export const MAGNATA_PATRIMONIO = { inicio: '2026-11-09', base: 500, porDia: 25 };
export function patrimonioDoMagnata(data = hojeISO()) {
  const dias = Math.max(0, diasEntre(MAGNATA_PATRIMONIO.inicio, data));
  return MAGNATA_PATRIMONIO.base + dias * MAGNATA_PATRIMONIO.porDia;
}

/** Ranking: eu + irmãos da família (com o patrimônio que mandaram) + o Magnata. Maior primeiro. */
export function rankingDePatrimonio(jogo, data = hojeISO()) {
  const meu = patrimonioDe(jogo, data);
  const lista = [{ id: 'eu', apelido: jogo.apelido || 'Você', heroi: jogo.heroi, usando: jogo.usando, ...meu, eu: true }];
  for (const [id, o] of Object.entries(jogo.outros || {})) {
    if (o?.patrimonio) lista.push({ id, apelido: o.apelido, heroi: o.heroi, usando: o.usando, ...o.patrimonio });
  }
  lista.push({ id: RIVAL.id, apelido: RIVAL.nome, magnata: true, total: patrimonioDoMagnata(data) });
  return lista.sort((a, b) => b.total - a.total || (b.eu ? 1 : 0) - (a.eu ? 1 : 0));
}
