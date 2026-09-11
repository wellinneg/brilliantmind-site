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

// lanterna: farol (glow) segue o cursor/dedo sobre o vídeo do logo
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
}

// águia: reprisa os últimos 2s do voo 3 vezes antes de congelar no logo final
const vooVideo = document.getElementById('voo-video');
if (vooVideo) {
  const PAUSA_NO_FINAL = 10000; // ms travado no logo antes de recomeçar
  vooVideo.addEventListener('ended', () => {
    setTimeout(() => {
      vooVideo.currentTime = 0;
      vooVideo.play().catch(() => {});
    }, PAUSA_NO_FINAL);
  });
}

// ano no rodapé
const anoEl = document.getElementById('ano');
if (anoEl) anoEl.textContent = new Date().getFullYear();

// abas de preço por sistema — valores reais de PRECOS_LANCAMENTO_POR_PRODUTO /
// PRECOS_NORMALIZADOS_POR_PRODUTO / PRECOS_MENSAL_LANCAMENTO_POR_PRODUTO em
// comercial/nfe-distribuicao/scripts/empacotar_comercial.py e da precificação
// registrada do Inteligência Tax (mensal/anual, sem limite de CNPJ — esse
// não tem seletor de período porque já mostra os dois planos lado a lado).
const precos = {
  nfe: {
    anual: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.200', sufixo: '/ano' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 3.600', sufixo: '/ano' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 5.900', sufixo: '/ano' },
      ],
      nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 1.560 / R$ 4.680 / R$ 7.670 por ano.',
    },
    mensal: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 120', sufixo: '/mês' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 360', sufixo: '/mês' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 590', sufixo: '/mês' },
      ],
      nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 156 / R$ 468 / R$ 767 por mês.',
    },
  },
  nfse: {
    anual: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 720', sufixo: '/ano' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 2.160', sufixo: '/ano' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 3.540', sufixo: '/ano' },
      ],
      nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 936 / R$ 2.808 / R$ 4.602 por ano.',
    },
    mensal: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 72', sufixo: '/mês' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 216', sufixo: '/mês' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 354', sufixo: '/mês' },
      ],
      nota: 'Preço de lançamento até 30/11/2026 — depois passa a R$ 94 / R$ 281 / R$ 460 por mês.',
    },
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
const botoesPeriodo = document.querySelectorAll('.periodo');
const precosPeriodo = document.getElementById('precos-periodo');
const cartoesPlano = document.querySelectorAll('.plano');
const gradePrecos = document.querySelector('.precos__grade');
const notaPrecos = document.getElementById('precos-nota');

let sistemaAtual = 'nfe';
let periodoAtual = 'anual';

function obterDadosAtuais() {
  const bloco = precos[sistemaAtual];
  return bloco.tiers ? bloco : bloco[periodoAtual];
}

function aplicarPrecos() {
  const dados = obterDadosAtuais();
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
  if (precosPeriodo) precosPeriodo.hidden = Boolean(precos[sistemaAtual].tiers);
}

abas.forEach((aba) => {
  aba.addEventListener('click', () => {
    abas.forEach((a) => a.classList.remove('ativa'));
    aba.classList.add('ativa');
    sistemaAtual = aba.dataset.sistema;
    periodoAtual = 'anual';
    botoesPeriodo.forEach((b) => b.classList.toggle('ativa', b.dataset.periodo === 'anual'));
    aplicarPrecos();
  });
});

botoesPeriodo.forEach((botao) => {
  botao.addEventListener('click', () => {
    botoesPeriodo.forEach((b) => b.classList.remove('ativa'));
    botao.classList.add('ativa');
    periodoAtual = botao.dataset.periodo;
    aplicarPrecos();
  });
});

aplicarPrecos();

// formulário de solicitação — sem backend no site, então o próprio clique
// monta a mensagem e abre o WhatsApp ou o cliente de e-mail já preenchido
// com nome/CNPJ/e-mail/sistema, pra Wellington saber pra onde mandar o
// pacote sem precisar perguntar de novo.
const formSolicitacao = document.getElementById('form-solicitacao');
if (formSolicitacao) {
  const campoNome = document.getElementById('campo-nome');
  const campoCnpj = document.getElementById('campo-cnpj');
  const campoEmail = document.getElementById('campo-email');
  const campoSistema = document.getElementById('campo-sistema');
  const campoMensagem = document.getElementById('campo-mensagem');
  const campoTesteGratis = document.getElementById('campo-teste-gratis');
  const aviso = document.getElementById('form-solicitacao-aviso');

  const validar = () => {
    const ok = formSolicitacao.checkValidity();
    if (!ok) {
      formSolicitacao.reportValidity();
      if (aviso) aviso.hidden = false;
    } else if (aviso) {
      aviso.hidden = true;
    }
    return ok;
  };

  const montarMensagem = () => {
    const querTeste = campoTesteGratis && campoTesteGratis.checked;
    const linhas = [
      querTeste
        ? 'Quero começar com o TESTE GRÁTIS DE 3 DIAS de um sistema da BMC Automação Contábil.'
        : 'Quero conhecer/contratar um sistema da BMC Automação Contábil.',
      `Nome / Razão Social: ${campoNome.value.trim()}`,
      `CNPJ: ${campoCnpj.value.trim()}`,
      `E-mail: ${campoEmail.value.trim()}`,
      `Sistema de interesse: ${campoSistema.value}`,
    ];
    if (campoMensagem.value.trim()) {
      linhas.push(`Mensagem: ${campoMensagem.value.trim()}`);
    }
    return linhas.join('\n');
  };

  const botaoWhatsapp = document.getElementById('botao-enviar-whatsapp');
  if (botaoWhatsapp) {
    botaoWhatsapp.addEventListener('click', () => {
      if (!validar()) return;
      const texto = encodeURIComponent(montarMensagem());
      window.open(`https://wa.me/5511968361503?text=${texto}`, '_blank', 'noopener');
    });
  }

  const botaoEmail = document.getElementById('botao-enviar-email');
  if (botaoEmail) {
    botaoEmail.addEventListener('click', () => {
      if (!validar()) return;
      const querTeste = campoTesteGratis && campoTesteGratis.checked;
      const assunto = encodeURIComponent(
        (querTeste ? 'Teste grátis 3 dias — ' : 'Solicitação de sistema — ') + campoSistema.value
      );
      const corpo = encodeURIComponent(montarMensagem());
      window.location.href = `mailto:contato@brilliantmindcontabilidade.com.br?subject=${assunto}&body=${corpo}`;
    });
  }
}

// abas de vídeo demo (Veja funcionando) — troca o src e o texto
const demoAbas = document.querySelectorAll('.demo__aba');
const demoVideo = document.getElementById('demo-video');
const demoTexto = document.getElementById('demo-texto');
demoAbas.forEach((aba) => {
  aba.addEventListener('click', () => {
    demoAbas.forEach((a) => a.classList.remove('ativa'));
    aba.classList.add('ativa');
    if (demoVideo) {
      demoVideo.src = aba.dataset.video;
      demoVideo.load();
      demoVideo.play().catch(() => {});
    }
    if (demoTexto && aba.dataset.texto) demoTexto.textContent = aba.dataset.texto;
  });
});
