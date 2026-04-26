const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/event-100";
fs.mkdirSync(OUT, { recursive: true });

function toBase64(filePath) {
  const ext = path.extname(filePath).slice(1).replace("jpg", "jpeg");
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/${ext};base64,${data}`;
}

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const IMG_YONEX  = toBase64("c:/Users/user/Downloads/KakaoTalk_20260425_083354893.jpg");
const IMG_INTUS  = toBase64("c:/Users/user/Downloads/KakaoTalk_20260425_083354893_01.jpg");
const IMG_RUNTWO = toBase64("c:/Users/user/Downloads/KakaoTalk_20260425_083354893_02.png");

const slide = {
  name: "event_100users",
  html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}

body {
  background: #F0F7FF;
  position: relative;
  overflow: hidden;
}

/* 배경 장식 */
.bg-blob1 {
  position: absolute;
  width: 700px; height: 700px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(186,230,255,0.7) 0%, transparent 65%);
  top: -220px; left: -180px;
}
.bg-blob2 {
  position: absolute;
  width: 500px; height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(254,240,138,0.5) 0%, transparent 65%);
  bottom: -120px; right: -100px;
}
.bg-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(14,116,144,0.08) 1.5px, transparent 1.5px);
  background-size: 30px 30px;
}

.wrap {
  position: relative;
  z-index: 1;
  width: 1080px;
  height: 1080px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 64px 40px;
}

/* 브랜드 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 28px;
  font-weight: 900;
  color: #0284C7;
  letter-spacing: 1px;
  align-self: flex-start;
}

/* 메인 타이틀 */
.title-box {
  margin-top: 16px;
  text-align: center;
  width: 100%;
}
.title-sub {
  font-size: 20px;
  font-weight: 700;
  color: #64748B;
  letter-spacing: 2px;
}
.title-main {
  margin-top: 6px;
  font-size: 66px;
  font-weight: 900;
  color: #0F172A;
  line-height: 1.1;
  letter-spacing: -1px;
}
.title-main em {
  color: #0284C7;
  font-style: normal;
}
.title-event {
  display: inline-block;
  margin-top: 10px;
  background: linear-gradient(135deg, #0284C7, #7C3AED);
  border-radius: 999px;
  padding: 8px 32px;
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 3px;
}

/* 이벤트 조건 */
.conditions {
  margin-top: 22px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cond-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 18px;
  padding: 14px 22px;
  box-shadow: 0 2px 12px rgba(15,23,42,0.06);
}
.cond-num {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900;
  flex-shrink: 0;
}
.cond-num.n1 { background: #0284C7; color: #fff; }
.cond-num.n2 { background: #F43F5E; color: #fff; }
.cond-num.n3 { background: #FACC15; color: #0F172A; }
.cond-text {
  font-size: 19px;
  font-weight: 700;
  color: #334155;
  line-height: 1.4;
}
.cond-text strong { color: #0F172A; font-weight: 900; }
.cond-icon { font-size: 22px; margin-left: auto; }
.cond-bonus {
  background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(167,139,250,0.06));
  border: 1.5px dashed rgba(124,58,237,0.35) !important;
}
.bonus-tag {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 1px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* 경품 */
.prizes-label {
  margin-top: 18px;
  font-size: 13px;
  font-weight: 900;
  color: #94A3B8;
  letter-spacing: 3px;
  text-transform: uppercase;
  align-self: flex-start;
}
.prizes {
  margin-top: 8px;
  width: 100%;
  display: flex;
  gap: 12px;
}
.prize-card {
  flex: 1;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 20px;
  padding: 14px 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.07);
}
.prize-img {
  width: 200px;
  height: 160px;
  object-fit: contain;
  border-radius: 10px;
}
.prize-name {
  font-size: 15px;
  font-weight: 900;
  color: #0F172A;
  text-align: center;
  line-height: 1.4;
  word-break: keep-all;
}
.prize-brand {
  font-size: 12px;
  font-weight: 700;
  color: #94A3B8;
  text-align: center;
  letter-spacing: 1px;
}

/* 기간 / 발표 */
.period-box {
  margin-top: 16px;
  width: 100%;
  background: linear-gradient(135deg, #0284C7, #7C3AED);
  border-radius: 20px;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.period-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.period-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.75);
  letter-spacing: 1px;
}
.period-value {
  font-size: 20px;
  font-weight: 900;
  color: #fff;
}
.period-div {
  width: 1px; height: 36px;
  background: rgba(255,255,255,0.3);
}

/* 하단 */
.bottom {
  margin-top: auto;
  padding-top: 12px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hashtags {
  font-size: 13px;
  color: #94A3B8;
  font-weight: 700;
  line-height: 1.8;
}
.account {
  font-size: 15px;
  font-weight: 900;
  color: #0284C7;
}

</style></head><body>
  <div class="bg-blob1"></div>
  <div class="bg-blob2"></div>
  <div class="bg-dots"></div>

  <div class="wrap">
    <div class="brand">🏸 콕매니저</div>

    <div class="title-box">
      <div class="title-sub">🎉 100 Users Milestone</div>
      <div class="title-main">유저 <em>100명</em> 달성!</div>
      <div class="title-event">감사 이벤트</div>
    </div>

    <div class="conditions">
      <div class="cond-row">
        <div class="cond-num n1">01</div>
        <div class="cond-text"><strong>@cock_manager_official</strong> 팔로우</div>
        <div class="cond-icon">👆</div>
      </div>
      <div class="cond-row">
        <div class="cond-num n2">02</div>
        <div class="cond-text">이 게시물 <strong>좋아요</strong> ♥</div>
        <div class="cond-icon">❤️</div>
      </div>
      <div class="cond-row">
        <div class="cond-num n3">03</div>
        <div class="cond-text">배드민턴 치는 친구 <strong>2명</strong> 댓글 태그</div>
        <div class="cond-icon">🏸</div>
      </div>
      <div class="cond-row cond-bonus">
        <div class="bonus-tag">BONUS</div>
        <div class="cond-text" style="color:#7C3AED;">이 게시물 <strong style="color:#6D28D9;">스토리 공유</strong> 시 당첨 확률 UP! 🎯</div>
      </div>
    </div>

    <div class="prizes-label">🎁 경품 — 각 1명 추첨</div>
    <div class="prizes">
      <div class="prize-card">
        <img class="prize-img" src="${IMG_YONEX}" />
        <div class="prize-name">숄더백</div>
        <div class="prize-brand">YONEX</div>
      </div>
      <div class="prize-card">
        <img class="prize-img" src="${IMG_INTUS}" />
        <div class="prize-name">사각 파우치</div>
        <div class="prize-brand">INTUS</div>
      </div>
      <div class="prize-card">
        <img class="prize-img" src="${IMG_RUNTWO}" />
        <div class="prize-name">미니 가방</div>
        <div class="prize-brand">RUNTWO</div>
      </div>
    </div>

    <div class="period-box">
      <div class="period-item">
        <div class="period-label">이벤트 기간</div>
        <div class="period-value">4/25(토) ~ 4/30(목)</div>
      </div>
      <div class="period-div"></div>
      <div class="period-item">
        <div class="period-label">당첨자 발표</div>
        <div class="period-value">5/1(금) 인스타그램</div>
      </div>
    </div>

    <div class="bottom">
      <div class="hashtags">
        #배드민턴모임관리 #배드민턴자동대진<br>#배드민턴총무업무 #콕매니저
      </div>
      <div class="account">@cock_manager_official</div>
    </div>
  </div>
</body></html>`
};

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.setContent(slide.html, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1500));
  const outPath = path.join(OUT, `${slide.name}.png`);
  await page.screenshot({ path: outPath, type: "png" });
  await page.close();
  console.log(`✅ ${slide.name}.png`);

  await browser.close();
  console.log(`\n🎉 완료! 저장 위치: ${OUT}`);
})();
