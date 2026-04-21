const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slide = { name: "02_pain", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#FEF9EE;display:flex;flex-direction:column;justify-content:space-between;padding:72px 88px;}
.top{display:flex;flex-direction:column;align-items:center;text-align:center;}
.title{font-size:56px;font-weight:900;color:#0F172A;margin-bottom:10px;}
.title span{color:#EF4444;}
.subtitle{font-size:24px;color:#64748B;}
.cards{display:flex;flex-direction:column;gap:18px;}
.card{background:#fff;border-radius:22px;padding:26px 32px;
  display:flex;align-items:center;gap:22px;
  box-shadow:0 4px 20px rgba(0,0,0,0.06);border-left:6px solid;}
.card.red{border-color:#EF4444;}.card.orange{border-color:#F97316;}.card.blue{border-color:#3B82F6;}
.icon{font-size:40px;flex-shrink:0;}
.card-text h3{font-size:24px;font-weight:900;color:#0F172A;margin-bottom:5px;}
.card-text p{font-size:19px;color:#64748B;line-height:1.5;}
.cta-wrap{display:flex;align-items:center;justify-content:center;
  background:#FACC15;border-radius:28px;padding:36px 48px;gap:20px;
  box-shadow:0 8px 40px rgba(250,204,21,0.45);}
.cta-text{font-size:42px;font-weight:900;color:#0F172A;}
.cta-text em{color:#EF4444;font-style:normal;}
.cta-arrow{font-size:48px;color:#0F172A;font-weight:900;}
</style></head><body>
  <div class="top">
    <div class="title">총무님의 <span>현실</span></div>
    <div class="subtitle">이 중 하나라도 해당되신다면 끝까지 봐주세요</div>
  </div>
  <div class="cards">
    <div class="card red"><div class="icon">💬</div><div class="card-text">
      <h3>단톡방 공지 + 댓글 취합</h3><p>신청합니다 / 저도요 / 불참이요 — 하나씩 세고 계시죠?</p></div></div>
    <div class="card orange"><div class="icon">📊</div><div class="card-text">
      <h3>매달 엑셀로 회비 정리</h3><p>누가 냈는지, 얼마 남았는지 일일이 체크 중이시죠?</p></div></div>
    <div class="card blue"><div class="icon">✏️</div><div class="card-text">
      <h3>운동 당일 수기 대진표</h3><p>급수 맞춰서 손으로 짜면 20분은 기본이죠?</p></div></div>
  </div>
  <div class="cta-wrap">
    <div class="cta-text">이 모든 게 <em>오늘 끝납니다</em></div>
    <div class="cta-arrow">→</div>
  </div>
</body></html>` };

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
