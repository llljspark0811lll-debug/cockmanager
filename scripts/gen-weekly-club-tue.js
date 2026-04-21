const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/weekly-club";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slide = { name: "tue_meme", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F0F4FF;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:60px 80px;}
.tag{background:#1E3A8A;border:none;color:#fff;
  font-size:36px;font-weight:900;padding:14px 44px;border-radius:999px;letter-spacing:2px;}
.timeline{display:flex;flex-direction:column;gap:0;width:100%;}
.week{display:flex;align-items:stretch;gap:20px;}
.week-label{width:72px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4px;}
.week-badge{background:#DBEAFE;border-radius:10px;padding:6px 10px;font-size:22px;font-weight:900;color:#1D4ED8;white-space:nowrap;}
.week-line{flex:1;width:2px;background:#BFDBFE;margin:6px auto 0;}
.tasks{flex:1;display:flex;flex-direction:column;gap:9px;padding-bottom:20px;}
.task{border-radius:14px;padding:16px 22px;display:flex;align-items:center;gap:14px;}
.t-icon{font-size:28px;flex-shrink:0;}
.t-text{font-size:24px;font-weight:700;}
.task.red{background:#FEE2E2;border:1.5px solid #FCA5A5;}.task.red .t-text{color:#991B1B;}
.task.orange{background:#FFEDD5;border:1.5px solid #FDBA74;}.task.orange .t-text{color:#9A3412;}
.task.blue{background:#DBEAFE;border:1.5px solid #93C5FD;}.task.blue .t-text{color:#1E40AF;}
.task.yellow{background:#FEF3C7;border:1.5px solid #FCD34D;}.task.yellow .t-text{color:#92400E;}
.task.gray{background:#E2E8F0;border:1.5px solid #CBD5E1;}.task.gray .t-text{color:#334155;}
.punchline{text-align:center;}
.punch-top{font-size:36px;font-weight:900;color:#1D4ED8;margin-bottom:8px;}
.punch-big{font-size:56px;font-weight:900;color:#0F172A;line-height:1.2;}
.punch-big em{color:#1D4ED8;font-style:normal;}
</style></head><body>
  <div class="tag">배드민턴 클럽/소모임 총무님</div>
  <div class="timeline">
    <div class="week">
      <div class="week-label">
        <div class="week-badge">1주</div>
        <div class="week-line"></div>
      </div>
      <div class="tasks">
        <div class="task red"><span class="t-icon">💰</span><span class="t-text">월회비 납부 독촉 카톡 돌리기</span></div>
        <div class="task orange"><span class="t-icon">📋</span><span class="t-text">엑셀 열어서 납부자 체크</span></div>
      </div>
    </div>
    <div class="week">
      <div class="week-label">
        <div class="week-badge">2주</div>
        <div class="week-line"></div>
      </div>
      <div class="tasks">
        <div class="task blue"><span class="t-icon">📅</span><span class="t-text">운동 일정 공지 + 참석 취합</span></div>
        <div class="task yellow"><span class="t-icon">🏸</span><span class="t-text">참석 명단 보고 대진표 직접 작성</span></div>
      </div>
    </div>
    <div class="week">
      <div class="week-label">
        <div class="week-badge">3주</div>
        <div class="week-line"></div>
      </div>
      <div class="tasks">
        <div class="task blue"><span class="t-icon">📅</span><span class="t-text">또 일정 공지 + 참석 취합</span></div>
        <div class="task yellow"><span class="t-icon">🏸</span><span class="t-text">또 대진표 작성…</span></div>
      </div>
    </div>
    <div class="week">
      <div class="week-label">
        <div class="week-badge">4주</div>
      </div>
      <div class="tasks">
        <div class="task gray"><span class="t-icon">😮‍💨</span><span class="t-text">신규 회원 이름·연락처·급수 등 수동 등록</span></div>
        <div class="task red"><span class="t-icon">💰</span><span class="t-text">다음 달 회비 준비 시작…</span></div>
      </div>
    </div>
  </div>
  <div class="punchline">
    <div class="punch-top">총무님 혼자!!!</div>
    <div class="punch-big">이걸 매달 반복한다고요?!</div>
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
