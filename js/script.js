const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('ativo');
        observador.unobserve(entrada.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach((el) => observador.observe(el));

// ano no rodapé
const anoEl = document.getElementById('ano');
if (anoEl) anoEl.textContent = new Date().getFullYear();

// abas de preço por sistema
const precos = {
  nfe: [
    { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.200' },
    { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 3.600' },
    { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 5.900' },
  ],
  nfse: [
    { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.200' },
    { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 3.600' },
    { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 5.900' },
  ],
  fiscal: [
    { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.200' },
    { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 3.600' },
    { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 5.900' },
  ],
};

const abas = document.querySelectorAll('.aba');
const cartoesPlano = document.querySelectorAll('.plano');

abas.forEach((aba) => {
  aba.addEventListener('click', () => {
    abas.forEach((a) => a.classList.remove('ativa'));
    aba.classList.add('ativa');

    const dados = precos[aba.dataset.sistema];
    cartoesPlano.forEach((cartao, i) => {
      cartao.querySelector('.plano__nome').textContent = dados[i].nome;
      cartao.querySelector('.plano__limite').textContent = dados[i].limite;
      cartao.querySelector('.plano__valor').innerHTML = `${dados[i].valor}<span>/ano</span>`;
    });
  });
});
