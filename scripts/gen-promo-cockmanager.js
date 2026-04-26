const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/event-100";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slide = {
  name: "promo_cockmanager",
  html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}

body {
  background: #EFF6FF;
  position: relative;
  overflow: hidden;
}

/* 배경 장식 */
.bg-glow1 {
  position: absolute;
  width: 800px; height: 800px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(186,230,255,0.8) 0%, transparent 60%);
  top: -300px; left: -200px;
}
.bg-glow2 {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(221,214,254,0.6) 0%, transparent 60%);
  bottom: -200px; right: -150px;
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px);
  background-size: 60px 60px;
}

.wrap {
  position: relative;
  z-index: 1;
  width: 1080px;
  height: 1080px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 64px 48px;
}

/* 브랜드 + 태그 */
.top-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
  font-weight: 900;
  color: #0284C7;
}
.badge {
  background: rgba(2,132,199,0.1);
  border: 1.5px solid rgba(2,132,199,0.25);
  color: #0369A1;
  font-size: 14px;
  font-weight: 900;
  padding: 6px 18px;
  border-radius: 999px;
  letter-spacing: 1px;
}

/* 훅 카피 */
.hook {
  margin-top: 32px;
  text-align: center;
}
.hook-sub {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 999px;
  padding: 6px 20px;
  font-size: 16px;
  font-weight: 700;
  color: #FCA5A5;
  margin-bottom: 16px;
}
.hook-title {
  font-size: 62px;
  font-weight: 900;
  color: #0F172A;
  line-height: 1.15;
  letter-spacing: -1px;
  word-break: keep-all;
}
.hook-title em {
  background: linear-gradient(90deg, #38BDF8, #818CF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-style: normal;
}
.hook-desc {
  margin-top: 12px;
  font-size: 20px;
  color: #64748B;
  font-weight: 500;
  line-height: 1.6;
}
.hook-desc strong { color: #94A3B8; font-weight: 700; }

/* 핵심 기능 2개 */
.features {
  margin-top: 32px;
  width: 100%;
  display: flex;
  gap: 16px;
}
.feat {
  flex: 1;
  border-radius: 24px;
  padding: 28px 26px;
  position: relative;
  overflow: hidden;
}
.feat-member {
  background: linear-gradient(145deg, #E0F2FE, #fff);
  border: 1.5px solid rgba(2,132,199,0.2);
  box-shadow: 0 4px 20px rgba(2,132,199,0.1);
}
.feat-bracket {
  background: linear-gradient(145deg, #EDE9FE, #fff);
  border: 1.5px solid rgba(124,58,237,0.2);
  box-shadow: 0 4px 20px rgba(124,58,237,0.1);
}
.feat-glow {
  position: absolute;
  width: 200px; height: 200px;
  border-radius: 50%;
  top: -60px; right: -60px;
  opacity: 0.3;
}
.feat-member .feat-glow { background: radial-gradient(circle, #38BDF8, transparent); }
.feat-bracket .feat-glow { background: radial-gradient(circle, #8B5CF6, transparent); }

.feat-icon-wrap {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  margin-bottom: 16px;
}
.feat-member .feat-icon-wrap { background: rgba(56,189,248,0.15); }
.feat-bracket .feat-icon-wrap { background: rgba(139,92,246,0.15); }

.feat-label {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 8px;
}
.feat-member .feat-label { color: #38BDF8; }
.feat-bracket .feat-label { color: #A78BFA; }

.feat-title {
  font-size: 26px;
  font-weight: 900;
  color: #0F172A;
  margin-bottom: 14px;
  line-height: 1.25;
  word-break: keep-all;
}
.feat-points {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feat-point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 15px;
  color: #475569;
  font-weight: 500;
  line-height: 1.5;
}
.feat-point-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}
.feat-member .feat-point-dot { background: #38BDF8; }
.feat-bracket .feat-point-dot { background: #8B5CF6; }

/* 숫자 강조 */
.stat-row {
  margin-top: 30px;
  width: 100%;
  display: flex;
  gap: 12px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 18px;
  padding: 18px 14px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(15,23,42,0.06);
}
.stat-num {
  font-size: 36px;
  font-weight: 900;
  background: linear-gradient(90deg, #0284C7, #7C3AED);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}
.stat-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #64748B;
  font-weight: 700;
  line-height: 1.4;
  word-break: keep-all;
}

/* CTA */
.cta {
  margin-top: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cta-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cta-free {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #0284C7, #7C3AED);
  border-radius: 14px;
  padding: 12px 28px;
  font-size: 18px;
  font-weight: 900;
  color: #fff;
}
.cta-url {
  font-size: 15px;
  color: #475569;
  font-weight: 700;
  padding-left: 4px;
}
.cta-right {
  text-align: right;
}
.cta-handle {
  font-size: 15px;
  font-weight: 900;
  color: #0284C7;
}
.cta-tags {
  margin-top: 4px;
  font-size: 12px;
  color: #94A3B8;
  font-weight: 700;
  line-height: 1.8;
}

</style></head><body>
  <div class="bg-glow1"></div>
  <div class="bg-glow2"></div>
  <div class="bg-grid"></div>

  <div class="wrap">

    <div class="top-row">
      <div class="brand">🏸 콕매니저</div>
      <div class="badge">배드민턴 클럽/소모임 관리 시스템</div>
    </div>

    <div class="hook">
      <div class="hook-sub">😮‍💨 혹시 아직도 이러고 계신가요?</div>
      <div class="hook-title">카톡 취합, 엑셀 정리<br><em>이제 그만해도 됩니다</em></div>
      <div class="hook-desc">
        <strong>총무님의 소중한 시간</strong>을 돌려드릴게요
      </div>
    </div>

    <div class="features">
      <!-- 회원관리 -->
      <div class="feat feat-member">
        <div class="feat-glow"></div>
        <div class="feat-icon-wrap">👥</div>
        <div class="feat-label">FEATURE 01</div>
        <div class="feat-title">회원 관리<br>링크 하나로 끝</div>
        <div class="feat-points">
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            가입 링크 공유만 하면 회원이 직접 등록
          </div>
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            급수 · 성별 · 연락처 자동 분류
          </div>
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            회비 납부 현황 한눈에 확인
          </div>
        </div>
      </div>

      <!-- 자동대진 -->
      <div class="feat feat-bracket">
        <div class="feat-glow"></div>
        <div class="feat-icon-wrap">🏸</div>
        <div class="feat-label">FEATURE 02</div>
        <div class="feat-title">자동 대진표<br>클릭 한 번으로</div>
        <div class="feat-points">
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            참석 인원 자동 집계 후 즉시 생성
          </div>
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            급수 · 성별 균형 자동 배분
          </div>
          <div class="feat-point">
            <div class="feat-point-dot"></div>
            링크로 바로 공유, 인쇄도 가능
          </div>
        </div>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-num">0원</div>
        <div class="stat-desc">무료로<br>시작 가능</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">즉시</div>
        <div class="stat-desc">클릭 한 번으로<br>대진표 완성</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">100+</div>
        <div class="stat-desc">현재 사용 중인<br>동호회</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">∞</div>
        <div class="stat-desc">총무님의<br>여유시간</div>
      </div>
    </div>

    <div class="cta">
      <div class="cta-left">
        <div class="cta-free">🚀 지금 바로 무료 시작</div>
        <div class="cta-url">cockmanager.kr</div>
      </div>
      <div class="cta-right">
        <div class="cta-handle">@cock_manager_official</div>
        <div class="cta-tags">
          #배드민턴모임관리 #배드민턴자동대진<br>
          #배드민턴총무업무 #콕매니저
        </div>
      </div>
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
