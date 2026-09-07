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

const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// header ganha fundo/blur depois que rola um pouco
const topo = document.querySelector('.topo');
if (topo) {
  const alternarTopo = () => topo.classList.toggle('topo--rolado', window.scrollY > 60);
  alternarTopo();
  window.addEventListener('scroll', alternarTopo, { passive: true });
}

// parallax leve do texto do hero ao rolar
const heroConteudo = document.querySelector('.hero__conteudo');
const heroSecao = document.querySelector('.secao--hero');
if (heroConteudo && heroSecao && !semMovimento) {
  let ticando = false;
  const aplicarParallax = () => {
    ticando = false;
    const altura = heroSecao.offsetHeight;
    const inicio = heroSecao.offsetTop;
    const progresso = Math.min(Math.max((window.scrollY - inicio) / altura, 0), 1);
    heroConteudo.style.transform = `translateY(${progresso * 60}px)`;
    heroConteudo.style.opacity = String(1 - progresso * 1.1);
  };
  aplicarParallax();
  window.addEventListener('scroll', () => {
    if (!ticando) {
      ticando = true;
      requestAnimationFrame(aplicarParallax);
    }
  }, { passive: true });
}

// glow que segue o cursor no hero
const heroGlow = document.querySelector('.hero__glow');
if (heroSecao && heroGlow && !semMovimento) {
  heroSecao.addEventListener('mousemove', (evento) => {
    const retangulo = heroSecao.getBoundingClientRect();
    const x = ((evento.clientX - retangulo.left) / retangulo.width) * 100;
    const y = ((evento.clientY - retangulo.top) / retangulo.height) * 100;
    heroGlow.style.setProperty('--x', `${x}%`);
    heroGlow.style.setProperty('--y', `${y}%`);
  });
}

// lanterna: farol segue o cursor/dedo e revela o interruptor escondido
const secaoLanterna = document.querySelector('.secao--lanterna');
if (secaoLanterna) {
  const moverFarol = (x, y) => {
    const retangulo = secaoLanterna.getBoundingClientRect();
    const px = ((x - retangulo.left) / retangulo.width) * 100;
    const py = ((y - retangulo.top) / retangulo.height) * 100;
    secaoLanterna.style.setProperty('--lx', `${px}%`);
    secaoLanterna.style.setProperty('--ly', `${py}%`);
  };
  secaoLanterna.addEventListener('mousemove', (evento) => moverFarol(evento.clientX, evento.clientY));
  secaoLanterna.addEventListener('touchmove', (evento) => {
    const toque = evento.touches[0];
    if (toque) moverFarol(toque.clientX, toque.clientY);
  }, { passive: true });

  const interruptor = document.getElementById('interruptor');
  const logoToggle = document.getElementById('logo-toggle');
  if (interruptor && logoToggle) {
    interruptor.addEventListener('click', () => {
      const ligado = interruptor.classList.toggle('ligado');
      logoToggle.classList.toggle('ligado', ligado);
    });
  }
}

// ano no rodapé
const anoEl = document.getElementById('ano');
if (anoEl) anoEl.textContent = new Date().getFullYear();

// abas de preço por sistema — valores reais de PRECOS_LANCAMENTO_POR_PRODUTO /
// PRECOS_NORMALIZADOS_POR_PRODUTO em comercial/nfe-distribuicao/scripts/empacotar_comercial.py
// e da precificação registrada do Olho de Águia Fiscal (mensal/anual, sem limite de CNPJ).
const precos = {
  nfe: {
    tiers: [
      { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.200', sufixo: '/ano' },
      { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 3.600', sufixo: '/ano' },
      { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 5.900', sufixo: '/ano' },
    ],
    nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 1.560 / R$ 4.680 / R$ 7.670 por ano.',
  },
  nfse: {
    tiers: [
      { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 720', sufixo: '/ano' },
      { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 2.160', sufixo: '/ano' },
      { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 3.540', sufixo: '/ano' },
    ],
    nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 936 / R$ 2.808 / R$ 4.602 por ano.',
  },
  fiscal: {
    tiers: [
      { nome: 'Mensal', limite: 'CNPJs ilimitados', valor: 'R$ 109,90', sufixo: '/mês' },
      { nome: 'Anual', limite: 'CNPJs ilimitados', valor: 'R$ 999', sufixo: '/ano' },
    ],
    nota: 'Sem limite de CNPJs — pague mensal ou feche o ano com desconto.',
  },
};

const abas = document.querySelectorAll('.aba');
const cartoesPlano = document.querySelectorAll('.plano');
const gradePrecos = document.querySelector('.precos__grade');
const notaPrecos = document.getElementById('precos-nota');

function aplicarPrecos(sistema) {
  const dados = precos[sistema];
  cartoesPlano.forEach((cartao, i) => {
    const tier = dados.tiers[i];
    cartao.hidden = !tier;
    if (!tier) return;
    cartao.querySelector('.plano__nome').textContent = tier.nome;
    cartao.querySelector('.plano__limite').textContent = tier.limite;
    cartao.querySelector('.plano__valor').innerHTML = `${tier.valor}<span>${tier.sufixo}</span>`;
  });
  if (gradePrecos) gradePrecos.classList.toggle('precos__grade--duas', dados.tiers.length === 2);
  if (notaPrecos) notaPrecos.textContent = dados.nota;
}

abas.forEach((aba) => {
  aba.addEventListener('click', () => {
    abas.forEach((a) => a.classList.remove('ativa'));
    aba.classList.add('ativa');
    aplicarPrecos(aba.dataset.sistema);
  });
});

aplicarPrecos('nfe');
