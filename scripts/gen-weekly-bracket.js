const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/weekly-bracket";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slides = [

// ── 화: 공감 밈 (대진표 버전) ─────────────────────────────────────────────
{ name: "tue_meme", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:72px 80px;}
.tag{background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);color:#FACC15;
  font-size:22px;font-weight:900;padding:10px 28px;border-radius:999px;letter-spacing:2px;}
.middle{display:flex;flex-direction:column;align-items:center;gap:32px;width:100%;}
.step{background:#1E293B;border-radius:24px;width:100%;padding:28px 36px;
  display:flex;align-items:center;gap:24px;}
.step-num{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:22px;font-weight:900;flex-shrink:0;}
.s1{background:#22C55E;color:#fff;}
.s2{background:#FACC15;color:#0F172A;}
.s3{background:#EF4444;color:#fff;}
.step-text{}
.step-title{font-size:24px;font-weight:900;color:#F1F5F9;margin-bottom:4px;}
.step-sub{font-size:18px;color:#64748B;}
.arrow{font-size:32px;color:#334155;}
.punchline{text-align:center;}
.punch-label{font-size:26px;color:#94A3B8;margin-bottom:12px;}
.punch-big{font-size:68px;font-weight:900;color:#fff;line-height:1.15;}
.punch-big em{color:#FACC15;font-style:normal;}
.punch-sub{font-size:22px;color:#475569;margin-top:16px;}
</style></head><body>
  <div class="tag">배드민턴 총무님 공감하시죠?</div>
  <div class="middle">
    <div class="step">
      <div class="step-num s1">1</div>
      <div class="step-text">
        <div class="step-title">카톡 투표로 참석 인원 확정 ✅</div>
        <div class="step-sub">오케이, 여기까진 카톡이 해줌</div>
      </div>
    </div>
    <div class="arrow">↓</div>
    <div class="step">
      <div class="step-num s2">2</div>
      <div class="step-text">
        <div class="step-title">참석자 급수·성별 머릿속으로 정리</div>
        <div class="step-sub">A급 3명, B급 5명, 여성 2명…</div>
      </div>
    </div>
    <div class="arrow">↓</div>
    <div class="step">
      <div class="step-num s3">3</div>
      <div class="step-text">
        <div class="step-title">대진표 손으로 직접 작성 😮‍💨</div>
        <div class="step-sub">균형 안 맞으면 처음부터 다시…</div>
      </div>
    </div>
  </div>
  <div class="punchline">
    <div class="punch-label">결국 대진표는</div>
    <div class="punch-big">총무님이<br><em>혼자 다 짬</em> 🫠</div>
    <div class="punch-sub">#배드민턴총무 #배드민턴동호회 #콕매니저</div>
  </div>
</body></html>` },

// ── 수: Before/After (대진표) ─────────────────────────────────────────────
{ name: "wed_before_after", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F8FAFC;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:64px 72px 56px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#94A3B8;letter-spacing:2px;margin-bottom:14px;}
.title{font-size:54px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#FACC15;font-style:normal;background:#0F172A;padding:2px 16px;border-radius:12px;}
.compare{display:flex;gap:20px;width:100%;}
.col{flex:1;border-radius:24px;overflow:hidden;}
.col-label{font-size:19px;font-weight:900;padding:16px 20px;letter-spacing:1px;text-align:center;}
.col.before .col-label{background:#EF4444;color:#fff;}
.col.after .col-label{background:#0F172A;color:#FACC15;}
.col-body{padding:20px;display:flex;flex-direction:column;gap:10px;}
.col.before .col-body{background:#FFF5F5;border:2px solid #FECACA;border-top:none;border-radius:0 0 24px 24px;}
.col.after .col-body{background:#F0FDF4;border:2px solid #BBF7D0;border-top:none;border-radius:0 0 24px 24px;}
.note{background:#fff;border-radius:12px;padding:12px 14px;font-size:16px;color:#475569;
  border:1.5px solid #E2E8F0;line-height:1.5;}
.note.chaos{border-color:#FECACA;background:#FFF5F5;color:#DC2626;font-weight:700;text-align:center;}
.match{background:#fff;border-radius:12px;padding:12px 16px;border:1.5px solid #BBF7D0;
  display:flex;align-items:center;justify-content:space-between;gap:8px;}
.team{display:flex;flex-direction:column;gap:3px;flex:1;}
.player{font-size:15px;font-weight:700;color:#0F172A;background:#F1F5F9;
  border-radius:8px;padding:5px 10px;text-align:center;}
.vs{font-size:14px;font-weight:900;color:#94A3B8;}
.court{font-size:13px;font-weight:900;color:#16A34A;background:#DCFCE7;
  padding:4px 10px;border-radius:999px;text-align:center;white-space:nowrap;}
.auto-badge{background:#0F172A;border-radius:12px;padding:12px;text-align:center;
  font-size:16px;font-weight:900;color:#FACC15;}
.bottom{text-align:center;width:100%;}
.bottom-txt{font-size:22px;color:#64748B;}
.bottom-txt strong{color:#0F172A;}
</style></head><body>
  <div class="top">
    <div class="kicker">대진표 관리 비교</div>
    <div class="title">대진표, 이제<br><em>자동</em>으로 됩니다</div>
  </div>
  <div class="compare">
    <div class="col before">
      <div class="col-label">❌ 기존 방식</div>
      <div class="col-body">
        <div class="note">📋 메모장 열기</div>
        <div class="note">A급 누구누구… B급 누구…<br>여성은 누구누구…</div>
        <div class="note">1코트: 김민준+이서연 vs…<br>균형이 맞나? 다시 봐야지</div>
        <div class="note">2코트: 아 이건 급수 차이 너무 남</div>
        <div class="note">처음부터 다시… 😮‍💨</div>
        <div class="note chaos">⏱️ 평균 20~30분 소요</div>
      </div>
    </div>
    <div class="col after">
      <div class="col-label">✅ 콕매니저</div>
      <div class="col-body">
        <div class="auto-badge">🔀 자동 대진표 생성 완료</div>
        <div class="match">
          <div class="team">
            <div class="player">김민준 A</div>
            <div class="player">이서연 B</div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div class="player">박지훈 A</div>
            <div class="player">최수아 B</div>
          </div>
          <div class="court">1코트</div>
        </div>
        <div class="match">
          <div class="team">
            <div class="player">정현우 B</div>
            <div class="player">한지민 C</div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div class="player">윤성호 B</div>
            <div class="player">강미래 C</div>
          </div>
          <div class="court">2코트</div>
        </div>
        <div class="auto-badge">⚡ 버튼 하나로 완성</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">급수·성별 균형을 <strong>콕매니저</strong>가 자동으로 맞춰드려요</div>
  </div>
</body></html>` },

// ── 금: 꿀팁 정보성 (대진표) ─────────────────────────────────────────────
{ name: "fri_tips", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#FEF9EE;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:64px 80px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#D97706;letter-spacing:2px;
  background:#FDE68A;padding:8px 24px;border-radius:999px;display:inline-block;margin-bottom:16px;}
.title{font-size:52px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#D97706;font-style:normal;}
.tips{display:flex;flex-direction:column;gap:18px;width:100%;}
.tip{background:#fff;border-radius:22px;padding:28px 32px;display:flex;gap:20px;
  align-items:flex-start;box-shadow:0 4px 20px rgba(0,0,0,0.06);}
.tip-num{width:50px;height:50px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:24px;font-weight:900;flex-shrink:0;}
.n1{background:#FACC15;color:#0F172A;}
.n2{background:#FB923C;color:#fff;}
.n3{background:#34D399;color:#fff;}
.tip-title{font-size:24px;font-weight:900;color:#0F172A;margin-bottom:7px;}
.tip-desc{font-size:18px;color:#64748B;line-height:1.6;}
.tip-desc strong{color:#0F172A;font-weight:700;}
.bottom{background:#0F172A;border-radius:22px;padding:22px 36px;width:100%;text-align:center;}
.bottom-txt{font-size:21px;color:#94A3B8;}
.bottom-txt strong{color:#FACC15;}
</style></head><body>
  <div class="top">
    <div class="kicker">대진표 꿀팁</div>
    <div class="title">공정한 대진표<br><em>짜는 법 3가지</em></div>
  </div>
  <div class="tips">
    <div class="tip">
      <div class="tip-num n1">1</div>
      <div>
        <div class="tip-title">급수별로 코트를 나눠라</div>
        <div class="tip-desc">A급끼리, B급끼리 묶으면 실력 차로 인한<br>불만이 줄고 <strong>경기 밀도</strong>가 올라가요.</div>
      </div>
    </div>
    <div class="tip">
      <div class="tip-num n2">2</div>
      <div>
        <div class="tip-title">한 경기에 남녀 섞기</div>
        <div class="tip-desc">혼합복식으로 구성하면 성별 간 <strong>실력 균형</strong>이<br>자연스럽게 맞춰져 경기가 재미있어져요.</div>
      </div>
    </div>
    <div class="tip">
      <div class="tip-num n3">3</div>
      <div>
        <div class="tip-title">같은 팀 두 번 연속 금지</div>
        <div class="tip-desc">라운드마다 팀 조합을 바꿔야 <strong>더 많은 사람</strong>과<br>경기할 수 있어 만족도가 높아져요.</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">이 세 가지, <strong>콕매니저</strong>는 버튼 하나로 전부 자동이에요 🏸</div>
  </div>
</body></html>` },

// ── 일: 숫자 카드 (대진표) ───────────────────────────────────────────────
{ name: "sun_numbers", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:72px 80px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#64748B;letter-spacing:3px;margin-bottom:20px;}
.title{font-size:50px;font-weight:900;color:#fff;line-height:1.25;}
.title em{color:#FACC15;font-style:normal;}
.big-stat{display:flex;flex-direction:column;align-items:center;gap:8px;
  background:#1E293B;border-radius:32px;width:100%;padding:40px 40px;}
.stat-num{font-size:120px;font-weight:900;color:#EF4444;line-height:1;letter-spacing:-4px;}
.stat-label{font-size:28px;font-weight:700;color:#94A3B8;}
.stat-sub{font-size:20px;color:#475569;margin-top:4px;}
.divider{width:100%;height:2px;background:#1E293B;border-radius:999px;}
.small-stats{display:flex;gap:16px;width:100%;}
.s-card{flex:1;background:#1E293B;border-radius:24px;padding:28px 24px;text-align:center;}
.s-num{font-size:52px;font-weight:900;line-height:1;margin-bottom:10px;}
.s1 .s-num{color:#FACC15;}
.s2 .s-num{color:#34D399;}
.s-label{font-size:18px;font-weight:700;color:#64748B;line-height:1.4;}
.bottom{text-align:center;}
.bottom-txt{font-size:24px;font-weight:700;color:#94A3B8;}
.bottom-txt strong{color:#FACC15;}
</style></head><body>
  <div class="top">
    <div class="kicker">NUMBERS</div>
    <div class="title">배드민턴 총무님,<br>대진표에 <em>이만큼</em> 씁니다</div>
  </div>
  <div class="big-stat">
    <div class="stat-num">20분+</div>
    <div class="stat-label">운동할 때마다 대진표 짜는 시간</div>
    <div class="stat-sub">급수·성별 맞추다 보면 금방 30분</div>
  </div>
  <div class="small-stats">
    <div class="s-card s1">
      <div class="s-num">월 4회</div>
      <div class="s-label">운동 일정마다<br>반복되는 작업</div>
    </div>
    <div class="s-card s2">
      <div class="s-num">0분</div>
      <div class="s-label">콕매니저 사용 시<br>대진표 소요 시간</div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt"><strong>콕매니저</strong>로 그 시간, 운동에 쓰세요 🏸</div>
  </div>
</body></html>` },

];

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(slide.html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1200));
    const outPath = path.join(OUT, `${slide.name}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`✅ ${slide.name}.png`);
  }

  await browser.close();
  console.log(`\n🎉 완료! 저장 위치: ${OUT}`);
})();
