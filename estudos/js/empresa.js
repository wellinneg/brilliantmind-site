// 🏪 Empresa virtual: a criança abre um negócio com as notas que juntou e toca um "dia de negócio"
// a cada dia de estudo fechado. Ensina na prática: estoque, preço x demanda, custo, equipe registrada
// (salário + encargos), imposto (MEI ou Simples Nacional, simplificados) e lucro.
// O caixa da empresa é separado da carteira do jogador (como na vida real: empresa ≠ dono).
import { lancar, lerJogo, gravarJogo } from './jogo.js';

export const RAMOS = {
  lanchonete: { nome: 'Lanchonete', icone: '🍔', produto: 'lanche', custo: 1, precoRef: 2.5, demanda: 12, perecivel: true,
    desc: 'Vende muito, cada venda dá pouco. Comida que sobra estraga.' },
  roupas: { nome: 'Loja de roupas no Brás', icone: '👕', produto: 'peça', custo: 8, precoRef: 20, demanda: 1.8, perecivel: false,
    desc: 'Vende menos, cada venda dá mais. Roupa que sobra fica no estoque.' },
  celular: { nome: 'Assistência de celular', icone: '📱', produto: 'conserto', custo: 6, precoRef: 25, demanda: 1.2, perecivel: false,
    desc: 'Serviço técnico: a peça custa pouco, o conhecimento vale muito.' },
  video: { nome: 'Estúdio de vídeo', icone: '🎬', produto: 'vídeo', custo: 10, precoRef: 45, demanda: 0.8, perecivel: false,
    desc: 'Poucos clientes por dia, mas cada vídeo é bem pago.' },
};

export const REGRAS = {
  custoAbertura: 20,           // registro da empresa (CNPJ, alvará)
  aporteMinimo: 30,            // dinheiro inicial que o dono coloca no caixa
  encargos: 0.3,               // FGTS, INSS, férias e 13º (≈30% sobre o salário)
  // como os ≈30% se dividem (aproximado, para explicar):
  encargosDetalhe: [['FGTS', 0.08], ['13º salário', 0.0833], ['Férias + 1/3', 0.1111], ['INSS e outros', 0.0256]],
  niveis: {
    iniciante: { nome: 'Iniciante', salario: 6, produtividade: 0.35 },
    experiente: { nome: 'Experiente', salario: 8, produtividade: 0.5 },
    especialista: { nome: 'Especialista', salario: 11, produtividade: 0.7 },
  },
  bonus: [0, 1, 2, 3],         // bonificação por funcionário por dia
  efeitoBonus: [0, 0.15, 0.25, 0.3], // quanto o bônus aumenta a produção (o ganho vai diminuindo)
  experienciaPorDia: 0.01,     // cada dia trabalhado rende +1% (até +20%)
  experienciaMax: 0.2,
  rescisaoDias: 3,             // demitir custa 3 dias de salário (rescisão simplificada)
  propaganda: [0, 3, 7],       // custo por dia: nenhuma, redes sociais, panfleto + redes
  efeitoPropaganda: [0, 0.25, 0.5],
  meiDAS: 1,                   // MEI paga um valor fixo (DAS)
  meiMaxFuncionarios: 1,       // MEI só pode ter 1 funcionário
  meiLimite: 600,              // limite de faturamento do MEI nos últimos 20 dias de negócio (escala do jogo)
  simplesAliquota: 0.06,       // Simples Nacional: % sobre o faturamento (simplificado)
  custoUnidade: 300,           // abrir mais uma unidade
  maxTurnos: 3,                // dias de negócio acumulados no máximo
  sobraPerecivel: 0.7,         // comida: 30% do que sobra estraga
};

const arred = v => Math.round(v * 100) / 100;
export const comEncargos = salario => arred(salario * (1 + REGRAS.encargos));
export const salarioComEncargos = () => comEncargos(REGRAS.niveis.experiente.salario);

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabi', 'Hugo', 'Íris', 'João', 'Kátia', 'Lucas', 'Marina', 'Nilo',
  'Olívia', 'Paulo', 'Rafa', 'Sofia', 'Tiago', 'Vera', 'Wesley', 'Yara', 'Davi', 'Lívia', 'Caio', 'Bia', 'Enzo', 'Lara'];

/** Empresas abertas antes da equipe detalhada: transforma o número de funcionários em pessoas. */
export function normalizarEmpresa(emp) {
  if (!emp) return emp;
  if (!Array.isArray(emp.equipe)) {
    emp.equipe = Array.from({ length: emp.funcionarios || 0 }, (_, k) => ({ id: `f${k}`, nome: NOMES[k], nivel: 'experiente', dias: 0 }));
  }
  emp.bonus ??= 0;
  emp.funcionarios = emp.equipe.length;
  return emp;
}

/** Produção de um funcionário (fração da demanda base que ele atende a mais), com bônus e experiência. */
export function produtividadeDe(f, bonus = 0) {
  const n = REGRAS.niveis[f.nivel] || REGRAS.niveis.experiente;
  return n.produtividade * (1 + REGRAS.efeitoBonus[bonus]) * (1 + Math.min(REGRAS.experienciaMax, (f.dias || 0) * REGRAS.experienciaPorDia));
}
/** Quantos clientes a mais por dia esse funcionário atende. */
export function clientesDoFuncionario(emp, f, bonus = emp.bonus || 0) {
  const r = RAMOS[emp.ramo];
  return r.demanda * emp.unidades * produtividadeDe(f, bonus);
}
export function custoDoFuncionario(f, bonus = 0) {
  const n = REGRAS.niveis[f.nivel] || REGRAS.niveis.experiente;
  return arred(comEncargos(n.salario) + REGRAS.bonus[bonus]);
}
export const custoDaEquipe = (emp, bonus = emp.bonus || 0) => arred((emp.equipe || []).reduce((s, f) => s + custoDoFuncionario(f, bonus), 0));

/** 3 candidatos do dia (os mesmos o dia inteiro). */
export function candidatosDoDia(emp, data) {
  let sem = [...`${emp.nome}|${data}|${emp.dias}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  const aleatorio = () => { sem = (sem * 16807) % 2147483647; return (sem - 1) / 2147483646; };
  const usados = new Set((emp.equipe || []).map(f => f.nome));
  const livres = NOMES.filter(nm => !usados.has(nm));
  const niveis = ['iniciante', 'experiente', 'especialista'];
  return niveis.map((nivel, k) => {
    const nome = livres.splice(Math.floor(aleatorio() * livres.length), 1)[0] || `Candidato ${k + 1}`;
    return { id: `c-${data}-${k}`, nome, nivel };
  });
}

export function contratar(emp, candidato) {
  normalizarEmpresa(emp);
  if (emp.regime === 'mei' && emp.equipe.length >= REGRAS.meiMaxFuncionarios) throw new Error('No MEI só pode ter 1 funcionário. Para ter mais, mude para o Simples Nacional.');
  if (emp.equipe.some(f => f.nome === candidato.nome)) throw new Error(`${candidato.nome} já trabalha na empresa.`);
  emp.equipe.push({ id: `f-${Date.now()}-${emp.equipe.length}`, nome: candidato.nome, nivel: candidato.nivel, dias: 0 });
  emp.funcionarios = emp.equipe.length;
}

/** Demitir custa a rescisão (dias de salário com encargos), paga pelo caixa. */
export function demitir(emp, id) {
  normalizarEmpresa(emp);
  const f = emp.equipe.find(x => x.id === id);
  if (!f) throw new Error('Funcionário não encontrado.');
  const custo = arred(comEncargos(REGRAS.niveis[f.nivel].salario) * REGRAS.rescisaoDias);
  emp.caixa = arred(emp.caixa - custo);
  emp.equipe = emp.equipe.filter(x => x.id !== id);
  emp.funcionarios = emp.equipe.length;
  return custo;
}

export function abrirEmpresa(jogo, { ramo, nome, regime = 'mei', aporte }) {
  const r = RAMOS[ramo];
  if (!r) throw new Error('Escolha o ramo do negócio.');
  if (jogo.empresa) throw new Error('Você já tem uma empresa.');
  nome = String(nome || '').trim().slice(0, 24);
  if (!nome) throw new Error('Dê um nome para a empresa.');
  aporte = Math.floor(Number(aporte));
  if (!(aporte >= REGRAS.aporteMinimo)) throw new Error(`Coloque pelo menos ${REGRAS.aporteMinimo} notas no caixa.`);
  const total = REGRAS.custoAbertura + aporte;
  if (jogo.carteira < total) throw new Error(`Você precisa de ${total} notas (abertura ${REGRAS.custoAbertura} + caixa ${aporte}).`);
  jogo.carteira -= total;
  lancar(jogo, { tipo: 'empresa', descricao: `🏪 Abriu a empresa ${nome} (registro ${REGRAS.custoAbertura} + caixa ${aporte})`, valor: -total });
  jogo.empresa = {
    ramo, nome, regime, caixa: aporte, estoque: 0, funcionarios: 0, equipe: [], bonus: 0, propaganda: 0, unidades: 1,
    preco: r.precoRef, turnos: 1, dias: 0, historico: [], aberturaEm: new Date().toISOString(),
  };
  return jogo.empresa;
}

/** Quanto o preço afasta ou atrai clientes (preço de referência = 1). */
export function fatorPreco(preco, ref) {
  if (preco <= 0) return 0;
  if (preco <= ref) return Math.min(1.6, 1 + ((ref - preco) / ref) * 0.8);   // mais barato: vende mais (até +60%)
  return Math.max(0, 1 - ((preco - ref) / ref) * 1.2);                       // mais caro: perde clientes rápido
}

/** Clientes esperados num dia (sem sorte e sem evento). */
export function demandaEsperada(emp, { preco = emp.preco, propaganda = emp.propaganda, bonus = emp.bonus || 0 } = {}) {
  const r = RAMOS[emp.ramo];
  const equipe = (emp.equipe || []).reduce((s, f) => s + produtividadeDe(f, bonus), 0);
  return r.demanda * emp.unidades * fatorPreco(preco, r.precoRef)
    * (1 + equipe) * (1 + REGRAS.efeitoPropaganda[propaganda]);
}

export function faturamentoRecente(emp, dias = 20) {
  return emp.historico.slice(0, dias).reduce((s, d) => s + d.receita, 0);
}

const EVENTOS = [
  { id: 'festa', peso: 2, texto: 'Data comemorativa! O movimento aumentou 50%.', demanda: 1.5, dica: 'Em datas especiais, ter estoque extra faz diferença.' },
  { id: 'post', peso: 2, texto: 'Um cliente postou elogios nas redes. +30% de clientes!', demanda: 1.3, dica: 'Atender bem é a melhor propaganda: boca a boca.' },
  { id: 'concorrente', peso: 2, texto: 'Abriu um concorrente na mesma rua. -25% de clientes.', demanda: 0.75, dica: 'Diferencie-se: preço justo, atendimento ou propaganda.' },
  { id: 'fornecedor', peso: 2, texto: 'O fornecedor aumentou o preço em 20% hoje.', custo: 1.2, dica: 'Quando o custo sobe, a margem cai. Pesquise outros fornecedores.' },
  { id: 'chuva', peso: 1, texto: 'Chuva forte: menos gente na rua. -20% de clientes.', demanda: 0.8, dica: 'Vender também pela internet protege do clima.' },
  { id: 'fiscal', peso: 1, texto: 'Fiscalização do trabalho passou: tudo registrado, nenhuma multa! ✅', dica: 'Registrar os funcionários protege a empresa e as pessoas.' },
];

function sortearEvento(aleatorio) {
  if (aleatorio() > 0.4) return null;                        // 40% dos dias têm surpresa
  const total = EVENTOS.reduce((s, e) => s + e.peso, 0);
  let x = aleatorio() * total;
  for (const e of EVENTOS) { x -= e.peso; if (x <= 0) return e; }
  return EVENTOS[0];
}

/**
 * Um dia de negócio. `d` = { comprar, preco, funcionarios, propaganda }.
 * Compra estoque, abre as portas, vende, paga salários/propaganda/imposto e mostra o lucro.
 */
export function simularDia(emp, d, aleatorio = Math.random) {
  const r = RAMOS[emp.ramo];
  if (!(emp.turnos > 0)) throw new Error('Feche um dia de estudo para ganhar mais um dia de negócio.');
  normalizarEmpresa(emp);
  if (emp.regime === 'mei' && emp.equipe.length > REGRAS.meiMaxFuncionarios) throw new Error('No MEI só pode ter 1 funcionário. Para ter mais, mude para o Simples Nacional.');
  const bonus = REGRAS.bonus.includes(d.bonus) ? d.bonus : emp.bonus;
  const propaganda = [0, 1, 2].includes(d.propaganda) ? d.propaganda : emp.propaganda;
  const preco = arred(Math.max(0.5, Number(d.preco) || emp.preco));
  const comprar = Math.max(0, Math.floor(Number(d.comprar) || 0));
  const evento = sortearEvento(aleatorio);
  const custoUnit = arred(r.custo * (evento?.custo || 1));
  const compra = arred(comprar * custoUnit);
  if (compra > emp.caixa) throw new Error(`O caixa tem ${emp.caixa} notas; essa compra custa ${compra}.`);

  emp.caixa = arred(emp.caixa - compra);
  emp.estoque += comprar;
  const sorte = 0.85 + aleatorio() * 0.3;                    // movimento do dia varia ±15%
  const clientes = Math.round(demandaEsperada(emp, { preco, propaganda, bonus }) * sorte * (evento?.demanda || 1));
  const vendidas = Math.min(emp.estoque, clientes);
  const perdidos = clientes - vendidas;                      // faltou estoque
  emp.estoque -= vendidas;
  let estragou = 0;
  if (r.perecivel && emp.estoque > 0) { estragou = emp.estoque - Math.floor(emp.estoque * REGRAS.sobraPerecivel); emp.estoque -= estragou; }

  const receita = arred(vendidas * preco);
  const cmv = arred(vendidas * custoUnit);                   // custo do que foi vendido
  const salarios = custoDaEquipe(emp, bonus);           // salários + encargos + bônus
  const custoPropaganda = REGRAS.propaganda[propaganda];
  const imposto = arred(emp.regime === 'mei' ? REGRAS.meiDAS : receita * REGRAS.simplesAliquota);
  const lucro = arred(receita - cmv - salarios - custoPropaganda - imposto - estragou * custoUnit);
  emp.caixa = arred(emp.caixa + receita - salarios - custoPropaganda - imposto);
  Object.assign(emp, { preco, propaganda, bonus });
  emp.equipe.forEach(f => { f.dias = (f.dias || 0) + 1; }); // experiência
  emp.turnos -= 1; emp.dias += 1;
  const dia = { dia: emp.dias, comprar, compra, clientes, vendidas, perdidos, estragou, preco, receita, cmv, salarios, bonus, equipe: emp.equipe.length, propaganda: custoPropaganda, imposto, lucro, evento: evento?.id || null, caixa: emp.caixa };
  emp.historico = [dia, ...emp.historico].slice(0, 60);
  const avisos = [];
  if (perdidos > 0) avisos.push(`Faltou estoque: ${perdidos} cliente(s) foram embora sem comprar.`);
  if (estragou > 0) avisos.push(`${estragou} ${r.produto}(s) estragaram. Comida que sobra é prejuízo: compre perto do que vende.`);
  if (preco > r.precoRef * 1.4) avisos.push('Preço bem acima do normal afasta clientes.');
  if (emp.regime === 'mei' && faturamentoRecente(emp) > REGRAS.meiLimite) avisos.push(`Seu faturamento passou do limite do MEI (${REGRAS.meiLimite} em 20 dias). É hora de mudar para o Simples Nacional.`);
  if (emp.caixa < 0) avisos.push('O caixa ficou negativo: a empresa está no vermelho. Coloque dinheiro (aporte) ou reduza custos.');
  return { ...dia, eventoTexto: evento?.texto || null, eventoDica: evento?.dica || null, avisos };
}

export function trocarRegime(emp, regime) {
  if (!['mei', 'simples'].includes(regime)) throw new Error('Regime inválido.');
  if (regime === 'mei' && (emp.equipe?.length ?? emp.funcionarios) > REGRAS.meiMaxFuncionarios) throw new Error('Com mais de 1 funcionário não dá para ser MEI.');
  if (regime === 'mei' && faturamentoRecente(emp) > REGRAS.meiLimite) throw new Error('O faturamento está acima do limite do MEI.');
  emp.regime = regime;
}

/** Tira dinheiro do caixa da empresa para a carteira do dono (distribuição de lucro). */
export function retirarLucro(jogo, valor) {
  const emp = jogo.empresa;
  valor = Math.floor(Number(valor));
  if (!(valor > 0)) throw new Error('Digite quanto quer retirar.');
  if (valor > emp.caixa) throw new Error(`O caixa só tem ${Math.floor(emp.caixa)} notas.`);
  emp.caixa = arred(emp.caixa - valor);
  jogo.carteira += valor;
  lancar(jogo, { tipo: 'empresa', descricao: `🏪 Retirada de lucro da ${emp.nome}`, valor });
}

/** Coloca dinheiro da carteira no caixa da empresa (aporte do sócio). */
export function aportar(jogo, valor) {
  const emp = jogo.empresa;
  valor = Math.floor(Number(valor));
  if (!(valor > 0)) throw new Error('Digite quanto quer colocar.');
  if (valor > jogo.carteira) throw new Error(`Você só tem ${jogo.carteira} na carteira.`);
  jogo.carteira -= valor;
  emp.caixa = arred(emp.caixa + valor);
  lancar(jogo, { tipo: 'empresa', descricao: `🏪 Aporte no caixa da ${emp.nome}`, valor: -valor });
}

export function abrirUnidade(emp) {
  if (emp.caixa < REGRAS.custoUnidade) throw new Error(`Abrir mais uma unidade custa ${REGRAS.custoUnidade} notas do caixa.`);
  emp.caixa = arred(emp.caixa - REGRAS.custoUnidade);
  emp.unidades += 1;
}

/** Cada dia de estudo fechado dá mais um dia de negócio (acumula até 3). */
export async function ganharTurnoEmpresa() {
  const jogo = await lerJogo();
  if (!jogo.empresa) return;
  jogo.empresa.turnos = Math.min(REGRAS.maxTurnos, (jogo.empresa.turnos || 0) + 1);
  await gravarJogo(jogo);
}
