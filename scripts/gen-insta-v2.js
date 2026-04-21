const puppeteer = require("puppeteer");
const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slides = [

// ── 01 훅: 임팩트 강화 ──────────────────────────────────────────────────
{ name: "01_hook", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;padding:72px 88px;}
body::before{content:'';position:absolute;width:720px;height:720px;border-radius:50%;
  background:radial-gradient(circle,rgba(250,204,21,0.09) 0%,transparent 70%);
  top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;}
.badge{align-self:flex-start;background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);
  color:#FACC15;font-size:22px;font-weight:900;padding:11px 28px;border-radius:999px;letter-spacing:1.5px;}
.middle{display:flex;flex-direction:column;gap:0;}
.kicker{font-size:30px;font-weight:700;color:#64748B;margin-bottom:20px;letter-spacing:1px;}
.headline{font-size:96px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-3px;margin-bottom:32px;}
.headline em{color:#FACC15;font-style:normal;}
.sub{font-size:30px;color:#94A3B8;line-height:1.7;}
.sub strong{color:#E2E8F0;font-weight:700;}
.bottom{display:flex;align-items:center;justify-content:space-between;}
.dots{display:flex;gap:8px;}
.dot{width:8px;height:8px;border-radius:50%;background:#FACC15;opacity:0.3;}
.dot.on{opacity:1;width:28px;border-radius:4px;}
.swipe{font-size:20px;color:#334155;font-weight:700;}
</style></head><body>
  <div class="badge">배드민턴 클럽/소모임 총무님께</div>
  <div class="middle">
    <div class="kicker">혹시 아직도...</div>
    <div class="headline">카톡·엑셀로<br><em>클럽 운영</em><br>하세요?</div>
    <div class="sub">신규회원 받고 · 회비 정리하고 · 대진표 짜고<br><strong>총무 혼자 다 하는 거, 이제 그만해도 됩니다.</strong></div>
  </div>
  <div class="bottom">
    <div class="dots">
      <div class="dot on"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
      <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
      <div class="dot"></div><div class="dot"></div>
    </div>
    <div class="swipe">옆으로 넘겨보세요 →</div>
  </div>
</body></html>` },

// ── 02 공감: 마지막 줄 임팩트 강화 ─────────────────────────────────────
{ name: "02_pain", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
  background:#0F172A;border-radius:24px;padding:28px 40px;gap:20px;}
.cta-text{font-size:32px;font-weight:900;color:#fff;}
.cta-text em{color:#FACC15;font-style:normal;}
.cta-arrow{font-size:40px;color:#FACC15;}
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
</body></html>` },

// ── 03 솔루션: 텍스트 수정 ──────────────────────────────────────────────
{ name: "03_solution", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
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
</body></html>` },

// ── 04 회원: 링크 박스 제거 ──────────────────────────────────────────────
{ name: "04_member", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F0FDF4;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:72px 88px;}
.num{font-size:22px;font-weight:900;color:#16A34A;letter-spacing:3px;
  background:#DCFCE7;padding:8px 20px;border-radius:999px;margin-bottom:28px;}
.title{font-size:58px;font-weight:900;color:#0F172A;text-align:center;line-height:1.2;margin-bottom:20px;}
.title span{color:#16A34A;}
.sub{font-size:26px;color:#64748B;text-align:center;margin-bottom:52px;line-height:1.6;}
.mockup{background:#fff;border-radius:32px;padding:44px 56px;width:840px;
  box-shadow:0 20px 60px rgba(0,0,0,0.1);}
.mock-row{display:flex;align-items:center;gap:20px;margin-bottom:24px;}
.mock-label{font-size:22px;font-weight:700;color:#374151;width:150px;flex-shrink:0;}
.mock-input{flex:1;background:#F8FAFC;border:2px solid #E2E8F0;border-radius:16px;
  padding:20px 26px;font-size:21px;color:#94A3B8;font-family:inherit;}
.mock-btn{width:100%;background:#16A34A;color:#fff;border:none;border-radius:20px;
  padding:26px;font-size:28px;font-weight:900;font-family:inherit;margin-top:10px;cursor:pointer;}
</style></head><body>
  <div class="num">FEATURE 01</div>
  <div class="title">신규 회원 받기,<br><span>링크 하나</span>로 끝</div>
  <div class="sub">단톡에 링크 공유 → 회원이 직접 신청 → 자동 등록</div>
  <div class="mockup">
    <div class="mock-row"><div class="mock-label">이름</div><div class="mock-input">홍길동</div></div>
    <div class="mock-row"><div class="mock-label">전화번호</div><div class="mock-input">010 - **** - ****</div></div>
    <div class="mock-row"><div class="mock-label">성별 / 급수</div><div class="mock-input">남 · B급</div></div>
    <button class="mock-btn">가입 신청하기</button>
  </div>
</body></html>` },

// ── 05 일정: 제목 수정 ───────────────────────────────────────────────────
{ name: "05_session", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#EFF6FF;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:72px 88px;}
.num{font-size:22px;font-weight:900;color:#2563EB;letter-spacing:3px;
  background:#DBEAFE;padding:8px 20px;border-radius:999px;margin-bottom:28px;}
.title{font-size:56px;font-weight:900;color:#0F172A;text-align:center;line-height:1.2;margin-bottom:20px;}
.title span{color:#2563EB;}
.sub{font-size:24px;color:#64748B;text-align:center;margin-bottom:48px;line-height:1.6;}
.flow{display:flex;align-items:stretch;gap:0;width:920px;margin-bottom:28px;}
.step{flex:1;background:#fff;border-radius:24px;padding:32px 18px;text-align:center;
  box-shadow:0 4px 20px rgba(0,0,0,0.07);}
.step-icon{font-size:52px;margin-bottom:14px;}
.step-text{font-size:22px;font-weight:900;color:#0F172A;margin-bottom:10px;}
.step-desc{font-size:18px;color:#64748B;line-height:1.5;}
.arrow{font-size:36px;color:#CBD5E1;padding:0 10px;display:flex;align-items:center;flex-shrink:0;}
.stats{display:flex;gap:16px;width:920px;}
.stat{flex:1;border-radius:20px;padding:22px;text-align:center;}
.stat-num{font-size:44px;font-weight:900;color:#fff;}
.stat-label{font-size:18px;color:rgba(255,255,255,0.8);margin-top:6px;}
</style></head><body>
  <div class="num">FEATURE 02</div>
  <div class="title">운동 참석 신청도<br><span>링크 하나</span>로 자동화</div>
  <div class="sub">일정 만들고 → 링크 공유 → 명단 자동 집계</div>
  <div class="flow">
    <div class="step"><div class="step-icon">📅</div><div class="step-text">일정 생성</div><div class="step-desc">날짜·시간·<br>장소·정원 입력</div></div>
    <div class="arrow">›</div>
    <div class="step"><div class="step-icon">🔗</div><div class="step-text">링크 공유</div><div class="step-desc">카톡에<br>링크만 뿌리면</div></div>
    <div class="arrow">›</div>
    <div class="step"><div class="step-icon">✅</div><div class="step-text">자동 집계</div><div class="step-desc">참석·불참·대기<br>자동 정리</div></div>
  </div>
  <div class="stats">
    <div class="stat" style="background:#2563EB"><div class="stat-num">12명</div><div class="stat-label">참석 확정</div></div>
    <div class="stat" style="background:#D97706"><div class="stat-num">3명</div><div class="stat-label">대기 중</div></div>
    <div class="stat" style="background:#EF4444"><div class="stat-num">2명</div><div class="stat-label">불참</div></div>
  </div>
</body></html>` },

// ── 07 대진표: AI → 콕매니저 ────────────────────────────────────────────
{ name: "07_bracket", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F5F3FF;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:72px 88px;}
.num{font-size:22px;font-weight:900;color:#7C3AED;letter-spacing:3px;
  background:#EDE9FE;padding:8px 20px;border-radius:999px;margin-bottom:28px;}
.title{font-size:56px;font-weight:900;color:#0F172A;text-align:center;line-height:1.2;margin-bottom:20px;}
.title span{color:#7C3AED;}
.sub{font-size:24px;color:#64748B;text-align:center;margin-bottom:44px;}
.bracket-wrap{display:flex;gap:20px;align-items:flex-start;width:920px;}
.b-section{flex:1;}
.b-header{font-size:20px;font-weight:900;color:#fff;border-radius:16px 16px 0 0;padding:16px 20px;text-align:center;}
.match{background:#fff;border-bottom:1px solid #E2E8F0;padding:18px 22px;
  display:flex;justify-content:space-between;align-items:center;}
.match:last-child{border-radius:0 0 16px 16px;border-bottom:none;}
.team{font-size:19px;font-weight:700;color:#0F172A;}
.vs{font-size:16px;font-weight:900;color:#94A3B8;}
.btn-area{margin-top:28px;width:920px;}
.gen-btn{width:100%;background:#7C3AED;color:#fff;border:none;border-radius:20px;
  padding:26px;font-size:28px;font-weight:900;font-family:inherit;
  box-shadow:0 8px 30px rgba(124,58,237,0.3);cursor:pointer;}
</style></head><body>
  <div class="num">FEATURE 04</div>
  <div class="title">대진표,<br><span>버튼 하나</span>로 자동 완성</div>
  <div class="sub">급수·성별 균형을 콕매니저가 자동으로 맞춰드려요</div>
  <div class="bracket-wrap">
    <div class="b-section">
      <div class="b-header" style="background:#7C3AED">코트 A</div>
      <div class="match"><div class="team">김민준 · 이서연</div><div class="vs">VS</div><div class="team">박지훈 · 최수아</div></div>
      <div class="match"><div class="team">정태양 · 윤하나</div><div class="vs">VS</div><div class="team">강민호 · 신지아</div></div>
    </div>
    <div class="b-section">
      <div class="b-header" style="background:#2563EB">코트 B</div>
      <div class="match"><div class="team">오준혁 · 임소현</div><div class="vs">VS</div><div class="team">배성우 · 노유진</div></div>
      <div class="match"><div class="team">한재원 · 조민아</div><div class="vs">VS</div><div class="team">서동현 · 유채린</div></div>
    </div>
  </div>
  <div class="btn-area"><button class="gen-btn">대진 자동 생성</button></div>
</body></html>` },

];

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(slide.html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: `c:/Users/user/Desktop/kokmani-insta/${slide.name}.png`, type: "png" });
    await page.close();
    console.log("done:", slide.name);
  }
  await browser.close();
  console.log("완료!");
})();
