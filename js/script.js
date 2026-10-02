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

// menu hambúrguer (só aparece no celular): abre/fecha e fecha ao escolher um item
const botaoMenu = document.getElementById('topo-menu');
if (topo && botaoMenu) {
  const alternarMenu = (aberto) => {
    topo.classList.toggle('topo--menu-aberto', aberto);
    botaoMenu.setAttribute('aria-expanded', String(aberto));
    botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  };
  botaoMenu.addEventListener('click', () => alternarMenu(!topo.classList.contains('topo--menu-aberto')));
  topo.querySelectorAll('.topo__nav a').forEach((link) => link.addEventListener('click', () => alternarMenu(false)));
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

// lanterna: farol (glow) segue o cursor + vídeo do logo toca uma vez ao entrar
// na seção, congela no último frame ao terminar e só reinicia depois de 1 min
// parado (se o visitante ainda estiver na seção); sair da seção reseta tudo.
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
    const PAUSA_LANTERNA = 60000; // 1 min parado no último frame antes de reiniciar
    let timeoutReinicio = null;
    let dentroDaTela = false;

    const limparTimeout = () => {
      if (timeoutReinicio) {
        clearTimeout(timeoutReinicio);
        timeoutReinicio = null;
      }
    };

    lanternaVideo.loop = false;
    lanternaVideo.pause();
    lanternaVideo.currentTime = 0;

    lanternaVideo.addEventListener('ended', () => {
      limparTimeout();
      timeoutReinicio = setTimeout(() => {
        if (dentroDaTela) {
          lanternaVideo.currentTime = 0;
          lanternaVideo.play().catch(() => {});
        }
      }, PAUSA_LANTERNA);
    });

    const observadorLanterna = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          dentroDaTela = entrada.isIntersecting;
          limparTimeout();
          if (entrada.isIntersecting) {
            lanternaVideo.currentTime = 0;
            lanternaVideo.play().catch(() => {});
          } else {
            lanternaVideo.pause();
            lanternaVideo.currentTime = 0;
          }
        });
      },
      { threshold: 0 }
    );
    observadorLanterna.observe(secaoLanterna);
  }
}

// águia: reprisa o voo; o texto "Voe mais alto" só aparece no início do voo —
// some depois de ~3s e só volta quando o vídeo reinicia do zero
const vooVideo = document.getElementById('voo-video');
if (vooVideo) {
  const PAUSA_NO_FINAL = 10000; // ms travado no logo antes de recomeçar
  const TEMPO_TEXTO_VISIVEL = 2800; // ms com o texto na tela antes de sumir
  const vooTextoEls = document.querySelectorAll('.voo__titulo, .voo__sub, .hero__scroll');
  let vooTextoTimer = null;

  const mostrarTextoVoo = () => {
    clearTimeout(vooTextoTimer);
    vooTextoEls.forEach((el) => el.classList.remove('voo-oculto'));
    vooTextoTimer = setTimeout(() => {
      vooTextoEls.forEach((el) => el.classList.add('voo-oculto'));
    }, TEMPO_TEXTO_VISIVEL);
  };

  vooVideo.addEventListener('ended', () => {
    setTimeout(() => {
      vooVideo.currentTime = 0;
      vooVideo.play().catch(() => {});
      mostrarTextoVoo();
    }, PAUSA_NO_FINAL);
  });

  if (vooTextoEls.length) mostrarTextoVoo();
}

// ano no rodapé
const anoEl = document.getElementById('ano');
if (anoEl) anoEl.textContent = new Date().getFullYear();

// abas de preço por sistema — valores reais de PRECOS_LANCAMENTO_POR_PRODUTO /
// PRECOS_NORMALIZADOS_POR_PRODUTO / PRECOS_MENSAL_LANCAMENTO_POR_PRODUTO em
// comercial/distribuicao-sistemas-bmc/scripts/empacotar_comercial.py e da precificação
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
    nota: 'Sem limite de CNPJs, pague mensal ou feche o ano com desconto.',
  },
  bussola: {
    tiers: [
      { nome: 'Mensal', limite: 'consultas ilimitadas', valor: 'R$ 49,90', sufixo: '/mês' },
      { nome: 'Anual', limite: 'consultas ilimitadas', valor: 'R$ 499', sufixo: '/ano' },
    ],
    nota: 'CNPJ + Simples Nacional + Sintegra em lote, quantas consultas quiser.',
  },
  radar: {
    anual: {
      tiers: [
        { nome: 'Essencial', limite: 'até 3 CNPJs', valor: 'R$ 690', sufixo: '/ano' },
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 1.990', sufixo: '/ano' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 5.490', sufixo: '/ano' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 8.990', sufixo: '/ano' },
      ],
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
    mensal: {
      tiers: [
        { nome: 'Essencial', limite: 'até 3 CNPJs', valor: 'R$ 69', sufixo: '/mês' },
        { nome: 'Básico', limite: 'até 10 CNPJs', valor: 'R$ 199', sufixo: '/mês' },
        { nome: 'Profissional', limite: 'até 50 CNPJs', valor: 'R$ 549', sufixo: '/mês' },
        { nome: 'Corporativo', limite: 'até 100 CNPJs', valor: 'R$ 899', sufixo: '/mês' },
      ],
      nota: 'Preço com descontos exclusivos de lançamento. A partir de 30/11/2026, os preços serão reajustados.',
    },
  },
  emissor: {
    anual: {
      tiers: [
        { nome: 'Até 500 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 499', sufixo: '/ano' },
        { nome: '501 a 2.000 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 649', sufixo: '/ano' },
        { nome: 'Acima de 2.000 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 849', sufixo: '/ano' },
      ],
      nota: 'Sem limite de CNPJs, o valor é só pelo volume de NFS-e emitidas no mês.',
    },
    mensal: {
      tiers: [
        { nome: 'Até 500 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 49,90', sufixo: '/mês' },
        { nome: '501 a 2.000 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 64,90', sufixo: '/mês' },
        { nome: 'Acima de 2.000 NFS/mês', limite: 'CNPJs ilimitados', valor: 'R$ 84,90', sufixo: '/mês' },
      ],
      nota: 'Sem limite de CNPJs, o valor é só pelo volume de NFS-e emitidas no mês.',
    },
  },
};

// manuais em PDF (pasta manuais/, gerados por comercial/distribuicao-sistemas-bmc/scripts/gerar_manuais_site.py)
const manuais = {
  nfe: [{ rotulo: 'Instalação e uso', arquivo: 'manuais/central-fiscal-nfe-cte-instalacao-e-uso.pdf' }],
  nfse: [
    { rotulo: 'Instalação e uso', arquivo: 'manuais/fluxo-nfse-nacional-instalacao-e-uso.pdf' },
    { rotulo: 'Como usar', arquivo: 'manuais/fluxo-nfse-nacional-como-usar.pdf' },
  ],
  fiscal: [{ rotulo: 'Instalação e uso', arquivo: 'manuais/inteligencia-tax-instalacao-e-uso.pdf' }],
  bussola: [{ rotulo: 'Instalação e uso', arquivo: 'manuais/bussola-cnpj-instalacao-e-uso.pdf' }],
  radar: [{ rotulo: 'Instalação e uso', arquivo: 'manuais/radar-judicial-instalacao-e-uso.pdf' }],
  emissor: [
    { rotulo: 'Instalação', arquivo: 'manuais/emissor-nfse-sp-instalacao.pdf' },
    { rotulo: 'Manual de uso', arquivo: 'manuais/emissor-nfse-sp-manual-de-uso.pdf' },
  ],
};

// "Baixar manual: Instalação e uso (PDF) · Como usar (PDF)" para o sistema escolhido
function preencherLinksManuais(elemento, chave, rotuloInicial) {
  elemento.replaceChildren();
  const lista = manuais[chave] || [];
  if (!lista.length) return;
  const rotulo = document.createElement('span');
  rotulo.textContent = rotuloInicial;
  elemento.appendChild(rotulo);
  lista.forEach((m) => {
    const link = document.createElement('a');
    link.href = m.arquivo;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `${m.rotulo} (PDF)`;
    elemento.appendChild(link);
  });
}

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
  if (gradePrecos) {
    gradePrecos.classList.toggle('precos__grade--duas', dados.tiers.length === 2);
    gradePrecos.classList.toggle('precos__grade--quatro', dados.tiers.length === 4);
  }
  if (notaPrecos) notaPrecos.textContent = dados.nota;
  if (precosPeriodo) precosPeriodo.hidden = Boolean(precos[sistemaAtual].tiers);
  const manuaisPrecos = document.getElementById('precos-manuais');
  if (manuaisPrecos) preencherLinksManuais(manuaisPrecos, sistemaAtual, 'Antes de testar, leia o manual:');
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

// clicar num card de sistema (seção "Os sistemas") já leva pro plano dele
document.querySelectorAll('.sistema[data-sistema]').forEach((cartao) => {
  // links de manual dentro do cartão
  const corpoCartao = cartao.querySelector('.sistema__corpo');
  if (corpoCartao) {
    const linhaManuais = document.createElement('p');
    linhaManuais.className = 'sistema__manuais';
    preencherLinksManuais(linhaManuais, cartao.dataset.sistema, 'Baixar manual:');
    corpoCartao.appendChild(linhaManuais);
  }
  cartao.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) return; // clicar no link do manual não leva aos planos
    const aba = document.querySelector(`.aba[data-sistema="${cartao.dataset.sistema}"]`);
    if (aba) aba.click();
    const secaoPrecos = document.getElementById('precos');
    if (secaoPrecos) secaoPrecos.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// CPF / CNPJ: máscara e validação compartilhadas (formulário e carrinho).
// Aceita CPF (11 dígitos) e CNPJ (14 caracteres; desde 07/2026 o CNPJ pode ter
// letras nas 12 primeiras posições, por isso não se restringe a números).
const MSG_DOCUMENTO = 'Informe um CPF (11 números) ou um CNPJ (14 caracteres).';
function limparDocumento(valor) {
  return String(valor).toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
}
function formatarDocumento(valor) {
  const d = limparDocumento(valor);
  const ehCpf = d.length <= 11 && /^\d*$/.test(d);
  const tamanhos = ehCpf ? [3, 3, 3, 2] : [2, 3, 3, 4, 2];
  const separadores = ehCpf ? ['.', '.', '-'] : ['.', '.', '/', '-'];
  let saida = '';
  let pos = 0;
  tamanhos.forEach((n, i) => {
    const parte = d.slice(pos, pos + n);
    if (!parte) return;
    saida += (i > 0 ? separadores[i - 1] : '') + parte;
    pos += n;
  });
  return saida;
}
function documentoValido(valor) {
  const d = limparDocumento(valor);
  return /^\d{11}$/.test(d) || /^[0-9A-Z]{12}\d{2}$/.test(d);
}
function ligarCampoDocumento(campo) {
  campo.addEventListener('input', () => {
    campo.value = formatarDocumento(campo.value);
    campo.setCustomValidity(campo.value && !documentoValido(campo.value) ? MSG_DOCUMENTO : '');
  });
}

// formulário de solicitação — sem backend no site, então o próprio clique
// monta a mensagem e abre o WhatsApp ou o cliente de e-mail já preenchido
// com nome/CNPJ/e-mail/sistema, pra Wellington saber pra onde mandar o
// pacote sem precisar perguntar de novo.
const formSolicitacao = document.getElementById('form-solicitacao');
if (formSolicitacao) {
  const campoNome = document.getElementById('campo-nome');
  const campoDocumento = document.getElementById('campo-documento');
  ligarCampoDocumento(campoDocumento);
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
      `CPF/CNPJ: ${campoDocumento.value.trim()}`,
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
        (querTeste ? 'Teste grátis 3 dias, ' : 'Solicitação de sistema, ') + campoSistema.value
      );
      const corpo = encodeURIComponent(montarMensagem());
      window.location.href = `mailto:contato@brilliantmindcontabilidade.com.br?subject=${assunto}&body=${corpo}`;
    });
  }
}

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
  const campoDoc = document.getElementById('carrinho-documento');
  if (campoDoc) {
    ligarCampoDocumento(campoDoc);
    try { campoDoc.value = formatarDocumento(localStorage.getItem('bmc_carrinho_doc') || ''); } catch (e) {}
    campoDoc.addEventListener('input', () => {
      try { localStorage.setItem('bmc_carrinho_doc', campoDoc.value); } catch (e) {}
    });
  }
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
      info.innerHTML = `<strong>${it.sistema}</strong><br>${it.plano}${it.limite ? ' (' + it.limite + ')' : ''}, ${detalhe}`;
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

  // "X" no canto do painel e tecla Esc também fecham o pedido
  const fecharPainel = () => {
    painel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  const botaoFechar = document.getElementById('carrinho-fechar');
  if (botaoFechar) botaoFechar.addEventListener('click', fecharPainel);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !painel.hidden) fecharPainel();
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
        linhas.push(`- ${it.sistema}, ${it.plano}${it.limite ? ' (' + it.limite + ')' : ''}: ${it.valor}${it.periodo}`);
      });
      if (totalEl.textContent) linhas.push(totalEl.textContent);
    }
    if (testes.length) {
      linhas.push('', 'QUERO FAZER O TESTE GRÁTIS DE 3 DIAS:');
      testes.forEach((it) => {
        linhas.push(`- ${it.sistema}, ${it.plano}${it.limite ? ' (' + it.limite + ')' : ''}`);
      });
    }
    linhas.push('', `CPF/CNPJ do licenciado: ${campoDoc ? campoDoc.value.trim() : ''}`);
    return linhas.join('\n');
  }

  // o sistema é licenciado pelo CPF/CNPJ: sem ele válido o pedido não sai
  const documentoOk = () => {
    if (!campoDoc) return true;
    if (documentoValido(campoDoc.value)) {
      campoDoc.setCustomValidity('');
      return true;
    }
    campoDoc.setCustomValidity(MSG_DOCUMENTO);
    campoDoc.reportValidity();
    campoDoc.focus();
    return false;
  };

  if (btnWpp) {
    btnWpp.addEventListener('click', () => {
      if (!itens.length || !documentoOk()) return;
      window.open('https://wa.me/5511968361503?text=' + encodeURIComponent(montarPedido()), '_blank', 'noopener');
    });
  }
  if (btnEmail) {
    btnEmail.addEventListener('click', () => {
      if (!itens.length || !documentoOk()) return;
      const assunto = encodeURIComponent('Pedido pelo site, ' + itens.map((i) => i.sistema).join(', '));
      window.location.href =
        'mailto:contato@brilliantmindcontabilidade.com.br?subject=' + assunto + '&body=' + encodeURIComponent(montarPedido());
    });
  }

  render();
})();
