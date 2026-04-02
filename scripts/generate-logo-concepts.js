const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.join(process.cwd(), "exports", "logo-concepts");
const W = 1400;
const H = 1000;

const colors = {
  navy: "#0b1736",
  navySoft: "#162347",
  sky: "#1d9bf0",
  skySoft: "#dff2ff",
  pink: "#ff5f7a",
  mint: "#4ecdc4",
  gold: "#f2b544",
  slate: "#5f6f8d",
  line: "#d9e3f1",
  white: "#ffffff",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function wrap(inner, { bg = "transparent" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.12"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${bg}" />
    <style>
      .brand { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-weight: 900; fill: ${colors.navy}; }
      .sub { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-weight: 700; fill: ${colors.slate}; letter-spacing: 2px; }
      .caps { font-family: Arial, sans-serif; font-weight: 800; fill: ${colors.slate}; letter-spacing: 8px; }
    </style>
    ${inner}
  </svg>`;
}

function racket(x, y, scale = 1, stroke = colors.navy) {
  const rx = 70 * scale;
  const ry = 92 * scale;
  const handle = 68 * scale;
  return `
    <g transform="translate(${x} ${y}) rotate(-18)">
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="none" stroke="${stroke}" stroke-width="${14 * scale}" />
      <ellipse cx="0" cy="0" rx="${rx - 16 * scale}" ry="${ry - 20 * scale}" fill="none" stroke="${stroke}" stroke-width="${4 * scale}" opacity="0.8" />
      <line x1="${-rx + 18 * scale}" y1="${-ry + 16 * scale}" x2="${rx - 18 * scale}" y2="${ry - 16 * scale}" stroke="${stroke}" stroke-width="${3 * scale}" opacity="0.45" />
      <line x1="${rx - 18 * scale}" y1="${-ry + 16 * scale}" x2="${-rx + 18 * scale}" y2="${ry - 16 * scale}" stroke="${stroke}" stroke-width="${3 * scale}" opacity="0.45" />
      <line x1="${0}" y1="${-ry + 8 * scale}" x2="${0}" y2="${ry - 8 * scale}" stroke="${stroke}" stroke-width="${3 * scale}" opacity="0.45" />
      <line x1="${-rx + 10 * scale}" y1="${0}" x2="${rx - 10 * scale}" y2="${0}" stroke="${stroke}" stroke-width="${3 * scale}" opacity="0.45" />
      <rect x="${-10 * scale}" y="${ry - 10 * scale}" width="${20 * scale}" height="${handle}" rx="${8 * scale}" fill="${stroke}" />
      <rect x="${-14 * scale}" y="${ry + handle - 8 * scale}" width="${28 * scale}" height="${18 * scale}" rx="${9 * scale}" fill="${colors.pink}" />
    </g>`;
}

function shuttle(x, y, scale = 1, fill = colors.sky) {
  return `
    <g transform="translate(${x} ${y})">
      <circle cx="0" cy="0" r="${28 * scale}" fill="${fill}" />
      <path d="M -58 ${-18 * scale} L -12 ${-62 * scale} L -8 ${-18 * scale} Z" fill="${fill}" opacity="0.92"/>
      <path d="M 0 ${-18 * scale} L 0 ${-78 * scale} L 12 ${-18 * scale} Z" fill="${fill}" opacity="0.82"/>
      <path d="M 58 ${-18 * scale} L 12 ${-62 * scale} L 8 ${-18 * scale} Z" fill="${fill}" opacity="0.92"/>
      <line x1="${-22 * scale}" y1="${-18 * scale}" x2="${-34 * scale}" y2="${-48 * scale}" stroke="${colors.white}" stroke-width="${4 * scale}" opacity="0.85"/>
      <line x1="0" y1="${-18 * scale}" x2="0" y2="${-58 * scale}" stroke="${colors.white}" stroke-width="${4 * scale}" opacity="0.85"/>
      <line x1="${22 * scale}" y1="${-18 * scale}" x2="${34 * scale}" y2="${-48 * scale}" stroke="${colors.white}" stroke-width="${4 * scale}" opacity="0.85"/>
    </g>`;
}

function check(x, y, scale = 1, stroke = colors.sky) {
  return `<path d="M ${x} ${y} l ${24 * scale} ${24 * scale} l ${52 * scale} ${-68 * scale}" fill="none" stroke="${stroke}" stroke-width="${12 * scale}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function clipboard(x, y, scale = 1) {
  return `
    <g transform="translate(${x} ${y})">
      <rect x="0" y="0" width="${180 * scale}" height="${220 * scale}" rx="${28 * scale}" fill="${colors.white}" stroke="${colors.navy}" stroke-width="${10 * scale}" />
      <rect x="${52 * scale}" y="${-18 * scale}" width="${76 * scale}" height="${38 * scale}" rx="${18 * scale}" fill="${colors.sky}" />
      <line x1="${36 * scale}" y1="${72 * scale}" x2="${144 * scale}" y2="${72 * scale}" stroke="${colors.line}" stroke-width="${8 * scale}" />
      <line x1="${36 * scale}" y1="${114 * scale}" x2="${144 * scale}" y2="${114 * scale}" stroke="${colors.line}" stroke-width="${8 * scale}" />
      <line x1="${36 * scale}" y1="${156 * scale}" x2="${144 * scale}" y2="${156 * scale}" stroke="${colors.line}" stroke-width="${8 * scale}" />
      ${check(40 * scale, 82 * scale, scale * 0.55)}
    </g>`;
}

function wordmark(titleY = 454, subY = 540, x = 420, brandSize = 168) {
  return `
    <text x="${x}" y="${titleY}" class="brand" font-size="${brandSize}">콕매니저</text>
    <text x="${x}" y="${subY}" class="sub" font-size="44">배드민턴 클럽 운영 관리</text>`;
}

const concepts = [
  {
    name: "01-badge-racket-wordmark",
    svg: wrap(`
      <rect x="110" y="130" width="240" height="240" rx="64" fill="${colors.navy}" filter="url(#shadow)"/>
      ${racket(230, 252, 0.95, colors.white)}
      ${shuttle(296, 300, 0.45, colors.sky)}
      ${wordmark(340, 430)}
      <text x="420" y="628" class="caps" font-size="28">BADMINTON CLUB OPERATIONS</text>
    `),
  },
  {
    name: "02-speech-bubble-shuttle",
    svg: wrap(`
      <path d="M140 178 Q140 120 198 120 H386 Q444 120 444 178 V300 Q444 358 386 358 H280 L218 420 L234 358 H198 Q140 358 140 300 Z" fill="${colors.skySoft}" stroke="${colors.sky}" stroke-width="10"/>
      ${shuttle(292, 262, 1.08, colors.sky)}
      ${wordmark(364, 450)}
      <text x="420" y="626" class="sub" font-size="52">가입 · 일정 · 출석 · 회비</text>
    `),
  },
  {
    name: "03-clipboard-manager",
    svg: wrap(`
      <g opacity="0.12">
        ${clipboard(360, 150, 1.85)}
        ${racket(710, 468, 0.98, colors.sky)}
      </g>
      <text
        x="760"
        y="430"
        text-anchor="middle"
        font-family="'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
        font-size="164"
        font-weight="900"
        letter-spacing="-4"
        fill="${colors.navy}"
        stroke="${colors.skySoft}"
        stroke-width="12"
        paint-order="stroke"
      >콕매니저</text>
      <circle cx="1104" cy="362" r="16" fill="${colors.pink}" opacity="0.9"/>
      <circle cx="1138" cy="332" r="10" fill="${colors.sky}" opacity="0.95"/>
      <text
        x="760"
        y="516"
        text-anchor="middle"
        class="sub"
        font-size="48"
      >배드민턴 클럽 운영 관리</text>
      <text
        x="760"
        y="670"
        text-anchor="middle"
        class="sub"
        font-size="46"
      >
        <tspan x="760" dy="0">총무가 사용하기 간편한</tspan>
        <tspan x="760" dy="62">자동 관리 프로그램</tspan>
      </text>
    `, { bg: colors.white }),
  },
  {
    name: "04-monogram-km",
    svg: wrap(`
      <circle cx="252" cy="250" r="132" fill="${colors.navy}" filter="url(#shadow)"/>
      <text x="174" y="306" font-family="Arial, sans-serif" font-size="140" font-weight="900" fill="${colors.white}">KM</text>
      ${shuttle(312, 292, 0.34, colors.pink)}
      ${wordmark(340, 432)}
      <text x="340" y="620" class="sub" font-size="48">배드민턴 클럽 운영 관리 SaaS</text>
    `),
  },
  {
    name: "05-shield-check",
    svg: wrap(`
      <path d="M246 116 L386 172 V268 C386 364 316 444 246 476 C176 444 106 364 106 268 V172 Z" fill="${colors.navy}" filter="url(#shadow)"/>
      ${check(174, 256, 1.2, colors.white)}
      ${racket(314, 316, 0.42, colors.sky)}
      ${wordmark(428, 344)}
      <text x="428" y="432" class="sub" font-size="46">운영을 더 정확하게</text>
      <text x="428" y="590" class="sub" font-size="38">회원 · 일정 · 출석 · 회비를 한곳에서</text>
    `),
  },
  {
    name: "06-chip-modern",
    svg: wrap(`
      <rect x="86" y="146" width="440" height="220" rx="110" fill="${colors.navy}"/>
      <circle cx="214" cy="256" r="74" fill="${colors.white}" opacity="0.96"/>
      ${shuttle(214, 276, 0.6, colors.sky)}
      <text x="300" y="280" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="92" font-weight="900" fill="${colors.white}">콕</text>
      ${wordmark(520, 344, 600, 146)}
      <text x="600" y="428" class="sub" font-size="44">총무를 위한 클럽 운영 툴</text>
    `),
  },
  {
    name: "07-racket-board",
    svg: wrap(`
      <rect x="104" y="142" width="324" height="280" rx="40" fill="${colors.white}" stroke="${colors.line}" stroke-width="8" filter="url(#shadow)"/>
      <rect x="104" y="142" width="324" height="64" rx="40" fill="${colors.navySoft}"/>
      <circle cx="142" cy="174" r="10" fill="${colors.white}" opacity="0.9"/>
      <circle cx="174" cy="174" r="10" fill="${colors.sky}" opacity="0.95"/>
      <circle cx="206" cy="174" r="10" fill="${colors.pink}" opacity="0.95"/>
      ${racket(266, 308, 0.66, colors.sky)}
      ${wordmark(476, 334)}
      <text x="476" y="418" class="sub" font-size="46">운영 대시보드를 한눈에</text>
    `),
  },
  {
    name: "08-dual-icon",
    svg: wrap(`
      <circle cx="230" cy="250" r="124" fill="${colors.skySoft}"/>
      ${shuttle(196, 278, 0.7, colors.sky)}
      ${racket(286, 264, 0.56, colors.navy)}
      ${wordmark(410, 344)}
      <text x="410" y="430" class="sub" font-size="46">배드민턴 클럽 운영 관리 프로그램</text>
    `),
  },
  {
    name: "09-ticket-link",
    svg: wrap(`
      <path d="M110 178 C110 144 138 116 172 116 H420 C454 116 482 144 482 178 V214 C444 214 420 240 420 274 C420 308 444 334 482 334 V370 C482 404 454 432 420 432 H172 C138 432 110 404 110 370 V334 C148 334 172 308 172 274 C172 240 148 214 110 214 Z" fill="${colors.navy}" filter="url(#shadow)"/>
      <text x="158" y="248" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="44" font-weight="800" fill="${colors.white}">링크로 시작하는</text>
      <text x="158" y="314" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-size="62" font-weight="900" fill="${colors.white}">클럽 운영</text>
      ${wordmark(574, 334)}
      <text x="574" y="418" class="sub" font-size="46">가입 신청 · 참석 링크 공유</text>
    `),
  },
  {
    name: "10-app-icon-lockup",
    svg: wrap(`
      <rect x="112" y="126" width="276" height="276" rx="72" fill="${colors.sky}" filter="url(#shadow)"/>
      ${racket(250, 246, 0.72, colors.white)}
      ${check(182, 292, 0.7, colors.white)}
      ${wordmark(430, 340)}
      <text x="430" y="426" class="sub" font-size="46">한눈에 보이는 총무용 운영 앱</text>
    `),
  },
];

async function main() {
  ensureDir(OUT_DIR);

  for (const concept of concepts) {
    const outputPath = path.join(OUT_DIR, `${concept.name}.png`);
    await sharp(Buffer.from(concept.svg))
      .png()
      .toFile(outputPath);
    console.log(`Created ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
