const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const WIDTH = 3240;
const HEIGHT = 1080;
const TILE = 1080;
const outputDir = path.join(
  process.cwd(),
  "exports",
  "instagram-banner-concepts"
);

fs.mkdirSync(outputDir, { recursive: true });

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textLines(lines, x, y, options = {}) {
  const {
    size = 64,
    weight = 700,
    fill = "#0F172A",
    lineHeight = 1.2,
    anchor = "start",
    family = "'Malgun Gothic','Apple SD Gothic Neo',sans-serif",
    letterSpacing = 0,
  } = options;

  const tspanY = lines.map((line, index) => {
    const dy = index === 0 ? 0 : size * lineHeight;
    return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
  });

  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">${tspanY.join("")}</text>`;
}

function pill(x, y, w, h, fill, stroke = "none", strokeWidth = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function card(x, y, w, h, fill, stroke = "none", strokeWidth = 0, rx = 38) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function racketIcon(cx, cy, scale = 1, stroke = "#3B82F6") {
  const s = scale;
  return `
    <g transform="translate(${cx} ${cy}) scale(${s})">
      <ellipse cx="0" cy="0" rx="54" ry="72" fill="none" stroke="${stroke}" stroke-width="10" />
      <line x1="-28" y1="-32" x2="28" y2="32" stroke="${stroke}" stroke-width="3" opacity="0.4" />
      <line x1="28" y1="-32" x2="-28" y2="32" stroke="${stroke}" stroke-width="3" opacity="0.4" />
      <line x1="-42" y1="0" x2="42" y2="0" stroke="${stroke}" stroke-width="3" opacity="0.4" />
      <line x1="0" y1="-56" x2="0" y2="56" stroke="${stroke}" stroke-width="3" opacity="0.4" />
      <line x1="18" y1="62" x2="82" y2="154" stroke="${stroke}" stroke-width="12" stroke-linecap="round" />
      <rect x="70" y="144" width="24" height="46" rx="12" fill="#F472B6" transform="rotate(18 82 167)" />
    </g>
  `;
}

function shuttleIcon(cx, cy, scale = 1, fill = "#38BDF8") {
  const s = scale;
  return `
    <g transform="translate(${cx} ${cy}) scale(${s})">
      <circle cx="0" cy="0" r="18" fill="${fill}" />
      <path d="M-56 -12 L-10 -2 L-12 -42 Z" fill="${fill}" opacity="0.85" />
      <path d="M-52 16 L-8 6 L-18 48 Z" fill="${fill}" opacity="0.65" />
      <path d="M-48 -46 L-4 -14 L-42 -6 Z" fill="${fill}" opacity="0.55" />
    </g>
  `;
}

function divider(x) {
  return `<line x1="${x}" x2="${x}" y1="80" y2="${HEIGHT - 80}" stroke="#E2E8F0" stroke-width="2" opacity="0.9" />`;
}

function renderBanner(name, svg) {
  const fullPath = path.join(outputDir, `${name}-full.png`);
  const fullBuffer = Buffer.from(svg);

  return sharp(fullBuffer)
    .png()
    .toFile(fullPath)
    .then(async () => {
      for (let i = 0; i < 3; i += 1) {
        await sharp(fullBuffer)
          .extract({ left: i * TILE, top: 0, width: TILE, height: TILE })
          .png()
          .toFile(path.join(outputDir, `${name}-${i + 1}.png`));
      }
    });
}

function wrapSvg(inner, bg = "#F8FBFF") {
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${bg}" />
      ${inner}
    </svg>
  `;
}

function conceptOne() {
  return wrapSvg(`
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E0F2FE" />
        <stop offset="100%" stop-color="#F8FAFC" />
      </linearGradient>
    </defs>
    <rect x="30" y="30" width="${WIDTH - 60}" height="${HEIGHT - 60}" rx="48" fill="url(#g1)" />
    ${divider(1080)}
    ${divider(2160)}

    ${pill(110, 110, 340, 72, "#FFFFFF", "#DBEAFE", 2)}
    ${textLines(["BADMINTON CLUB TOOL"], 280, 160, { size: 28, anchor: "middle", fill: "#64748B", letterSpacing: 4, weight: 700 })}
    ${textLines(["콕매니저"], 110, 330, { size: 146, fill: "#0B132B", weight: 900 })}
    ${textLines(["배드민턴 클럽 운영을", "한곳에서 정리하는 프로그램"], 110, 470, { size: 58, fill: "#475569", weight: 700, lineHeight: 1.1 })}
    ${textLines(["회원 · 승인 · 일정 · 출석 · 회비", "총무가 카톡과 엑셀 대신 보는 운영 화면"], 110, 660, { size: 42, fill: "#64748B", weight: 600, lineHeight: 1.35 })}
    ${racketIcon(880, 790, 1.15, "#38BDF8")}
    ${shuttleIcon(930, 910, 1.1, "#0EA5E9")}

    ${card(1170, 140, 900, 790, "#FFFFFF", "#E2E8F0", 2, 40)}
    ${textLines(["이런 클럽에 잘 맞습니다"], 1240, 240, { size: 54, fill: "#0F172A", weight: 900 })}
    ${textLines(["신규 회원 문의가 자주 들어오는 클럽", "참석 조사와 명단 정리가 번거로운 클럽", "월회비와 수시회비를 함께 관리하는 클럽", "총무가 카카오톡과 엑셀을 같이 쓰는 클럽"], 1240, 380, { size: 42, fill: "#475569", weight: 700, lineHeight: 1.55 })}
    ${pill(1240, 760, 360, 84, "#0F172A")}
    ${textLines(["현재 베타 운영 중"], 1420, 815, { size: 34, anchor: "middle", fill: "#FFFFFF", weight: 800 })}
    ${textLines(["프로필 링크로 바로 체험해보세요"], 1240, 905, { size: 34, fill: "#0EA5E9", weight: 800 })}

    ${card(2260, 110, 860, 860, "#020617", "#0F172A", 2, 44)}
    ${pill(2350, 180, 270, 68, "#0F172A")}
    ${textLines(["START NOW"], 2485, 225, { size: 30, anchor: "middle", fill: "#93C5FD", weight: 800, letterSpacing: 4 })}
    ${textLines(["배드민턴 클럽", "운영 관리 프로그램"], 2350, 380, { size: 74, fill: "#FFFFFF", weight: 900, lineHeight: 1.08 })}
    ${textLines(["링크 하나로 가입 신청을 받고", "운동 일정 · 게스트 · 출석 · 회비까지", "총무 업무를 자연스럽게 연결합니다"], 2350, 570, { size: 42, fill: "#CBD5E1", weight: 700, lineHeight: 1.45 })}
    ${card(2350, 760, 680, 118, "#60A5FA", "none", 0, 30)}
    ${textLines(["콕매니저🏸"], 2690, 835, { size: 56, anchor: "middle", fill: "#FFFFFF", weight: 900 })}
    ${textLines(["전국 배드민턴 클럽 운영 관리 프로그램"], 2690, 920, { size: 30, anchor: "middle", fill: "#93C5FD", weight: 700 })}
  `);
}

function conceptTwo() {
  return wrapSvg(`
    <defs>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFDF5" />
        <stop offset="100%" stop-color="#FFFFFF" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#g2)" />
    ${divider(1080)}
    ${divider(2160)}

    ${textLines(["총무가 제일 자주 하는 일"], 120, 170, { size: 54, fill: "#94A3B8", weight: 800 })}
    ${textLines(["가입 정리"], 120, 320, { size: 98, fill: "#0F172A", weight: 900 })}
    ${textLines(["참석 체크"], 120, 440, { size: 98, fill: "#0F172A", weight: 900 })}
    ${textLines(["회비 관리"], 120, 560, { size: 98, fill: "#0F172A", weight: 900 })}
    ${textLines(["그걸 한곳에서.",], 120, 760, { size: 68, fill: "#2563EB", weight: 900 })}
    ${shuttleIcon(870, 860, 1.35, "#2563EB")}

    ${card(1160, 120, 920, 840, "#FFFFFF", "#E5E7EB", 2, 44)}
    ${pill(1245, 180, 240, 64, "#DBEAFE")}
    ${textLines(["WHY KOKMANAGER"], 1365, 223, { size: 27, anchor: "middle", fill: "#2563EB", weight: 900, letterSpacing: 3 })}
    ${textLines(["회원"], 1260, 360, { size: 58, fill: "#0F172A", weight: 900 })}
    ${textLines(["가입 신청 · 승인 · 회원 관리"], 1260, 430, { size: 38, fill: "#475569", weight: 700 })}
    ${textLines(["운동 일정"], 1260, 560, { size: 58, fill: "#0F172A", weight: 900 })}
    ${textLines(["참석 신청 · 대기 인원 · 게스트"], 1260, 630, { size: 38, fill: "#475569", weight: 700 })}
    ${textLines(["회비"], 1260, 760, { size: 58, fill: "#0F172A", weight: 900 })}
    ${textLines(["월회비 · 수시회비 · 미납 관리"], 1260, 830, { size: 38, fill: "#475569", weight: 700 })}

    ${card(2250, 90, 900, 900, "#0B132B", "none", 0, 46)}
    ${textLines(["콕매니저🏸"], 2360, 250, { size: 120, fill: "#FFFFFF", weight: 900 })}
    ${textLines(["전국 배드민턴 클럽", "운영 관리 프로그램"], 2360, 390, { size: 60, fill: "#CBD5E1", weight: 800, lineHeight: 1.12 })}
    ${textLines(["카카오톡과 엑셀로 나눠서 하던 운영을", "총무가 보기 쉽게 한 화면에 정리합니다"], 2360, 580, { size: 42, fill: "#93C5FD", weight: 700, lineHeight: 1.5 })}
    ${racketIcon(2950, 780, 1.22, "#60A5FA")}
    ${pill(2360, 820, 400, 84, "#1D4ED8")}
    ${textLines(["지금 바로 써보세요"], 2560, 875, { size: 34, anchor: "middle", fill: "#FFFFFF", weight: 800 })}
  `, "#FFFDF7");
}

function conceptThree() {
  return wrapSvg(`
    <defs>
      <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#F8FBFF" />
        <stop offset="100%" stop-color="#EEF2FF" />
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g3)" />
    ${divider(1080)}
    ${divider(2160)}

    ${card(70, 80, 940, 920, "#FFFFFF", "#E2E8F0", 2, 48)}
    ${pill(150, 150, 280, 66, "#F1F5F9")}
    ${textLines(["PREMIUM CLUB OPS"], 290, 193, { size: 26, anchor: "middle", fill: "#64748B", weight: 900, letterSpacing: 4 })}
    ${textLines(["콕매니저"], 150, 350, { size: 132, fill: "#0B132B", weight: 900 })}
    ${textLines(["배드민턴 클럽 총무를 위한", "자동 운영 관리 프로그램"], 150, 500, { size: 54, fill: "#475569", weight: 800, lineHeight: 1.18 })}
    ${textLines(["가입 신청부터 운동 일정, 출석, 월회비, 수시회비까지", "운영 흐름이 한 화면 안에서 자연스럽게 이어집니다"], 150, 690, { size: 34, fill: "#64748B", weight: 700, lineHeight: 1.5 })}
    ${card(150, 785, 760, 145, "#F8FAFC", "#E2E8F0", 2, 28)}
    ${textLines(["총무가 보기 쉬운 화면", "회원 · 승인 · 일정 · 출석 · 회비"], 190, 845, { size: 34, fill: "#0F172A", weight: 800, lineHeight: 1.42 })}

    ${card(1180, 100, 880, 880, "#FFFFFF", "#E2E8F0", 2, 48)}
    ${racketIcon(1650, 360, 1.4, "#3B82F6")}
    ${textLines(["카톡으로 받던 운영을"], 1235, 600, { size: 58, fill: "#0F172A", weight: 900 })}
    ${textLines(["명단 · 기록 · 통계로 바꾸는 방법"], 1235, 680, { size: 58, fill: "#0F172A", weight: 900 })}
    ${textLines(["가입 링크 공유", "참석 링크 공유", "게스트 · 대기 자동 정리", "출석과 회비까지 연결"], 1235, 810, { size: 38, fill: "#475569", weight: 700, lineHeight: 1.5 })}

    ${card(2230, 70, 940, 940, "#020617", "none", 0, 48)}
    ${textLines(["배드민턴 클럽 운영"], 2340, 220, { size: 40, fill: "#60A5FA", weight: 800 })}
    ${textLines(["한눈에"], 2340, 380, { size: 120, fill: "#FFFFFF", weight: 900 })}
    ${textLines(["쉽게"], 2340, 510, { size: 120, fill: "#FFFFFF", weight: 900 })}
    ${textLines(["정리"], 2340, 640, { size: 120, fill: "#FFFFFF", weight: 900 })}
    ${textLines(["베타 사용 클럽 모집 중"], 2340, 795, { size: 46, fill: "#93C5FD", weight: 800 })}
    ${textLines(["콕매니저🏸"], 2340, 905, { size: 58, fill: "#FFFFFF", weight: 900 })}
  `);
}

async function main() {
  const concepts = [
    ["banner-concept-01", conceptOne()],
    ["banner-concept-02", conceptTwo()],
    ["banner-concept-03", conceptThree()],
  ];

  for (const [name, svg] of concepts) {
    await renderBanner(name, svg);
  }

  console.log(`Saved banner concepts to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
