// 🏪 Tela da Empresa virtual (#/empresa).
import { el, aviso, navegar } from '../ui.js';
import { lerJogo, gravarJogo } from '../jogo.js';
import {
  RAMOS, REGRAS, abrirEmpresa, simularDia, demandaEsperada, retirarLucro, aportar, abrirUnidade, trocarRegime,
  faturamentoRecente, normalizarEmpresa, candidatosDoDia, contratar, demitir, clientesDoFuncionario, custoDoFuncionario,
  custoDaEquipe, comEncargos,
} from '../empresa.js';
import { hojeISO } from '../datas.js';
import { sons } from '../sons.js';
import { confete } from '../efeitos.js';

const n2 = v => (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const redesenhar = () => dispatchEvent(new HashChangeEvent('hashchange'));

export async function render(raiz) {
  const jogo = await lerJogo();
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar('#/mapa') }, '← 🗺️ Mapa'));
  if (!jogo.empresa) return telaAbrir(raiz, jogo);
  const emp = normalizarEmpresa(jogo.empresa);
  const r = RAMOS[emp.ramo];

  raiz.append(
    el('div', { class: 'empresa-topo' },
      el('span', { class: 'empresa-icone' }, r.icone),
      el('div', {}, el('h1', {}, emp.nome), el('small', {}, `${r.nome} · ${emp.regime === 'mei' ? 'MEI' : 'Simples Nacional'} · ${emp.unidades} unidade(s)`))),
    el('div', { class: 'banco-saldos' },
      el('div', {}, el('small', {}, 'Caixa da empresa'), el('strong', { class: emp.caixa < 0 ? 'saida' : 'entrada' }, `💵 ${n2(emp.caixa)}`)),
      el('div', {}, el('small', {}, 'Estoque'), el('strong', {}, `📦 ${emp.estoque}`)),
      el('div', {}, el('small', {}, 'Dias de negócio'), el('strong', {}, `📅 ${emp.turnos}`))));

  raiz.append(secaoEquipe(jogo, emp, r));
  if (emp.turnos > 0) raiz.append(painelDia(jogo, emp, r));
  else raiz.append(el('section', { class: 'cartao' }, el('p', {}, '📚 Feche mais um dia de estudo para ganhar um novo dia de negócio.'),
    el('p', { class: 'dica' }, `Cada dia de estudo fechado vale um dia de negócio (acumula até ${REGRAS.maxTurnos}).`)));

  if (emp.historico.length) raiz.append(planilha(emp));
  raiz.append(quadroRegimes(emp, jogo), painelDinheiro(jogo, emp));
  raiz.append(explicacoes());
}

function telaAbrir(raiz, jogo) {
  let ramo = 'lanchonete', regime = 'mei';
  const nome = el('input', { id: 'nome-empresa', maxlength: 24, placeholder: 'Ex.: Lanches do Juba', autocomplete: 'off' });
  const aporte = el('input', { id: 'aporte', type: 'number', inputmode: 'numeric', min: REGRAS.aporteMinimo, value: Math.max(REGRAS.aporteMinimo, Math.min(60, jogo.carteira - REGRAS.custoAbertura)) });
  const ramos = el('div', { class: 'ramos' });
  const desenharRamos = () => ramos.replaceChildren(...Object.entries(RAMOS).map(([id, x]) => el('button', {
    class: `ramo ${id === ramo ? 'ativo' : ''}`, type: 'button', onclick: () => { ramo = id; desenharRamos(); },
  }, el('span', { class: 'ramo-icone' }, x.icone), el('strong', {}, x.nome), el('small', {}, x.desc),
    el('small', { class: 'ramo-numeros' }, `custo ${n2(x.custo)} · vende por ~${n2(x.precoRef)} por ${x.produto}`))));
  desenharRamos();
  const regimes = el('div', { class: 'opcoes grade' });
  const desenharRegimes = () => regimes.replaceChildren(
    el('button', { class: `botao ${regime === 'mei' ? '' : 'secundario'}`, type: 'button', onclick: () => { regime = 'mei'; desenharRegimes(); } }, 'MEI'),
    el('button', { class: `botao ${regime === 'simples' ? '' : 'secundario'}`, type: 'button', onclick: () => { regime = 'simples'; desenharRegimes(); } }, 'Simples Nacional'));
  desenharRegimes();
  raiz.append(
    el('h1', {}, '🏪 Abra a sua empresa'),
    el('p', { class: 'dica' }, `Você tem 💵 ${jogo.carteira}. Abrir custa ${REGRAS.custoAbertura} (registro e CNPJ) e você coloca um dinheiro inicial no caixa (mínimo ${REGRAS.aporteMinimo}).`),
    el('h2', {}, '1. Qual negócio?'), ramos,
    el('h2', {}, '2. Nome da empresa'), el('div', { class: 'campo' }, nome),
    el('h2', {}, '3. Tipo de empresa'), regimes,
    quadroRegimes(null),
    el('h2', {}, '4. Dinheiro inicial no caixa'), el('div', { class: 'campo' }, aporte),
    el('button', { class: 'botao grande', onclick: async () => {
      try {
        abrirEmpresa(jogo, { ramo, nome: nome.value, regime, aporte: aporte.value });
        await gravarJogo(jogo); sons.conquista(); confete(); redesenhar();
      } catch (e) { sons.erro(); aviso(e.message); }
    } }, '🏪 Abrir a empresa'));
}

function painelDia(jogo, emp, r) {
  const sugestao = Math.max(0, Math.ceil(demandaEsperada(emp)) - (r.perecivel ? 0 : emp.estoque));
  const comprar = el('input', { type: 'number', inputmode: 'numeric', min: 0, value: sugestao, id: 'comprar' });
  const preco = el('input', { type: 'number', inputmode: 'decimal', min: 0.5, step: 0.5, value: emp.preco, id: 'preco' });
  let propaganda = emp.propaganda, bonus = emp.bonus || 0;
  const resumo = el('div', { class: 'previsao' });
  const botoesProp = el('div', { class: 'opcoes grade tres' });
  const botoesBonus = el('div', { class: 'opcoes grade quatro' });
  const atualizar = () => {
    const demanda = demandaEsperada(emp, { preco: Number(preco.value) || emp.preco, propaganda, bonus });
    const custoCompra = (Number(comprar.value) || 0) * r.custo;
    const equipe = custoDaEquipe(emp, bonus);
    resumo.replaceChildren(
      el('p', {}, `👥 Clientes esperados: ~${n2(demanda)} (o dia pode variar e ter surpresas)`),
      el('p', {}, `🛒 Compra de estoque: ${n2(custoCompra)} · 👷 Equipe: ${n2(equipe)} · 📣 Propaganda: ${REGRAS.propaganda[propaganda]}`),
      el('p', { class: 'dica' }, `Margem por ${r.produto}: ${n2((Number(preco.value) || 0) - r.custo)} (preço − custo).`));
    botoesProp.replaceChildren(...['Nenhuma', 'Redes', 'Panfleto + redes'].map((t, k) => el('button', {
      class: `botao ${k === propaganda ? '' : 'secundario'} pequeno`, type: 'button', onclick: () => { propaganda = k; atualizar(); },
    }, `${t}${REGRAS.propaganda[k] ? ` (${REGRAS.propaganda[k]})` : ''}`)));
    botoesBonus.replaceChildren(...REGRAS.bonus.map((v, k) => el('button', {
      class: `botao ${k === bonus ? '' : 'secundario'} pequeno`, type: 'button', disabled: !emp.equipe.length, onclick: () => { bonus = k; atualizar(); },
    }, v ? `${v} (+${Math.round(REGRAS.efeitoBonus[k] * 100)}%)` : 'Sem')));
  };
  comprar.addEventListener('input', atualizar); preco.addEventListener('input', atualizar);
  atualizar();
  const area = el('div', {});
  return el('section', { class: 'cartao dia-negocio' },
    el('h2', {}, `📅 Dia de negócio nº ${emp.dias + 1}`),
    el('div', { class: 'campo' }, el('label', { for: 'comprar' }, `Comprar estoque (${r.produto}s a ${n2(r.custo)} cada; tem ${emp.estoque} guardado)`), comprar),
    el('div', { class: 'campo' }, el('label', { for: 'preco' }, `Preço de venda (o normal é ~${n2(r.precoRef)})`), preco),
    el('p', { class: 'dica' }, 'Propaganda do dia:'), botoesProp,
    el('p', { class: 'dica' }, emp.equipe.length ? '🎁 Bonificação por funcionário hoje (faz render mais):' : '🎁 Bonificação: contrate alguém para poder dar bônus.'), botoesBonus,
    resumo,
    el('button', { class: 'botao grande', onclick: async e => {
      try {
        const res = simularDia(emp, { comprar: comprar.value, preco: preco.value, propaganda, bonus });
        await gravarJogo(jogo);
        e.target.remove();
        mostrarResultado(area, res, r);
      } catch (err) { sons.erro(); aviso(err.message); }
    } }, '🚪 Abrir as portas'),
    area);
}

/** 👷 Equipe: quem trabalha, quanto custa, quanto produz; candidatos do dia para contratar. */
function secaoEquipe(jogo, emp, r) {
  const margem = Math.max(0, emp.preco - r.custo);
  const ficha = (f, acoes) => {
    const n = REGRAS.niveis[f.nivel];
    const clientes = clientesDoFuncionario(emp, f, emp.bonus || 0);
    const custo = custoDoFuncionario(f, emp.bonus || 0);
    const gera = clientes * margem;
    const exp = Math.min(REGRAS.experienciaMax, (f.dias || 0) * REGRAS.experienciaPorDia);
    return el('div', { class: 'ficha-funcionario' },
      el('div', { class: 'ficha-topo' }, el('strong', {}, `👤 ${f.nome}`), el('span', { class: `nivel-func ${f.nivel}` }, n.nome)),
      el('p', {}, `📈 Atende +${n2(clientes)} clientes por dia${exp ? ` (experiência +${Math.round(exp * 100)}%)` : ''}`),
      el('p', {}, `💸 Custa ${n2(custo)} por dia: salário ${n2(n.salario)} + encargos ${n2(comEncargos(n.salario) - n.salario)}${emp.bonus ? ` + bônus ${REGRAS.bonus[emp.bonus]}` : ''}`),
      el('p', { class: gera >= custo ? 'entrada' : 'saida' }, `⚖️ Gera ~${n2(gera)} de margem por dia → ${gera >= custo ? 'se paga ✅' : 'ainda não se paga ⚠️'}`),
      acoes);
  };
  const equipe = emp.equipe.map(f => ficha(f, el('button', { class: 'link', onclick: async () => {
    const custo = n2(comEncargos(REGRAS.niveis[f.nivel].salario) * REGRAS.rescisaoDias);
    if (!confirm(`Demitir ${f.nome}? A rescisão custa ${custo} notas do caixa (direitos do trabalhador).`)) return;
    demitir(emp, f.id); await gravarJogo(jogo); sons.erro(); redesenhar();
  } }, 'Demitir')));
  const lotado = emp.regime === 'mei' && emp.equipe.length >= REGRAS.meiMaxFuncionarios;
  const candidatos = candidatosDoDia(emp, hojeISO()).map(c => ficha(c, el('button', {
    class: 'botao pequeno', disabled: lotado, onclick: async () => {
      try { contratar(emp, c); await gravarJogo(jogo); sons.compra(); aviso(`${c.nome} foi contratado(a) com carteira assinada!`); redesenhar(); }
      catch (e) { sons.erro(); aviso(e.message); }
    },
  }, '✍️ Contratar com carteira assinada')));
  return el('section', { class: 'cartao equipe' },
    el('h2', {}, `👷 Equipe (${emp.equipe.length})`),
    emp.equipe.length ? el('div', {}, equipe) : el('p', { class: 'dica' }, 'Ninguém contratado ainda. Sozinho dá para começar; com equipe, atende mais clientes.'),
    emp.equipe.length ? el('p', { class: 'dica' }, `Custo total da equipe por dia: ${n2(custoDaEquipe(emp))}`) : null,
    el('details', { class: 'candidatos' },
      el('summary', {}, `🧑‍💼 Candidatos de hoje (3)${lotado ? ' · MEI só pode ter 1 funcionário' : ''}`),
      el('div', {}, candidatos)),
    el('details', {},
      el('summary', {}, '❓ Por que o funcionário custa mais que o salário?'),
      el('p', {}, 'Além do salário, a empresa paga direitos do trabalhador registrado (carteira assinada). Aproximadamente:'),
      el('ul', {}, REGRAS.encargosDetalhe.map(([nome, pct]) => el('li', {}, `${nome}: ${String(Math.round(pct * 1000) / 10).replace('.', ',')}% do salário`))),
      el('p', { class: 'dica' }, 'Total ≈ 30% a mais. Bonificação é um prêmio extra que motiva a render mais, mas o ganho diminui: bônus demais não compensa. Demitir custa a rescisão.')));
}

function mostrarResultado(area, res, r) {
  if (res.lucro > 0) { sons.conquista(); if (res.lucro >= 15) confete(); } else sons.erro();
  const linha = (rot, v, cls = '') => el('tr', { class: cls }, el('td', {}, rot), el('td', {}, n2(v)));
  area.replaceChildren(
    res.eventoTexto ? el('div', { class: 'caixa-dica' }, el('strong', {}, '⚡ Surpresa do dia: '), res.eventoTexto, el('br'), el('small', {}, res.eventoDica)) : null,
    el('p', {}, `👥 ${res.clientes} cliente(s) · vendeu ${res.vendidas} ${r.produto}(s) a ${n2(res.preco)}`),
    el('table', { class: 'tabela dre' },
      linha('Receita (vendas)', res.receita, 'entrada'),
      linha('− Custo do que foi vendido', -res.cmv),
      res.estragou ? linha(`− Estragou (${res.estragou})`, -res.estragou * r.custo) : null,
      res.salarios ? linha(`− Equipe (salários + encargos${res.bonus ? ' + bônus' : ''})`, -res.salarios) : null,
      res.propaganda ? linha('− Propaganda', -res.propaganda) : null,
      linha('− Imposto', -res.imposto),
      linha('= Lucro do dia', res.lucro, res.lucro >= 0 ? 'lucro' : 'prejuizo')),
    ...res.avisos.map(a => el('p', { class: 'caixa-dica' }, '💡 ', a)),
    el('p', { class: 'dica' }, `Caixa agora: ${n2(res.caixa)}. Lembre: lucro não é o mesmo que dinheiro no caixa; o estoque guardado também é dinheiro da empresa.`),
    el('button', { class: 'botao grande', onclick: redesenhar }, 'Continuar'));
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function planilha(emp) {
  const dias = emp.historico.slice(0, 10).reverse();
  const max = Math.max(1, ...dias.map(d => Math.abs(d.lucro)));
  const total = emp.historico.slice(0, 20).reduce((s, d) => ({ receita: s.receita + d.receita, lucro: s.lucro + d.lucro }), { receita: 0, lucro: 0 });
  return el('section', { class: 'cartao' },
    el('h2', {}, '📊 Planilha da empresa'),
    el('div', { class: 'grafico-lucro' }, dias.map(d => el('div', { class: 'coluna-lucro', title: `Dia ${d.dia}: lucro ${n2(d.lucro)}` },
      el('div', { class: `barra-lucro ${d.lucro < 0 ? 'neg' : ''}`, style: `height:${Math.round((Math.abs(d.lucro) / max) * 100)}%` }),
      el('small', {}, d.dia)))),
    el('div', { class: 'planilha-rolagem' }, el('table', { class: 'tabela planilha' },
      el('tr', {}, ['Dia', 'Vendas', 'Receita', 'Custos', 'Imposto', 'Lucro'].map(t => el('th', {}, t))),
      emp.historico.slice(0, 10).map(d => el('tr', {},
        el('td', {}, d.dia), el('td', {}, d.vendidas), el('td', {}, n2(d.receita)),
        el('td', {}, n2(d.cmv + d.salarios + d.propaganda)), el('td', {}, n2(d.imposto)),
        el('td', { class: d.lucro >= 0 ? 'entrada' : 'saida' }, n2(d.lucro)))))),
    el('p', { class: 'dica' }, `Últimos ${Math.min(20, emp.historico.length)} dias: faturou ${n2(total.receita)} e lucrou ${n2(total.lucro)}. Margem: ${total.receita ? Math.round((total.lucro / total.receita) * 100) : 0}%.`),
    emp.regime === 'mei' ? el('p', { class: 'dica' }, `Limite do MEI: ${n2(faturamentoRecente(emp))} de ${REGRAS.meiLimite} nos últimos 20 dias.`) : null);
}

function painelDinheiro(jogo, emp) {
  const valor = el('input', { type: 'number', inputmode: 'numeric', min: 1, id: 'valor-empresa', placeholder: 'Quanto?' });
  const agir = fn => async () => { try { fn(); await gravarJogo(jogo); sons.compra(); redesenhar(); } catch (e) { sons.erro(); aviso(e.message); } };
  return el('section', { class: 'cartao' },
    el('h2', {}, '💼 Dinheiro e crescimento'),
    el('div', { class: 'campo' }, el('label', { for: 'valor-empresa' }, `Carteira: 💵 ${jogo.carteira} · Caixa da empresa: 💵 ${n2(emp.caixa)}`), valor),
    el('div', { class: 'linha' },
      el('button', { class: 'botao', onclick: agir(() => retirarLucro(jogo, valor.value)) }, '⬅ Retirar lucro'),
      el('button', { class: 'botao secundario', onclick: agir(() => aportar(jogo, valor.value)) }, 'Colocar no caixa ➡')),
    el('p', { class: 'dica' }, 'Retirar lucro leva o dinheiro para a sua carteira (loja, banco, territórios). Colocar no caixa é um aporte do dono.'),
    el('button', { class: 'botao secundario grande', onclick: agir(() => abrirUnidade(emp)) }, `🏬 Abrir mais uma unidade (${REGRAS.custoUnidade} do caixa)`),
  );
}

/** Quadro MEI × Simples Nacional (com o tipo atual destacado e a conta de quanto pagaria no outro). */
function quadroRegimes(emp, jogo) {
  const atual = emp?.regime;
  const linha = (rot, mei, simples) => el('tr', {}, el('th', {}, rot), el('td', { class: atual === 'mei' ? 'atual' : '' }, mei), el('td', { class: atual === 'simples' ? 'atual' : '' }, simples));
  const sec = el('section', { class: 'cartao regimes' },
    el('h2', {}, '🧾 MEI ou Simples Nacional?'),
    el('div', { class: 'planilha-rolagem' }, el('table', { class: 'tabela tabela-regimes' },
      el('tr', {}, el('th', {}, ''), el('th', { class: atual === 'mei' ? 'atual' : '' }, `MEI${atual === 'mei' ? ' ✅' : ''}`), el('th', { class: atual === 'simples' ? 'atual' : '' }, `Simples Nacional${atual === 'simples' ? ' ✅' : ''}`)),
      linha('O que é', 'Microempreendedor Individual: o jeito mais simples de ter CNPJ.', 'Regime de impostos para micro e pequenas empresas.'),
      linha('Imposto no jogo', `Valor fixo: ${REGRAS.meiDAS} nota por dia de negócio, venda muito ou pouco.`, `${REGRAS.simplesAliquota * 100}% de tudo o que vender.`),
      linha('Na vida real', 'Paga o DAS, um valor fixo por mês (perto de R$ 80 a R$ 90).', 'Paga uma porcentagem do faturamento: começa em 4% no comércio e 6% em serviços, e sobe se faturar mais.'),
      linha('Funcionários', `No máximo ${REGRAS.meiMaxFuncionarios}.`, 'Quantos a empresa precisar.'),
      linha('Limite de faturamento', `No jogo: ${REGRAS.meiLimite} notas em 20 dias. Na vida real: R$ 81 mil por ano (a lei pode mudar).`, 'Na vida real: até R$ 4,8 milhões por ano.'),
      linha('Quando vale a pena', 'No começo, negócio pequeno, trabalhando quase sozinho.', 'Quando a empresa cresce, fatura mais ou precisa de equipe.'))));
  if (emp && jogo) {
    const dias = emp.historico.slice(0, 20);
    const receita = dias.reduce((s, d) => s + d.receita, 0);
    const noMei = dias.length * REGRAS.meiDAS, noSimples = receita * REGRAS.simplesAliquota;
    if (dias.length) sec.append(el('p', { class: 'caixa-dica' }, `📊 Nos últimos ${dias.length} dias você faturou ${n2(receita)}. No MEI pagaria ${n2(noMei)} de imposto; no Simples Nacional, ${n2(noSimples)}. `,
      noMei <= noSimples ? 'Por imposto, o MEI está saindo mais barato.' : 'Por imposto, o Simples está saindo mais barato.',
      emp.regime === 'mei' && faturamentoRecente(emp) > REGRAS.meiLimite ? ' Mas você passou do limite do MEI: precisa ir para o Simples.' : ''));
    const outro = emp.regime === 'mei' ? 'simples' : 'mei';
    sec.append(el('button', { class: 'botao secundario grande', onclick: async () => {
      try { trocarRegime(emp, outro); await gravarJogo(jogo); sons.compra(); aviso(`Agora a empresa é ${outro === 'mei' ? 'MEI' : 'do Simples Nacional'}.`); redesenhar(); }
      catch (e) { sons.erro(); aviso(e.message); }
    } }, outro === 'simples' ? '➡ Mudar para o Simples Nacional' : '⬅ Voltar para MEI'));
  }
  return sec;
}

function explicacoes() {
  return el('details', { class: 'cartao' },
    el('summary', {}, '❓ Como funciona uma empresa de verdade'),
    el('ul', {},
      el('li', {}, 'Receita é tudo o que entrou com as vendas. Lucro é o que sobra depois de pagar todos os custos.'),
      el('li', {}, 'Preço alto demais afasta clientes; baixo demais acaba com a margem. O segredo é o preço justo.'),
      el('li', {}, 'Funcionário registrado em carteira custa o salário mais os encargos (FGTS, INSS, férias e 13º), mas atende mais clientes.'),
      el('li', {}, 'MEI é para negócios pequenos: imposto fixo e baixo, até 1 funcionário e limite de faturamento.'),
      el('li', {}, 'No Simples Nacional, o imposto é uma porcentagem do que a empresa vende.'),
      el('li', {}, 'O dinheiro da empresa é da empresa. O dono retira o lucro, não o caixa inteiro.')));
}
