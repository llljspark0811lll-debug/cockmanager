const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080;
const H = 1080;

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; }
  .slide { width: ${W}px; height: ${H}px; position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; }
`;

const slide = {
  name: "01_hook",
  html: `
  <style>${BASE_CSS}
    body { background: #0F172A; }
    .badge { background: #FACC15; color: #0F172A; font-size: 38px; font-weight: 900;
      padding: 18px 48px; border-radius: 999px; letter-spacing: 2px; margin-bottom: 52px; }
    .big { font-size: 88px; font-weight: 900; color: #fff; line-height: 1.2;
      text-align: center; letter-spacing: -2px; }
    .big span { color: #FACC15; }
    .sub { margin-top: 40px; font-size: 32px; color: #94A3B8; text-align: center; line-height: 1.7; }
    .dots { display: flex; gap: 8px; position: absolute; bottom: 68px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #FACC15; opacity: 0.4; }
    .dot.on { opacity: 1; width: 24px; border-radius: 4px; }
    .bg-circle { position: absolute; border-radius: 50%; }
  </style>
  <body>
    <div class="bg-circle" style="width:600px;height:600px;background:rgba(250,204,21,0.05);top:-200px;right:-200px;"></div>
    <div class="bg-circle" style="width:400px;height:400px;background:rgba(250,204,21,0.04);bottom:-100px;left:-100px;"></div>
    <div class="slide">
      <div class="badge">배드민턴 클럽/소모임 총무님들</div>
      <div class="big">
        아직도<br><span>카톡·엑셀</span>로<br>클럽 운영 하세요?
      </div>
      <div class="sub">신규회원 받고, 회비 정리하고, 대진표 짜고…<br>총무 혼자 다 하는거 이거 맞아?</div>
      <div class="dots">
        <div class="dot on"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
    </div>
  </body>`
};

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.setContent(slide.html, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1200));

  const outPath = path.join(OUT, `${slide.name}.png`);
  await page.screenshot({ path: outPath, type: "png" });
  await page.close();
  console.log(`✅ ${slide.name}.png → ${outPath}`);

  await browser.close();
})();
