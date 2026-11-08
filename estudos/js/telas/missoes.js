// 🎯 Missões (#/missoes): diárias, semanais e a trilha da temporada.
import { el, aviso, navegar } from '../ui.js';
import {
  lerMissoes, modeloDe, resgatarMissao, resgatarNiveis, nivelDaTemporada, premioDoNivel, diasParaAcabarTemporada,
  NIVEIS_TEMPORADA, XP_POR_NIVEL, RECOMPENSA,
} from '../missoes.js';
import { sons } from '../sons.js';
import { confete, pop } from '../efeitos.js';

export function abas(ativa) {
  return el('div', { class: 'abas-missoes' },
    el('button', { class: `aba ${ativa === 'missoes' ? 'ativa' : ''}`, onclick: () => navegar('#/missoes') }, '🎯 Missões'),
    el('button', { class: `aba ${ativa === 'medalhas' ? 'ativa' : ''}`, onclick: () => navegar('#/conquistas') }, '🏆 Medalhas'));
}

export async function render(raiz) {
  const e = await lerMissoes();
  const redesenhar = () => dispatchEvent(new HashChangeEvent('hashchange'));
  raiz.append(abas('missoes'), el('h1', {}, '🎯 Missões'));

  const cartao = (m, tipo) => {
    const mod = modeloDe(m.id);
    const pronta = m.progresso >= mod.alvo;
    const r = RECOMPENSA[tipo];
    return el('div', { class: `missao ${m.coletada ? 'coletada' : pronta ? 'pronta' : ''}` },
      el('div', { class: 'missao-topo' }, el('strong', {}, mod.texto), el('small', {}, `+${r.notas} 💵 · +${r.xp} ⭐`)),
      el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${Math.round((m.progresso / mod.alvo) * 100)}%` }), el('span', {}, `${Math.floor(m.progresso)}/${mod.alvo}`)),
      m.coletada ? el('p', { class: 'dica' }, '✅ Resgatada')
        : pronta ? el('button', { class: 'botao grande', onclick: async ev => {
          try { await resgatarMissao(m.id); sons.conquista(); pop(ev.currentTarget); aviso(`+${r.notas} 💵 e +${r.xp} pontos de temporada!`); redesenhar(); }
          catch (err) { sons.erro(); aviso(err.message); }
        } }, '🎁 Resgatar') : null);
  };
  raiz.append(
    el('section', { class: 'cartao' }, el('h2', {}, '☀️ Missões de hoje'), el('p', { class: 'dica' }, 'Trocam todo dia.'), e.diarias.map(m => cartao(m, 'diaria'))),
    el('section', { class: 'cartao' }, el('h2', {}, '📆 Missões da semana'), el('p', { class: 'dica' }, 'Trocam toda segunda-feira.'), e.semanais.map(m => cartao(m, 'semanal'))));

  // trilha da temporada
  const t = e.temporada;
  const nivel = nivelDaTemporada(t.xp);
  const aResgatar = nivel > t.nivelColetado;
  const trilha = el('div', { class: 'trilha-temporada' }, Array.from({ length: NIVEIS_TEMPORADA }, (_, k) => {
    const n = k + 1;
    const estado = n <= t.nivelColetado ? 'coletado' : n <= nivel ? 'alcancado' : 'futuro';
    return el('div', { class: `degrau ${estado}` }, el('b', {}, n), el('small', {}, n === NIVEIS_TEMPORADA ? '👑' : `${premioDoNivel(n)}`));
  }));
  const noNivel = t.xp - nivel * XP_POR_NIVEL;
  raiz.append(el('section', { class: 'cartao temporada' },
    el('h2', {}, `🏆 Temporada ${t.id}`),
    el('p', { class: 'dica' }, `Acaba em ${diasParaAcabarTemporada(new Date().toISOString().slice(0, 10))} dia(s). Cada missão dá pontos ⭐; cada ${XP_POR_NIVEL} pontos sobe um nível. O nível ${NIVEIS_TEMPORADA} dá o título "Lenda da Temporada".`),
    el('p', {}, `⭐ ${t.xp} pontos · nível ${nivel} de ${NIVEIS_TEMPORADA}`),
    nivel < NIVEIS_TEMPORADA ? el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${noNivel}%` }), el('span', {}, `${noNivel}/${XP_POR_NIVEL} para o nível ${nivel + 1}`)) : el('p', { class: 'conquista-nova' }, '👑 Nível máximo!'),
    trilha,
    aResgatar ? el('button', { class: 'botao grande', onclick: async () => {
      const total = await resgatarNiveis(); sons.camada(); confete(); aviso(`Prêmio da temporada: +${total} 💵!`); redesenhar();
    } }, `🎁 Resgatar prêmios dos níveis (${Array.from({ length: nivel - t.nivelColetado }, (_, k) => premioDoNivel(t.nivelColetado + k + 1)).reduce((a, b) => a + b, 0)} 💵)`) : null,
    (e.titulos || []).length ? el('p', {}, '🏅 Seus títulos: ', el('strong', {}, e.titulos.join(' · '))) : null));
}
