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
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:60px 80px;}
.tag{background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);color:#FACC15;
  font-size:28px;font-weight:900;padding:13px 36px;border-radius:999px;letter-spacing:2px;}
.timeline{display:flex;flex-direction:column;gap:0;width:100%;}
.week{display:flex;align-items:stretch;gap:20px;}
.week-label{width:72px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4px;}
.week-badge{background:#334155;border-radius:10px;padding:6px 10px;font-size:16px;font-weight:900;color:#94A3B8;white-space:nowrap;}
.week-line{flex:1;width:2px;background:#1E293B;margin:6px auto 0;}
.tasks{flex:1;display:flex;flex-direction:column;gap:8px;padding-bottom:18px;}
.task{border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;}
.t-icon{font-size:22px;flex-shrink:0;}
.t-text{font-size:19px;font-weight:700;}
.task.red{background:#450A0A;border:1.5px solid #991B1B;}.task.red .t-text{color:#FCA5A5;}
.task.orange{background:#431407;border:1.5px solid #9A3412;}.task.orange .t-text{color:#FDB97D;}
.task.blue{background:#0C1A3A;border:1.5px solid #1E40AF;}.task.blue .t-text{color:#93C5FD;}
.task.yellow{background:#422006;border:1.5px solid #92400E;}.task.yellow .t-text{color:#FCD34D;}
.task.gray{background:#1E293B;border:1.5px solid #334155;}.task.gray .t-text{color:#CBD5E1;}
.punchline{text-align:center;}
.punch-top{font-size:36px;font-weight:900;color:#FACC15;margin-bottom:8px;}
.punch-big{font-size:56px;font-weight:900;color:#fff;line-height:1.2;}
.punch-big em{color:#FACC15;font-style:normal;}
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
