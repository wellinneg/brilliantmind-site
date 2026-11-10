// Trocar VERSAO a cada publicação que muda JS/CSS. Conteúdo novo não precisa.
const VERSAO = 'trilha-v48';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'fonts/sora-latin.woff2', 'fonts/sora-latin-ext.woff2',
  'icones/icone-192.png', 'icones/icone-512.png',
  'js/app.js', 'js/ui.js', 'js/datas.js', 'js/rodizio.js', 'js/quiz.js', 'js/conquistas.js',
  'js/pin.js', 'js/db.js', 'js/estado.js', 'js/conteudo.js', 'js/fotos.js', 'js/audio.js',
  'js/backup.js', 'js/quiz-ui.js',
  'js/telas/configuracao.js', 'js/telas/hoje.js', 'js/telas/licao.js', 'js/telas/fechamento.js',
  'js/telas/conquistas.js', 'js/telas/revisao.js', 'js/telas/retorno.js', 'js/telas/pais.js', 'js/telas/serie.js', 'js/telas/biblioteca.js', 'js/telas/mapa.js', 'js/jogo.js', 'js/herois.js', 'js/sons.js', 'js/comemorar.js', 'js/panorama.js', 'js/tabuleiro.js', 'js/calendario.js', 'js/missoes.js', 'js/duelo.js', 'js/telas/duelo.js', 'js/telas/missoes.js', 'js/telas/heroi.js', 'js/cenas.js', 'js/telas/lugar.js', 'js/telas/jogo.js', 'js/telas/jogos.js', 'js/telas/ouvir.js', 'js/telas/prova.js', 'js/narrador.js', 'js/intro-prova.js', 'js/efeitos.js', 'js/apresentacao.js', 'js/banco.js', 'js/empresa.js', 'js/patrimonio.js', 'js/inicio-oficial.js', 'js/resumo-estudo.js', 'js/desempenho.js', 'js/telas/entrar-familia.js', 'js/desempate.js', 'js/telas/desempate.js', 'js/papeis.js', 'js/batalha.js', 'js/telas/chefao.js', 'js/telas/empresa.js', 'js/telas/banco.js', 'js/minijogos/motor.js', 'js/minijogos/vocabulario.js', 'js/minijogos/vocabulario-extra.js', 'js/minijogos/palavras.js', 'js/minijogos/objetos.js', 'js/minijogos/objetos-ilustrados.js', 'js/minijogos/cenas-ilustradas.js', 'js/minijogos/memoria.js', 'js/minijogos/caixa.js', 'js/minijogos/rapidos.js', 'js/minijogos/logica.js', 'js/minijogos/quente.js', 'js/minijogos/cenarios.js', 'js/familia.js', 'js/familia-config.js', 'js/telas/familia-pais.js', 'js/sessao-pais.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.url.includes('/conteudo/')) {
    e.respondWith(fetch(req).then(resp => {
      if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return resp;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  if (req.url.includes('/midia/')) {
    // imagens e vídeos dos personagens: guarda no celular na 1ª vez que aparecem (só resposta inteira)
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(cache => cache || fetch(req).then(resp => {
      if (resp.status === 200) { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
      return resp;
    })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cache => cache || fetch(req)));
});
