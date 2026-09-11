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

// lanterna: farol (glow) segue o cursor + vídeo do logo avança/recua com o scroll
const secaoLanterna = document.querySelector('.secao--lanterna');
const lanternaVideo = document.getElementById('logo-video');
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

  if (lanternaVideo) {
    lanternaVideo.pause();
    lanternaVideo.removeAttribute('autoplay');
    lanternaVideo.removeAttribute('loop');
    let duracao = 0;
    let tick = false;

    const scrub = () => {
      tick = false;
      if (!duracao) return;
      const r = secaoLanterna.getBoundingClientRect();
      const total = secaoLanterna.offsetHeight - window.innerHeight;
      const progresso = Math.min(Math.max(-r.top / total, 0), 1);
      const alvo = progresso * duracao;
      if (Math.abs(alvo - lanternaVideo.currentTime) > 0.03) {
        try { lanternaVideo.currentTime = alvo; } catch (e) {}
      }
    };

    const aoRolar = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(scrub);
      }
    };

    lanternaVideo.addEventListener('loadedmetadata', () => {
      duracao = lanternaVideo.duration || 0;
      scrub();
    });
    if (lanternaVideo.readyState >= 1) {
      duracao = lanternaVideo.duration || 0;
      scrub();
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
  }
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
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
    mensal: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 120', sufixo: '/mês' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 360', sufixo: '/mês' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 590', sufixo: '/mês' },
      ],
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
  },
  nfse: {
    anual: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 720', sufixo: '/ano' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 2.160', sufixo: '/ano' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 3.540', sufixo: '/ano' },
      ],
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
    mensal: {
      tiers: [
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 72', sufixo: '/mês' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 216', sufixo: '/mês' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 354', sufixo: '/mês' },
      ],
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
  },
  fiscal: {
    tiers: [
      { nome: 'Mensal', limite: 'CNPJs ilimitados', valor: 'R$ 109,90', sufixo: '/mês' },
      { nome: 'Anual', limite: 'CNPJs ilimitados', valor: 'R$ 999', sufixo: '/ano' },
    ],
    nota: 'Sem limite de CNPJs — pague mensal ou feche o ano com desconto.',
  },
  bussola: {
    tiers: [
      { nome: 'Mensal', limite: 'consultas ilimitadas', valor: 'R$ 49,90', sufixo: '/mês' },
      { nome: 'Anual', limite: 'consultas ilimitadas', valor: 'R$ 499', sufixo: '/ano' },
    ],
    nota: 'CNPJ + Simples Nacional + Sintegra em lote, quantas consultas quiser.',
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

// ---------- carrinho (seleção + envio por WhatsApp/e-mail, sem backend) ----------
(function () {
  const el = document.getElementById('carrinho');
  const toggle = document.getElementById('carrinho-toggle');
  const painel = document.getElementById('carrinho-painel');
  const contador = document.getElementById('carrinho-contador');
  const lista = document.getElementById('carrinho-lista');
  const totalEl = document.getElementById('carrinho-total');
  const btnWpp = document.getElementById('carrinho-whatsapp');
  const btnEmail = document.getElementById('carrinho-email');
  if (!el || !toggle || !painel) return;

  const CHAVE = 'bmc_carrinho';
  let itens = [];
  try { itens = JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch (e) { itens = []; }

  const salvar = () => {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (e) {}
  };

  const paraNumero = (valor) => {
    const limpo = String(valor).replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  };
  const formatarBRL = (n) =>
    'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  function renderTotais() {
    const somas = {};
    itens.forEach((it) => {
      if (!it.valorNum) return;
      somas[it.periodo] = (somas[it.periodo] || 0) + it.valorNum;
    });
    const partes = Object.keys(somas).map((p) => `${formatarBRL(somas[p])}${p}`);
    totalEl.textContent = partes.length ? 'Total: ' + partes.join('  +  ') : '';
  }

  function render() {
    contador.textContent = String(itens.length);
    el.hidden = false;
    const vazio = itens.length === 0;
    if (btnWpp) btnWpp.disabled = vazio;
    if (btnEmail) btnEmail.disabled = vazio;
    lista.innerHTML = '';
    if (vazio) {
      const li = document.createElement('li');
      li.className = 'carrinho__vazio';
      li.textContent = 'Seu pedido está vazio. Escolha um plano acima: "Adicionar" para contratar ou "Iniciar teste grátis" para testar 3 dias.';
      lista.appendChild(li);
      renderTotais();
      return;
    }
    itens.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'carrinho__item';
      const info = document.createElement('div');
      const detalhe = it.modo === 'teste'
        ? '<em>teste grátis 3 dias</em>'
        : `${it.valor}${it.periodo}`;
      info.innerHTML = `<strong>${it.sistema}</strong><br>${it.plano}${it.limite ? ' (' + it.limite + ')' : ''} — ${detalhe}`;
      const rm = document.createElement('button');
      rm.className = 'carrinho__remover';
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remover');
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        itens.splice(i, 1);
        salvar();
        render();
      });
      li.appendChild(info);
      li.appendChild(rm);
      lista.appendChild(li);
    });
    renderTotais();
  }

  toggle.addEventListener('click', () => {
    const aberto = !painel.hidden;
    painel.hidden = aberto;
    toggle.setAttribute('aria-expanded', String(!aberto));
  });

  const rotularModo = (modo) => (modo === 'teste' ? 'Iniciar teste grátis' : 'Adicionar');

  function ligarBotoesPlano(seletor, modo) {
    document.querySelectorAll(seletor).forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.plano');
        const abaAtiva = document.querySelector('.aba.ativa');
        const periodoAtivo = document.querySelector('.periodo.ativa');
        const sistema = abaAtiva ? abaAtiva.textContent.trim() : 'Sistema';
        const plano = card.querySelector('.plano__nome').textContent.trim();
        const limite = card.querySelector('.plano__limite').textContent.trim();
        const valorTxt = card.querySelector('.plano__valor').textContent.trim();
        const sufixoMatch = valorTxt.match(/\/(mês|ano)/);
        const periodo = sufixoMatch ? '/' + sufixoMatch[1] : (periodoAtivo ? '/' + periodoAtivo.dataset.periodo : '');
        const valor = valorTxt.replace(/\/(mês|ano)/, '').trim();

        const jaTem = itens.some(
          (it) => it.sistema === sistema && it.plano === plano && it.periodo === periodo && it.modo === modo
        );
        if (!jaTem) {
          itens.push({
            sistema, plano, limite, valor, periodo, modo,
            valorNum: modo === 'teste' ? 0 : paraNumero(valor),
          });
          salvar();
          render();
        }
        painel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        btn.classList.add('adicionado');
        btn.textContent = jaTem ? 'Já no pedido' : (modo === 'teste' ? 'No pedido ✓' : 'Adicionado ✓');
        setTimeout(() => {
          btn.classList.remove('adicionado');
          btn.textContent = rotularModo(modo);
        }, 1600);
      });
    });
  }
  ligarBotoesPlano('.plano__add', 'compra');
  ligarBotoesPlano('.plano__teste', 'teste');

  function montarPedido() {
    const compras = itens.filter((it) => it.modo !== 'teste');
    const testes = itens.filter((it) => it.modo === 'teste');
    const linhas = ['Olá! Montei meu pedido no site da BMC Automação Contábil:'];
    if (compras.length) {
      linhas.push('', 'QUERO CONTRATAR:');
      compras.forEach((it) => {
        linhas.push(`- ${it.sistema} — ${it.plano}${it.limite ? ' (' + it.limite + ')' : ''}: ${it.valor}${it.periodo}`);
      });
      if (totalEl.textContent) linhas.push(totalEl.textContent);
    }
    if (testes.length) {
      linhas.push('', 'QUERO FAZER O TESTE GRÁTIS DE 3 DIAS:');
      testes.forEach((it) => {
        linhas.push(`- ${it.sistema} — ${it.plano}${it.limite ? ' (' + it.limite + ')' : ''}`);
      });
    }
    return linhas.join('\n');
  }

  if (btnWpp) {
    btnWpp.addEventListener('click', () => {
      if (!itens.length) return;
      window.open('https://wa.me/5511968361503?text=' + encodeURIComponent(montarPedido()), '_blank', 'noopener');
    });
  }
  if (btnEmail) {
    btnEmail.addEventListener('click', () => {
      if (!itens.length) return;
      const assunto = encodeURIComponent('Pedido pelo site — ' + itens.map((i) => i.sistema).join(', '));
      window.location.href =
        'mailto:contato@brilliantmindcontabilidade.com.br?subject=' + assunto + '&body=' + encodeURIComponent(montarPedido());
    });
  }

  render();
})();
