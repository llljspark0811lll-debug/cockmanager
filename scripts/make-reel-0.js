const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const ffmpeg = require("ffmpeg-static");

const ROOT = process.cwd();
const TEMP_DIR = path.join(ROOT, "tmp", "reel-0");
const OUTPUT_DIR = path.join(ROOT, "exports");
const OUTPUT_VIDEO = path.join(OUTPUT_DIR, "reel-0-kokmanager.mp4");
const CONCAT_FILE = path.join(TEMP_DIR, "slides.txt");

const WIDTH = 1080;
const HEIGHT = 1920;
const SCREENSHOT_WIDTH = 920;
const SCREENSHOT_HEIGHT = 600;

const slides = [
  {
    image: "C:\\Users\\user\\Downloads\\bad_4.png",
    label: "배드민턴 클럽 운영",
    title: "카톡 + 엑셀로 하던\n운영을 한곳에서",
    body: "회원, 일정, 출석, 회비까지.\n총무를 위한 클럽 운영 대시보드",
  },
  {
    image: "C:\\Users\\user\\Downloads\\bad_3.png",
    label: "회원 관리",
    title: "회원 정보를\n깔끔하게 정리",
    body: "성별, 급수, 연락처까지 한 화면에서\n빠르게 확인하고 관리할 수 있습니다.",
  },
  {
    image: "C:\\Users\\user\\Downloads\\bad_2.png",
    label: "회비 관리",
    title: "월회비와 수시회비를\n더 쉽게 체크",
    body: "매달 반복되는 회비와 일회성 회비를\n따로 관리해 운영이 훨씬 편해집니다.",
  },
  {
    image: "C:\\Users\\user\\Downloads\\bad_1.png",
    label: "운영 통계",
    title: "이번 주와 이번 달 흐름을\n바로 파악",
    body: "참석 신청, 게스트, 대기 인원까지.\n총무가 확인해야 할 숫자를 한눈에 봅니다.",
  },
  {
    image: "C:\\Users\\user\\Downloads\\bad_4.png",
    label: "콕매니저",
    title: "배드민턴 클럽 운영 관리 프로그램",
    body: "회원, 가입 승인, 일정, 출석, 회비를\n한곳에서 관리해보세요.\n현재 베타 운영 중",
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeForFfmpeg(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function makeSvgOverlay({ label, title, body }) {
  return `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.12"/>
      </filter>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.08"/>
      </filter>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="#f5f8ff"/>
    <rect x="54" y="54" width="${WIDTH - 108}" height="${HEIGHT - 108}" rx="46" fill="#ffffff"/>

    <rect x="108" y="108" width="360" height="70" rx="35" fill="#f8fbff" stroke="#dbe6f5"/>
    <text x="288" y="153" text-anchor="middle" fill="#4f6487" font-size="30" font-weight="700" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" letter-spacing="5">${label}</text>

    <text x="108" y="300" fill="#0b1020" font-size="86" font-weight="900" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif">
      ${title
        .split("\n")
        .map(
          (line, index) =>
            `<tspan x="108" dy="${index === 0 ? 0 : 104}">${line}</tspan>`
        )
        .join("")}
    </text>

    <rect x="80" y="520" width="${SCREENSHOT_WIDTH + 80}" height="${SCREENSHOT_HEIGHT + 80}" rx="40" fill="#eaf1ff" opacity="0.65"/>
    <rect x="86" y="532" width="${SCREENSHOT_WIDTH + 68}" height="${SCREENSHOT_HEIGHT + 68}" rx="40" fill="#ffffff" filter="url(#shadow)"/>

    <rect x="96" y="1300" width="888" height="360" rx="36" fill="#0b1020" filter="url(#soft)"/>
    <text x="144" y="1396" fill="#7bb9ff" font-size="28" font-weight="800" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" letter-spacing="4">KOK MANAGER</text>
    <text x="144" y="1468" fill="#ffffff" font-size="56" font-weight="900" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif">총무 운영을 더 간단하게</text>
    <text x="144" y="1548" fill="#d6dcef" font-size="34" font-weight="500" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif">
      ${body
        .split("\n")
        .map(
          (line, index) =>
            `<tspan x="144" dy="${index === 0 ? 0 : 52}">${line}</tspan>`
        )
        .join("")}
    </text>
  </svg>`;
}

async function createSlide(slide, index) {
  const screenshot = await sharp(slide.image)
    .resize(SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT, {
      fit: "contain",
      background: "#ffffff",
    })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(`
    <svg width="${SCREENSHOT_WIDTH}" height="${SCREENSHOT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${SCREENSHOT_WIDTH}" height="${SCREENSHOT_HEIGHT}" rx="28" fill="#fff"/>
    </svg>
  `);

  const maskedScreenshot = await sharp(screenshot)
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const slidePath = path.join(TEMP_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`);

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#f5f8ff",
    },
  })
    .composite([
      { input: Buffer.from(makeSvgOverlay(slide)) },
      { input: maskedScreenshot, top: 572, left: 120 },
    ])
    .png()
    .toFile(slidePath);

  return slidePath;
}

async function main() {
  ensureDir(TEMP_DIR);
  ensureDir(OUTPUT_DIR);

  const slidePaths = [];
  for (let index = 0; index < slides.length; index += 1) {
    slidePaths.push(await createSlide(slides[index], index));
  }

  const concatText = slidePaths
    .map((slidePath) => `file '${escapeForFfmpeg(slidePath)}'\nduration 3`)
    .join("\n")
    .concat(`\nfile '${escapeForFfmpeg(slidePaths[slidePaths.length - 1])}'\n`);

  fs.writeFileSync(CONCAT_FILE, concatText, "utf8");

  execFileSync(
    ffmpeg,
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      CONCAT_FILE,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-shortest",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      OUTPUT_VIDEO,
    ],
    { stdio: "inherit" }
  );

  console.log(`Created: ${OUTPUT_VIDEO}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
