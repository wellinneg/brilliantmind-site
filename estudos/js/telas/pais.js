import { el, aviso, navegar } from '../ui.js';
import * as db from '../db.js';
import * as estado from '../estado.js';
import { hashPin, pinValido, senhaDosPaisConfere } from '../pin.js';
import { liberarPais, paisLiberado } from '../sessao-pais.js';
import { estatisticas, maisErradas } from '../conquistas.js';
import { MATERIAS, DIFICULDADES, ANOS, statusDoDia } from '../rodizio.js';
import { exibir, hojeISO } from '../datas.js';
import { carregarDia } from '../conteudo.js';
import { alternarSeletorDeSerie } from './serie.js';
import { calendarioInterativo } from '../calendario.js';
import { secaoFamilia } from './familia-pais.js';
import { desempenhoLocal, desempenhoDoResumo } from '../desempenho.js';
import { meuPapel, papelDe } from '../papeis.js';
import { lerJogo } from '../jogo.js';
import { gerarCopia, restaurarCopia, baixarArquivo } from '../backup.js';

export async function render(raiz) {
  const pin = el('input', { id: 'pin', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  const area = el('div', {});
  raiz.append(el('h1', {}, '🔒 Para os pais'), area);
  if (paisLiberado()) { await painel(area); return; }
  area.append(el('form', {
    onsubmit: async e => {
      e.preventDefault();
      if (!(await senhaDosPaisConfere(pin.value, await db.lerConfig('pinHash')))) { pin.value = ''; return aviso('Senha errada.'); }
      liberarPais();
      area.replaceChildren(el('p', { class: 'subtitulo' }, 'Carregando…'));
      const painelFrag = document.createDocumentFragment();
      await painel(painelFrag);
      area.replaceChildren(painelFrag);
    },
  }, el('div', { class: 'campo' }, el('label', { for: 'pin' }, 'Senha do responsável'), pin), el('button', { class: 'botao grande', type: 'submit' }, 'Entrar')));
}

const url = blob => URL.createObjectURL(blob);
async function imagem(id) {
  const m = id && await db.lerMidia(id);
  if (!m) return null;
  return el('img', { src: url(m.blob), alt: m.tipo, onclick: e => e.currentTarget.classList.toggle('ampliada') });
}
const tituloDe = async (ano, dia, bloco) => (await carregarDia(ano, dia).catch(() => null))?.blocos[bloco]?.titulo || `dia ${dia}, bloco ${bloco + 1}`;

async function painel(area) {
  const perfil = await db.lerConfig('perfil');
  const dias = (await db.listarDias()).sort((a, b) => b.data.localeCompare(a.data) || a.ano.localeCompare(b.ano));
  const e = estatisticas(dias, hojeISO());
  const espaco = await navigator.storage?.estimate?.();
  const pend = await estado.pendentes(perfil.ano);

  area.append(await secaoAcertoFilhos(dias, perfil));
  area.append(
    calendarioInterativo(dias),
    el('button', { class: 'botao grande', onclick: () => navegar(`#/biblioteca/${perfil.ano}`) }, '📚 Todas as lições (acesso livre)'),
    el('p', {}, `${perfil.nome} · ${ANOS[perfil.ano]} · está no dia ${await estado.proximoDia(perfil.ano)} da trilha`),
    el('table', { class: 'tabela' },
      el('tr', {}, el('td', {}, 'Dias completos'), el('td', {}, e.diasFechados)),
      el('tr', {}, el('td', {}, 'Sequência atual / recorde'), el('td', {}, `${e.sequencia} / ${e.recordeSequencia}`)),
      el('tr', {}, el('td', {}, 'Pontos'), el('td', {}, e.pontos)),
      el('tr', {}, el('td', {}, 'Leituras gravadas'), el('td', {}, e.leituras)),
      el('tr', {}, el('td', {}, 'Lições esperando revisão'), el('td', {}, pend.length)),
      espaco ? el('tr', {}, el('td', {}, 'Espaço usado no celular'), el('td', {}, `${(espaco.usage / 1048576).toFixed(1)} MB`)) : null));

  const ajuda = pend.filter(p => p.voltas >= 3);
  if (ajuda.length) {
    const lista = el('ul', {});
    area.append(el('h2', {}, '🆘 Precisa de ajuda'),
      el('p', { class: 'dica' }, 'Lições que já voltaram 3 vezes ou mais sem dar certo. Vale sentar junto e explicar.'), lista);
    for (const p of ajuda) lista.append(el('li', {}, `${MATERIAS[p.materia]?.icone || ''} ${await tituloDe(perfil.ano, p.dia, p.bloco)} · ${DIFICULDADES[p.dificuldade]?.icone || ''} · voltou ${p.voltas}×`));
  }

  const usados = Object.entries(e.porDificuldade).filter(([, v]) => v.feitos);
  if (usados.length) {
    area.append(el('h2', {}, 'Nível escolhido'),
      el('table', { class: 'tabela' },
        el('tr', {}, el('th', {}, 'Nível'), el('th', {}, 'Lições'), el('th', {}, 'Conseguiu')),
        usados.map(([d, v]) => el('tr', {},
          el('td', {}, `${DIFICULDADES[d].icone} ${DIFICULDADES[d].nome}`),
          el('td', {}, v.feitos), el('td', {}, `${Math.round((v.aprovados / v.feitos) * 100)}%`)))));
  }

  const materias = Object.keys(e.mediaPorMateria);
  if (materias.length) {
    area.append(el('h2', {}, 'Acerto por matéria (1ª tentativa)'),
      el('table', { class: 'tabela' },
        el('tr', {}, el('th', {}, 'Matéria'), el('th', {}, 'Conseguiu'), el('th', {}, 'Acerto')),
        materias.map(m => el('tr', {},
          el('td', {}, `${MATERIAS[m]?.icone || ''} ${MATERIAS[m]?.nome || m}`),
          el('td', {}, e.porMateria[m] || 0), el('td', {}, `${e.mediaPorMateria[m]}%`)))));
  }

  const erradas = maisErradas(dias, perfil.ano, 5);
  if (erradas.length) {
    const lista = el('ol', {});
    area.append(el('h2', {}, 'Perguntas que mais erra'), lista);
    for (const t of erradas) {
      const conteudo = await carregarDia(perfil.ano, t.dia).catch(() => null);
      const q = conteudo?.blocos[t.bloco]?.quiz?.[t.dificuldade]?.[t.q];
      if (q) lista.append(el('li', {}, `${q.pergunta} (${MATERIAS[conteudo.blocos[t.bloco].materia].nome}, ${DIFICULDADES[t.dificuldade].nome}, ${t.vezes}×)`));
    }
  }

  area.append(el('h2', {}, 'Dia a dia'));
  if (!dias.length) area.append(el('p', { class: 'dica' }, 'Nenhum dia registrado ainda.'));
  for (const d of dias) area.append(cartaoDia(d));

  const caixaAno = el('div', {});
  area.append(
    el('h2', {}, 'Cópia de segurança'),
    el('p', { class: 'dica' }, 'Faça uma vez por semana e guarde o arquivo (Drive ou WhatsApp). Se o celular for trocado ou os dados do app forem apagados, é ela que recupera tudo.'),
    el('button', { class: 'botao grande', onclick: async () => {
      const nome = perfil.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      baixarArquivo(`trilha-${nome}-${hojeISO()}.json`, JSON.stringify(await gerarCopia()));
    } }, '💾 Fazer cópia de segurança'),
    seletorRestaurar(),
    await secaoFamilia(),
    el('h2', {}, 'Ajustes'),
    el('button', { class: 'botao secundario grande', onclick: trocarSenha }, 'Trocar a senha'),
    el('button', { class: 'botao secundario grande', onclick: () => alternarSeletorDeSerie(caixaAno, perfil.ano) }, '🎓 Mudar a série'),
    caixaAno,
    el('button', { class: 'botao secundario grande', onclick: zerarTudo }, 'Apagar tudo deste celular'),
    await secaoCreditosFotos(),
    el('p', { class: 'credito' }, 'Sistema desenvolvido pela BMC Contabilidade'));
}

/** 📷 Créditos das fotos dos lugares (licenças livres pedem o nome do autor). */
async function secaoCreditosFotos() {
  let dados = null;
  try { const r = await fetch('conteudo/creditos-fotos.json', { cache: 'no-cache' }); if (r.ok) dados = await r.json(); } catch { /* sem internet */ }
  if (!dados?.fotos) return '';
  const { CAMADAS } = await import('../jogo.js');
  const nomes = Object.fromEntries(CAMADAS.flatMap(c => c.territorios).map(t => [t.id.replace(':', '-'), `${t.icone} ${t.nome}`]));
  return el('details', { class: 'cartao creditos-fotos' },
    el('summary', {}, '📷 Créditos das fotos dos lugares'),
    el('p', { class: 'dica' }, `Fotos reais de ${dados.fonte}, com licença livre. Toque no link para ver a original.`),
    el('ul', {}, Object.entries(dados.fotos).map(([id, f]) => el('li', {},
      el('strong', {}, nomes[id] || id), `: ${f.descricao || f.titulo}. Foto de ${f.autor}, ${f.licenca}. `,
      el('a', { href: f.link, target: '_blank', rel: 'noopener' }, 'ver original')))));
}

/** 📊 Acerto de cada filho: global e por matéria (1ª tentativa). Este celular + irmãos da família. */
async function secaoAcertoFilhos(dias, perfil) {
  const jogo = await lerJogo();
  const pessoas = [];
  if (meuPapel(jogo) !== 'pai') pessoas.push({ nome: perfil.nome, ano: perfil.ano, d: desempenhoLocal(dias, perfil.ano) });
  for (const [uid, o] of Object.entries(jogo.outros || {})) {
    if (papelDe(jogo, uid) === 'pai' || !o.estudo?.ano) continue;
    pessoas.push({ nome: o.apelido || 'Filho', ano: o.estudo.ano, d: await desempenhoDoResumo(o.estudo), quando: o.estudo.em });
  }
  const cor = v => (v == null ? '#607D8B' : v >= 80 ? '#43A047' : v >= 60 ? '#FDD835' : '#E53935');
  const caixa = el('section', { class: 'cartao acerto-filhos' }, el('h2', {}, '📊 Acerto dos filhos'));
  if (!pessoas.length) { caixa.append(el('p', { class: 'dica' }, 'Ainda não há lições feitas.')); return caixa; }
  for (const p of pessoas) {
    caixa.append(el('div', { class: 'filho-acerto' },
      el('div', { class: 'filho-topo' },
        el('strong', {}, `${p.nome} · ${ANOS[p.ano] || p.ano}`),
        el('span', { class: 'acerto-global', style: `--cor:${cor(p.d.global)}` }, p.d.global == null ? 'sem lições' : `${p.d.global}%`)),
      el('small', { class: 'dica' }, `${p.d.licoes} lição(ões) feitas${p.quando ? ` · atualizado em ${p.quando.split('-').reverse().join('/')}` : ''}`),
      el('div', { class: 'barras-materia' }, p.d.materias.map(m => el('div', { class: 'barra-materia' },
        el('span', { class: 'nome-materia' }, `${MATERIAS[m.materia]?.icone || ''} ${MATERIAS[m.materia]?.nome || m.materia}`),
        el('span', { class: 'trilho' }, el('span', { style: `width:${m.acerto || 0}%;background:${cor(m.acerto)}` })),
        el('span', { class: 'valor' }, `${m.acerto}%`))))));
  }
  caixa.append(el('p', { class: 'dica' }, 'Acerto na 1ª tentativa de cada lição. 🟢 80% ou mais · 🟡 60% a 79% · 🔴 abaixo de 60%.'));
  return caixa;
}

function cartaoDia(d) {
  const st = statusDoDia(d);
  const casa = d.temLicao === null ? 'não respondida' : (d.temLicao ? 'sim' : 'não tinha');
  const corpo = el('div', {});
  const det = el('details', { class: 'cartao' },
    el('summary', {}, `${exibir(d.data)} · ${ANOS[d.ano]} · ${d.fechado ? '✅ completo' : (d.continuadoEm ? '↪ continuado' : '⏳ incompleto')} · dia ${d.diaConteudo}`),
    corpo);
  det.addEventListener('toggle', async () => {
    if (!det.open || corpo.childElementCount) return;
    const conteudo = await carregarDia(d.ano, d.diaConteudo).catch(() => null);
    corpo.append(
      el('ul', {}, d.blocos.map((b, i) => {
        const chave = b.materia || conteudo?.blocos[i]?.materia;
        const nivel = DIFICULDADES[b.dificuldade];
        return el('li', {}, `${MATERIAS[chave]?.nome || 'Bloco ' + (i + 1)}: `,
          !b.feito ? 'não fez' : `${nivel ? nivel.icone + ' ' + nivel.nome + ', ' : ''}${b.nota}/5 ${b.aprovado ? '✅' : '🔁 volta com dicas'}`);
      }),
      (d.revisoes || []).map(rv => el('li', {}, `🔁 Revisão (${MATERIAS[rv.materia]?.nome || ''}, ajuda ${rv.ajuda}): `,
        !rv.feito ? 'não fez' : `${rv.nota}/5 ${rv.aprovado ? '✅' : '🔁 volta de novo'}`))),
      el('p', {}, `Lição de casa: ${casa}`),
      el('button', { class: 'botao secundario', onclick: () => navegar(`#/biblioteca/${d.ano}/${d.diaConteudo}`) }, '📚 Ver a lição completa com respostas'));
    const fotosCasa = el('div', { class: 'miniaturas' }, await imagem(d.fotos.inicio), await imagem(d.fotos.fim));
    if (fotosCasa.childElementCount) corpo.append(fotosCasa);
    if (d.audioLeitura) {
      const m = await db.lerMidia(d.audioLeitura);
      if (m) corpo.append(el('p', {}, `Leitura: “${conteudo?.leitura.titulo || ''}” (${d.duracaoLeitura} s)`), el('audio', { controls: true, src: url(m.blob) }));
    }
    if (d.fotoEscrita) corpo.append(el('p', {}, `Escrita: ${conteudo?.escrita.proposta || ''}`), el('div', { class: 'miniaturas' }, await imagem(d.fotoEscrita)));
    const desafios = (await Promise.all(Object.values(d.fotoDesafio || {}).map(imagem))).filter(Boolean);
    if (desafios.length) corpo.append(el('p', {}, 'Desafios práticos:'), el('div', { class: 'miniaturas' }, desafios));
    if (d.continuadoEm) corpo.append(el('p', { class: 'dica' }, `Não terminou neste dia; continuou em ${exibir(d.continuadoEm)}.`));
    else if (!d.fechado) corpo.append(el('p', { class: 'dica' },
      `Faltou: ${[!st.blocosOk && 'blocos', !st.revisoesOk && 'revisão', !st.fechamentoOk && 'leitura/escrita', !st.casaOk && 'lição de casa'].filter(Boolean).join(', ')}`));
  });
  return det;
}

function seletorRestaurar() {
  const input = el('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onchange: async e => {
      const arq = e.target.files[0];
      if (!arq || !confirm('Restaurar substitui TUDO o que está neste celular pela cópia. Continuar?')) return;
      try { await restaurarCopia(JSON.parse(await arq.text())); aviso('Cópia restaurada!'); navegar('#/hoje'); }
      catch (err) { aviso(err.message); }
    },
  });
  return el('div', {}, el('button', { class: 'botao secundario grande', onclick: () => input.click() }, '📂 Restaurar cópia de segurança'), input);
}

async function trocarSenha() {
  const nova = prompt('Nova senha (4 números):');
  if (nova == null) return;
  if (!pinValido(nova)) return aviso('A senha precisa ter 4 números.');
  await db.gravarConfig('pinHash', await hashPin(nova));
  aviso('Senha trocada.');
}

async function zerarTudo() {
  if (prompt('Isto apaga TUDO deste celular, inclusive fotos e áudios. Digite APAGAR para confirmar.') !== 'APAGAR') return;
  await db.apagarTudo();
  location.hash = '#/configuracao';
  location.reload();
}
