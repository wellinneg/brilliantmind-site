// 👨‍👩‍👧 Primeira tela (#/familia): entrar no grupo da família ANTES de qualquer coisa, sem senha dos
// pais. Assim cada irmão vê os animais que o outro já escolheu e ninguém repete. Só "usar sem
// família" (um filho só) pede a senha do responsável.
import { el, aviso, navegar } from '../ui.js';
import * as db from '../db.js';
import { firebaseConfigurado, lerFamilia, criarFamilia, entrarNaFamilia } from '../familia.js';
import { senhaDosPaisConfere } from '../pin.js';

export const CHAVE_SEM_FAMILIA = 'semFamilia';

/** Precisa passar por esta tela? (Firebase ligado, sem família e sem a escolha "usar sem família"). */
export async function precisaEntrarNaFamilia() {
  if (!firebaseConfigurado()) return false;
  if ((await lerFamilia())?.codigo) return false;
  return !(await db.lerConfig(CHAVE_SEM_FAMILIA));
}

export async function render(raiz) {
  const campo = el('input', { id: 'codigo-familia', maxlength: 9, autocomplete: 'off', placeholder: 'ABCD-2345', style: 'text-transform:uppercase', inputmode: 'text' });
  const botaoEntrar = el('button', { class: 'botao grande', type: 'submit' }, '👨‍👩‍👧 Entrar na família');
  const extra = el('div', {});
  raiz.append(
    el('h1', {}, '👨‍👩‍👧 Primeiro, a sua família'),
    el('p', {}, 'Antes de começar, entre no grupo da família. Assim você vê o animal que o seu irmão já escolheu, e cada um fica com o seu.'),
    el('form', { class: 'cartao', onsubmit: async e => {
      e.preventDefault();
      botaoEntrar.disabled = true;
      try {
        const r = await entrarNaFamilia(campo.value);
        aviso(r.ok ? 'Pronto! Você entrou na família.' : 'Você entrou na família. Quando tiver internet, o placar aparece.');
        navegar('#/hoje');
      } catch (err) { aviso(err.message); botaoEntrar.disabled = false; }
    } },
      el('div', { class: 'campo' }, el('label', { for: 'codigo-familia' }, 'Código da família (está no celular do seu irmão, em 🔒 Pais → Disputa da família)'), campo),
      botaoEntrar),
    el('section', { class: 'cartao' },
      el('h2', {}, 'É o primeiro celular da casa?'),
      el('p', { class: 'dica' }, 'Crie a família aqui. Vai aparecer um código para digitar no celular do irmão.'),
      el('button', { class: 'botao secundario grande', onclick: async e => {
        e.currentTarget.disabled = true;
        const r = await criarFamilia();
        aviso(r.ok ? `Família criada! Código ${r.codigo}` : `Família criada (${r.codigo}). Sem internet agora; o app tenta de novo sozinho.`);
        document.getElementById('app').replaceChildren(
          el('h1', {}, '✨ Família criada!'),
          el('p', {}, 'No celular do irmão, abra o app e digite este código:'),
          el('p', { class: 'codigo-familia grande' }, r.codigo),
          el('p', { class: 'dica' }, 'Ele também fica guardado em 🔒 Pais → Disputa da família. Não divulgue fora de casa.'),
          el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Começar'));
      } }, '✨ Criar a família')),
    el('button', { class: 'link', onclick: () => pedirSenhaParaPular(extra) }, 'Só tem um filho? Usar sem família (pede a senha do responsável)'),
    extra);
  campo.focus();
}

function pedirSenhaParaPular(caixa) {
  if (caixa.childElementCount) { caixa.replaceChildren(); return; }
  const pin = el('input', { id: 'pin-sem-familia', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  caixa.append(el('form', { class: 'cartao', onsubmit: async e => {
    e.preventDefault();
    if (!(await senhaDosPaisConfere(pin.value, await db.lerConfig('pinHash')))) { pin.value = ''; return aviso('Senha errada.'); }
    await db.gravarConfig(CHAVE_SEM_FAMILIA, true);
    navegar('#/hoje');
  } }, el('div', { class: 'campo' }, el('label', { for: 'pin-sem-familia' }, 'Senha do responsável'), pin),
    el('button', { class: 'botao', type: 'submit' }, 'Usar sem família')));
  pin.focus();
}
