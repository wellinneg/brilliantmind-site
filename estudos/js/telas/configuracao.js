// Primeiro acesso: quem está usando?
// - Responsável: nome de quem vai estudar, série e a senha dos pais (depois entra/cria a família).
// - Filho: só nome, série e o código da família. Sem senha (o 🔒 Pais abre com a senha master
//   e o responsável pode criar a senha deste celular lá dentro).
import { el, navegar, aviso } from '../ui.js';
import * as db from '../db.js';
import { hashPin, pinValido } from '../pin.js';
import { ANOS } from '../rodizio.js';
import { firebaseConfigurado, entrarNaFamilia } from '../familia.js';

const tela = () => document.getElementById('app');   // a área real (o render recebe um rascunho)

const RODAPE = () => [
  el('p', { class: 'dica' }, 'Trocou de celular? Depois de configurar, restaure a cópia de segurança no painel dos pais.'),
  el('p', { class: 'credito' }, 'Sistema desenvolvido pela BMC Contabilidade'),
];

export async function render(raiz) {
  raiz.append(
    el('h1', {}, 'Bem-vindo à Trilha Brilliant Mind! 🚀'),
    el('p', {}, 'Cerca de 50 minutos por dia para aprender o que a escola não ensina.'),
    el('h2', {}, 'Quem está usando agora?'),
    el('div', { class: 'opcoes-papel' },
      el('button', { class: 'botao grande', onclick: () => formulario(tela(), 'filho') }, '🎒 Sou o filho'),
      el('button', { class: 'botao secundario grande', onclick: () => formulario(tela(), 'responsavel') }, '🔒 Sou o responsável')),
    ...RODAPE());
}

function formulario(raiz, papel) {
  const filho = papel === 'filho';
  const nome = el('input', { id: 'nome', autocomplete: 'off', maxlength: 30 });
  const opcao = (valor, texto) => el('label', {}, el('input', { type: 'radio', name: 'ano', value: valor }), ' ', texto);
  const pin1 = el('input', { id: 'pin1', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  const pin2 = el('input', { id: 'pin2', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  const codigo = el('input', { id: 'codigo-familia', maxlength: 9, autocomplete: 'off', placeholder: 'ABCD-2345', style: 'text-transform:uppercase' });
  const comFamilia = filho && firebaseConfigurado();
  const enviar = el('button', { class: 'botao grande', type: 'submit' }, filho ? 'Entrar e começar' : 'Começar a trilha');

  const form = el('form', {
    onsubmit: async e => {
      e.preventDefault();
      const ano = form.querySelector('input[name=ano]:checked')?.value;
      if (!nome.value.trim()) return aviso(filho ? 'Digite o seu nome.' : 'Digite o nome de quem vai estudar.');
      if (!ano) return aviso('Escolha o ano escolar.');
      if (!filho) {
        if (!pinValido(pin1.value)) return aviso('A senha precisa ter 4 números.');
        if (pin1.value !== pin2.value) return aviso('As duas senhas não são iguais.');
      }
      enviar.disabled = true;
      try {
        if (comFamilia) {
          if (!codigo.value.trim()) { enviar.disabled = false; return aviso('Digite o código da família.'); }
          await entrarNaFamilia(codigo.value);          // confere se a família existe antes de seguir
        }
        if (!filho) await db.gravarConfig('pinHash', await hashPin(pin1.value));
        await db.gravarConfig('perfil', { nome: nome.value.trim(), ano, papel });
        navegar('#/hoje');                              // responsável cai na tela da família em seguida
      } catch (err) { aviso(err.message); enviar.disabled = false; }
    },
  },
    el('div', { class: 'campo' }, el('label', { for: 'nome' }, filho ? 'Seu nome' : 'Nome de quem vai estudar'), nome),
    el('div', { class: 'campo' }, el('span', {}, filho ? 'Seu ano na escola' : 'Ano escolar'), el('div', { class: 'opcoes grade' }, Object.entries(ANOS).map(([v, t]) => opcao(v, t)))),
    ...(comFamilia ? [
      el('h2', {}, '👨‍👩‍👧 Grupo da família'),
      el('p', { class: 'dica' }, 'Peça o código para o responsável. Ele aparece no outro celular em 🔒 Pais → Disputa da família.'),
      el('div', { class: 'campo' }, el('label', { for: 'codigo-familia' }, 'Código da família'), codigo),
    ] : []),
    ...(!filho ? [
      el('h2', {}, '🔒 Senha do responsável'),
      el('p', { class: 'dica' }, 'Crie uma senha de 4 números para o painel dos pais. Não conte para a criança.'),
      el('div', { class: 'campo' }, el('label', { for: 'pin1' }, 'Senha'), pin1),
      el('div', { class: 'campo' }, el('label', { for: 'pin2' }, 'Repita a senha'), pin2),
    ] : []),
    enviar);

  raiz.replaceChildren(
    el('button', { class: 'voltar', onclick: () => { tela().replaceChildren(); render(tela()); } }, '← Voltar'),
    el('h1', {}, filho ? '🎒 Vamos começar!' : '🔒 Configuração do responsável'),
    form,
    ...RODAPE());
  nome.focus();
}
