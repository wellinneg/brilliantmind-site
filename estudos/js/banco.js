// Banco Brilliant: "Selic do jogo". O dinheiro aplicado rende 1% por semana completa (juros
// compostos) e só pode ser resgatado com rendimento no vencimento (30, 60 ou 90 dias).
// Resgate antes do vencimento devolve só o valor aplicado, sem rendimento.
// O rendimento vai para a carteira (loja); não conquista território.
import { lancar } from './jogo.js';
import { hojeISO, somarDias, diasEntre, exibir } from './datas.js';

export const SELIC = { taxaSemana: 0.01, prazos: [30, 60, 90], minimo: 10 };

/** Quanto a aplicação vale numa data (só conta semanas completas, até o vencimento). */
export function valorNaData(ap, data = hojeISO()) {
  const dias = Math.max(0, Math.min(diasEntre(ap.inicio, data), ap.prazo));
  const semanas = Math.floor(dias / 7);
  const valor = Math.floor(ap.valor * (1 + SELIC.taxaSemana) ** semanas);
  return { semanas, valor, rendimento: valor - ap.valor, vencida: diasEntre(ap.vencimento, data) >= 0, faltam: Math.max(0, diasEntre(data, ap.vencimento)) };
}

/** Simulação para mostrar antes de aplicar: quanto volta no vencimento. */
export function simular(valor, prazo) {
  return valorNaData({ valor, prazo, inicio: '2000-01-01', vencimento: somarDias('2000-01-01', prazo) }, somarDias('2000-01-01', prazo));
}

export function aplicar(jogo, valor, prazo, data = hojeISO()) {
  valor = Math.floor(Number(valor));
  if (!SELIC.prazos.includes(prazo)) throw new Error('Escolha 30, 60 ou 90 dias.');
  if (!(valor >= SELIC.minimo)) throw new Error(`O mínimo para aplicar é ${SELIC.minimo}.`);
  if (valor > jogo.carteira) throw new Error(`Você só tem ${jogo.carteira} na carteira.`);
  jogo.aplicacoes ||= [];
  const ap = { id: `ap-${Date.now()}-${jogo.aplicacoes.length}`, valor, prazo, inicio: data, vencimento: somarDias(data, prazo), resgatada: false };
  jogo.aplicacoes.push(ap);
  jogo.carteira -= valor;
  lancar(jogo, { tipo: 'aplicacao', descricao: `🏦 Aplicação Selic ${prazo} dias (vence ${exibir(ap.vencimento)})`, valor: -valor });
  return ap;
}

/** Resgata: no vencimento, com rendimento; antes, só o valor aplicado. */
export function resgatar(jogo, id, data = hojeISO()) {
  const ap = (jogo.aplicacoes || []).find(a => a.id === id && !a.resgatada);
  if (!ap) throw new Error('Aplicação não encontrada.');
  const v = valorNaData(ap, data);
  const recebe = v.vencida ? v.valor : ap.valor;
  ap.resgatada = true; ap.resgatadaEm = data; ap.recebido = recebe; ap.antecipado = !v.vencida;
  jogo.carteira += ap.valor;
  lancar(jogo, { tipo: 'resgate', descricao: `🏦 Resgate Selic ${ap.prazo} dias${v.vencida ? '' : ' (antes do prazo, sem rendimento)'}`, valor: ap.valor });
  if (recebe > ap.valor) {
    jogo.carteira += recebe - ap.valor;
    lancar(jogo, { tipo: 'rendimento', descricao: `📈 Rendimento Selic (${v.semanas} semanas a 1%)`, valor: recebe - ap.valor });
  }
  return { recebe, rendimento: recebe - ap.valor, antecipado: !v.vencida };
}

export function aplicacoesAtivas(jogo, data = hojeISO()) {
  // `valor` continua sendo o que foi aplicado; o valor de hoje vai em `valorHoje`
  return (jogo.aplicacoes || []).filter(a => !a.resgatada).map(a => {
    const { valor: valorHoje, ...resto } = valorNaData(a, data);
    return { ...a, ...resto, valorHoje };
  });
}
