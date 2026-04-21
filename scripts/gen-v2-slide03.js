const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slide = { name: "03_solution", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;padding:80px 90px;}
.top{display:flex;flex-direction:column;align-items:flex-start;}
.eyebrow{background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);
  color:#FACC15;font-size:22px;font-weight:900;padding:10px 28px;border-radius:999px;
  letter-spacing:2px;margin-bottom:40px;}
.logo{font-size:120px;font-weight:900;color:#FACC15;line-height:1;margin-bottom:16px;letter-spacing:-3px;}
.tagline{font-size:50px;font-weight:900;color:#fff;line-height:1.35;}
.tagline em{color:#FACC15;font-style:normal;}
.middle{display:flex;gap:16px;align-items:stretch;}
.feat{flex:1;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.09);
  border-radius:24px;padding:28px 20px;display:flex;flex-direction:column;gap:12px;}
.feat-icon{font-size:40px;}
.feat-name{font-size:22px;font-weight:900;color:#F1F5F9;}
.feat-desc{font-size:17px;color:#64748B;line-height:1.5;}
.bottom{display:flex;align-items:center;justify-content:space-between;}
.chips{display:flex;gap:10px;}
.chip{background:rgba(250,204,21,0.1);border:1.5px solid rgba(250,204,21,0.25);
  color:#FACC15;font-size:19px;font-weight:700;padding:12px 24px;border-radius:999px;}
.swipe{font-size:19px;color:#334155;font-weight:700;}
</style></head><body>
  <div class="top">
    <div class="eyebrow">배드민턴 클럽/소모임 관리 솔루션</div>
    <div class="logo">콕매니저 🏸</div>
    <div class="tagline">총무 업무 80%를<br><em>자동으로</em> 처리합니다</div>
  </div>
  <div class="middle">
    <div class="feat"><div class="feat-icon">👥</div><div class="feat-name">회원 관리</div><div class="feat-desc">가입 링크 하나로<br>신규회원 자동 등록</div></div>
    <div class="feat"><div class="feat-icon">📅</div><div class="feat-name">일정 관리</div><div class="feat-desc">참석·불참·대기<br>실시간 자동 집계</div></div>
    <div class="feat"><div class="feat-icon">💰</div><div class="feat-name">회비 관리</div><div class="feat-desc">납부·미납 현황<br>한눈에 파악</div></div>
    <div class="feat"><div class="feat-icon">🏆</div><div class="feat-name">자동 대진표</div><div class="feat-desc">급수 균형 대진표<br>버튼 하나로 생성</div></div>
  </div>
  <div class="bottom">
    <div class="chips">
      <div class="chip">무료 시작</div><div class="chip">앱 설치 가능</div><div class="chip">카카오톡 공유</div>
    </div>
    <div class="swipe">▶ 자세히 보기</div>
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
