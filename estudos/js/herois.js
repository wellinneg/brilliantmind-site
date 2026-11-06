// Heróis originais em vetor (estilo desenho animado moderno: degradê, sombra, olhos com brilho).
// Desenho em 100 × 160. "acessorios" diz onde chapéu e óculos ficam (em % da altura/largura).
import { LOJA } from './jogo.js';

const olho = (cx, cy, r = 9) => `
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="#fff"/>
  <circle cx="${cx + r * 0.15}" cy="${cy + r * 0.15}" r="${r * 0.62}" fill="#1B1F3B"/>
  <circle cx="${cx + r * 0.38}" cy="${cy - r * 0.22}" r="${r * 0.24}" fill="#fff"/>
  <circle cx="${cx - r * 0.18}" cy="${cy + r * 0.42}" r="${r * 0.1}" fill="#fff" opacity=".8"/>`;

const SOMBRA = '<ellipse cx="50" cy="153" rx="30" ry="6" fill="#000" opacity=".28"/>';

const DESENHOS = {
  dino: {
    acessorios: { cabeca: { top: '-12%' }, rosto: { top: '17%' } },
    svg: `
      <defs>
        <linearGradient id="dino-pele" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7EE07A"/><stop offset="1" stop-color="#2E9E4F"/></linearGradient>
        <linearGradient id="dino-barriga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6FFD9"/><stop offset="1" stop-color="#C9EE9A"/></linearGradient>
      </defs>
      ${SOMBRA}
      <path d="M30 118 C10 120 4 104 8 96 C14 106 22 108 32 104 Z" fill="url(#dino-pele)"/>
      <path d="M34 40 L40 26 L46 40 Z M48 34 L54 18 L60 34 Z M62 40 L68 27 L72 42 Z" fill="#FF9F1C"/>
      <path d="M28 96 C24 70 30 46 50 44 C70 46 76 70 72 96 C70 122 62 134 50 134 C38 134 30 122 28 96 Z" fill="url(#dino-pele)"/>
      <path d="M38 94 C38 80 44 74 50 74 C56 74 62 80 62 94 C62 114 57 126 50 126 C43 126 38 114 38 94 Z" fill="url(#dino-barriga)"/>
      <path d="M40 104 h20 M41 113 h18" stroke="#A6D36B" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="50" cy="40" rx="30" ry="27" fill="url(#dino-pele)"/>
      <ellipse cx="42" cy="30" rx="12" ry="6" fill="#fff" opacity=".25"/>
      ${olho(39, 38, 8.5)}${olho(61, 38, 8.5)}
      <circle cx="30" cy="52" r="4" fill="#FF8FA3" opacity=".6"/><circle cx="70" cy="52" r="4" fill="#FF8FA3" opacity=".6"/>
      <path d="M38 55 Q50 66 62 55" fill="#7A1F2B" stroke="#1B5E20" stroke-width="2"/>
      <path d="M42 56 l3 4 l3 -4 M52 56 l3 4 l3 -4" fill="#fff"/>
      <path d="M28 84 C20 86 18 92 22 96" stroke="#2E9E4F" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M72 84 C80 86 82 92 78 96" stroke="#2E9E4F" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="38" cy="140" rx="11" ry="7" fill="#2E9E4F"/><ellipse cx="62" cy="140" rx="11" ry="7" fill="#2E9E4F"/>
      <path d="M31 141 h3 M36 143 h3 M59 143 h3 M64 141 h3" stroke="#F6FFD9" stroke-width="2" stroke-linecap="round"/>`,
  },
  super: {
    acessorios: { cabeca: { top: '-14%' }, rosto: { top: '15%' } },
    svg: `
      <defs>
        <linearGradient id="sup-capa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4D4D"/><stop offset="1" stop-color="#B71C1C"/></linearGradient>
        <linearGradient id="sup-roupa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F8BFF"/><stop offset="1" stop-color="#1846B8"/></linearGradient>
        <radialGradient id="sup-pele" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFD9B8"/><stop offset="1" stop-color="#E6A57A"/></radialGradient>
      </defs>
      ${SOMBRA}
      <path d="M30 74 C18 100 16 128 22 146 L78 146 C84 128 82 100 70 74 Z" fill="url(#sup-capa)"/>
      <path d="M34 78 C30 96 32 118 36 132 L64 132 C68 118 70 96 66 78 Z" fill="url(#sup-roupa)"/>
      <path d="M52 86 L44 102 L51 102 L46 118 L60 98 L53 98 L58 86 Z" fill="#FFD600" stroke="#F9A825" stroke-width="1"/>
      <rect x="36" y="118" width="28" height="5" rx="2" fill="#FFD600"/>
      <path d="M34 82 C24 88 22 100 26 110" stroke="url(#sup-roupa)" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M66 82 C76 88 78 100 74 110" stroke="url(#sup-roupa)" stroke-width="9" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="112" r="6" fill="#D32F2F"/><circle cx="74" cy="112" r="6" fill="#D32F2F"/>
      <rect x="37" y="130" width="11" height="12" rx="3" fill="url(#sup-roupa)"/><rect x="52" y="130" width="11" height="12" rx="3" fill="url(#sup-roupa)"/>
      <path d="M34 144 h16 v-7 h-14 Z M50 144 h16 l-2 -7 h-14 Z" fill="#D32F2F"/>
      <circle cx="50" cy="44" r="30" fill="url(#sup-pele)"/>
      <path d="M20 40 C20 16 38 8 54 10 C70 10 82 22 80 40 C74 30 66 26 58 30 C52 22 40 22 34 30 C28 30 24 34 20 40 Z" fill="#1F1F2E"/>
      <path d="M22 44 C30 34 70 34 78 44 C78 54 70 58 50 54 C30 58 22 54 22 44 Z" fill="#1846B8"/>
      ${olho(39, 45, 7.5)}${olho(61, 45, 7.5)}
      <path d="M41 62 Q50 70 59 62" stroke="#8E3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="60" r="3.5" fill="#FF8FA3" opacity=".5"/><circle cx="70" cy="60" r="3.5" fill="#FF8FA3" opacity=".5"/>`,
  },
  carro: {
    acessorios: { cabeca: { top: '10%' }, rosto: { top: '36%' } },
    svg: `
      <defs>
        <linearGradient id="car-lata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B6B"/><stop offset=".55" stop-color="#E53935"/><stop offset="1" stop-color="#A31515"/></linearGradient>
        <linearGradient id="car-vidro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3F6FF"/><stop offset="1" stop-color="#8FD3FF"/></linearGradient>
      </defs>
      ${SOMBRA}
      <rect x="14" y="62" width="10" height="16" rx="2" fill="#B71C1C"/><rect x="8" y="58" width="22" height="6" rx="3" fill="#212121"/>
      <path d="M12 118 C10 100 14 90 24 86 L30 66 C33 56 40 52 50 52 C60 52 67 56 70 66 L76 86 C86 90 90 100 88 118 Z" fill="url(#car-lata)"/>
      <path d="M33 86 L37 68 C39 62 44 60 50 60 C56 60 61 62 63 68 L67 86 Z" fill="url(#car-vidro)" stroke="#7A0F0F" stroke-width="2"/>
      ${olho(43, 74, 6.5)}${olho(57, 74, 6.5)}
      <path d="M36 64 C40 61 44 60 47 60" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/>
      <circle cx="50" cy="100" r="9" fill="#fff"/><text x="50" y="104.5" text-anchor="middle" font-size="12" font-weight="900" fill="#E53935" font-family="Arial">7</text>
      <path d="M38 112 Q50 120 62 112" stroke="#5D0C0C" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="22" cy="104" rx="5" ry="4" fill="#FFF59D"/><ellipse cx="78" cy="104" rx="5" ry="4" fill="#FFF59D"/>
      <path d="M14 96 h12 M74 96 h12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      <circle cx="28" cy="128" r="14" fill="#212121"/><circle cx="28" cy="128" r="6.5" fill="#BDBDBD"/><circle cx="28" cy="128" r="2" fill="#616161"/>
      <circle cx="72" cy="128" r="14" fill="#212121"/><circle cx="72" cy="128" r="6.5" fill="#BDBDBD"/><circle cx="72" cy="128" r="2" fill="#616161"/>`,
  },
  alien: {
    acessorios: { cabeca: { top: '-6%' }, rosto: { top: '22%' } },
    svg: `
      <defs>
        <radialGradient id="ali-pele" cx=".4" cy=".3" r=".75"><stop offset="0" stop-color="#B6FF8A"/><stop offset="1" stop-color="#3FB34F"/></radialGradient>
        <linearGradient id="ali-roupa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A57CFF"/><stop offset="1" stop-color="#5E35B1"/></linearGradient>
        <radialGradient id="ali-luz"><stop offset="0" stop-color="#FFFDE7"/><stop offset="1" stop-color="#FFEB3B" stop-opacity="0"/></radialGradient>
      </defs>
      ${SOMBRA}
      <path d="M38 24 C34 14 30 8 26 6 M62 24 C66 14 70 8 74 6" stroke="#3FB34F" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <circle cx="25" cy="6" r="9" fill="url(#ali-luz)"/><circle cx="25" cy="6" r="4" fill="#FFEB3B"/>
      <circle cx="75" cy="6" r="9" fill="url(#ali-luz)"/><circle cx="75" cy="6" r="4" fill="#FFEB3B"/>
      <path d="M36 86 C32 100 32 120 36 134 L64 134 C68 120 68 100 64 86 Z" fill="url(#ali-roupa)"/>
      <circle cx="50" cy="104" r="7" fill="#CEF010" stroke="#9BB80C" stroke-width="1.5"/>
      <path d="M36 92 C26 98 24 108 26 118 M64 92 C74 98 76 108 74 118" stroke="#3FB34F" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="38" y="130" width="10" height="13" rx="4" fill="#3FB34F"/><rect x="52" y="130" width="10" height="13" rx="4" fill="#3FB34F"/>
      <ellipse cx="50" cy="52" rx="34" ry="34" fill="url(#ali-pele)"/>
      <ellipse cx="40" cy="34" rx="12" ry="6" fill="#fff" opacity=".3"/>
      <path d="M26 52 C26 42 34 38 42 44 C46 48 44 60 36 62 C30 63 26 58 26 52 Z" fill="#1B1F3B"/>
      <path d="M74 52 C74 42 66 38 58 44 C54 48 56 60 64 62 C70 63 74 58 74 52 Z" fill="#1B1F3B"/>
      <circle cx="37" cy="48" r="3.5" fill="#fff"/><circle cx="63" cy="48" r="3.5" fill="#fff"/>
      <circle cx="33" cy="55" r="1.5" fill="#fff" opacity=".8"/><circle cx="67" cy="55" r="1.5" fill="#fff" opacity=".8"/>
      <path d="M43 72 Q50 78 57 72" stroke="#1E5E25" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
};

export const desenhosDosHerois = DESENHOS; // usado nos testes

/** Desenha o herói com os itens da loja que estiver usando. */
export function desenharHeroi(heroi, usando = {}, tamanho = 'medio') {
  const d = DESENHOS[heroi] || DESENHOS.dino;
  const caixa = document.createElement('div');
  caixa.className = `heroi heroi-${tamanho} heroi-${heroi in DESENHOS ? heroi : 'dino'}`;
  caixa.innerHTML = `<svg viewBox="0 0 100 160" aria-hidden="true">${d.svg}</svg>`;
  for (const [parte, id] of Object.entries(usando || {})) {
    const item = id && LOJA.find(i => i.id === id);
    if (!item) continue;
    const span = document.createElement('span');
    span.className = `acessorio acessorio-${parte}`;
    span.textContent = item.icone;
    Object.assign(span.style, d.acessorios?.[parte] || {});
    caixa.append(span);
  }
  return caixa;
}
