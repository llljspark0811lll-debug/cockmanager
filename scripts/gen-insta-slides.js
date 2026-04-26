const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080;
const H = 1080;

// ─── 공통 CSS ───────────────────────────────────────────────────────────────
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; }
  .slide { width: ${W}px; height: ${H}px; position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; }
`;

// ─── 슬라이드 HTML 정의 ────────────────────────────────────────────────────
const slides = [

// ── 1. 훅 (커버) ─────────────────────────────────────────────────────────
{
  name: "01_hook",
  html: `
  <style>${BASE_CSS}
    body { background: #0F172A; }
    .badge { background: #FACC15; color: #0F172A; font-size: 26px; font-weight: 900;
      padding: 12px 32px; border-radius: 999px; letter-spacing: 2px; margin-bottom: 52px; }
    .big { font-size: 88px; font-weight: 900; color: #fff; line-height: 1.2;
      text-align: center; letter-spacing: -2px; }
    .big span { color: #FACC15; }
    .sub { margin-top: 40px; font-size: 32px; color: #94A3B8; text-align: center; line-height: 1.7; }
    .swipe { position: absolute; bottom: 60px; font-size: 22px; color: #475569;
      display: flex; align-items: center; gap: 10px; }
    .dots { display: flex; gap: 8px; position: absolute; bottom: 68px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #FACC15; opacity: 0.4; }
    .dot.on { opacity: 1; width: 24px; border-radius: 4px; }
    /* 배경 장식 */
    .bg-circle { position: absolute; border-radius: 50%; }
    .logo-area { display: flex; align-items: center; gap: 16px; margin-bottom: 36px; }
    .logo-emoji { font-size: 72px; }
    .logo-text { font-size: 44px; font-weight: 900; color: #FACC15; }
  </style>
  <body>
    <div class="bg-circle" style="width:600px;height:600px;background:rgba(250,204,21,0.05);top:-200px;right:-200px;"></div>
    <div class="bg-circle" style="width:400px;height:400px;background:rgba(250,204,21,0.04);bottom:-100px;left:-100px;"></div>
    <div class="slide">
      <div class="badge">배드민턴 클럽/소모임 총무님께</div>
      <div class="big">
        아직도<br><span>카톡·엑셀</span>로<br>클럽 운영 하세요?
      </div>
      <div class="sub">신규회원 받고, 회비 정리하고, 대진표 짜고…<br>총무 혼자 다 하는 거 맞죠?</div>
      <div class="dots">
        <div class="dot on"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
    </div>
  </body>`
},

// ── 2. 공감 (총무의 현실) ─────────────────────────────────────────────────
{
  name: "02_pain",
  html: `
  <style>${BASE_CSS}
    body { background: #FEF9EE; }
    .title { font-size: 48px; font-weight: 900; color: #0F172A; text-align: center; margin-bottom: 12px; }
    .title span { color: #EF4444; }
    .subtitle { font-size: 24px; color: #64748B; text-align: center; margin-bottom: 56px; }
    .cards { display: flex; flex-direction: column; gap: 20px; width: 880px; }
    .card { background: #fff; border-radius: 24px; padding: 28px 36px;
      display: flex; align-items: center; gap: 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07); border-left: 6px solid; }
    .card.red { border-color: #EF4444; }
    .card.orange { border-color: #F97316; }
    .card.blue { border-color: #3B82F6; }
    .icon { font-size: 44px; flex-shrink: 0; }
    .card-text h3 { font-size: 26px; font-weight: 900; color: #0F172A; margin-bottom: 6px; }
    .card-text p { font-size: 20px; color: #64748B; line-height: 1.5; }
    .bottom { margin-top: 40px; font-size: 22px; color: #94A3B8; text-align: center; }
  </style>
  <body>
    <div class="slide">
      <div class="title">총무님의 <span>현실</span></div>
      <div class="subtitle">이 중 하나라도 해당되신다면 끝까지 봐주세요</div>
      <div class="cards">
        <div class="card red">
          <div class="icon">💬</div>
          <div class="card-text">
            <h3>단톡방 공지 + 댓글 취합</h3>
            <p>신청합니다 / 저도요 / 불참이요 — 하나씩 세고 계시죠?</p>
          </div>
        </div>
        <div class="card orange">
          <div class="icon">📊</div>
          <div class="card-text">
            <h3>매달 엑셀로 회비 정리</h3>
            <p>누가 냈는지, 얼마 남았는지 일일이 체크 중이시죠?</p>
          </div>
        </div>
        <div class="card blue">
          <div class="icon">✏️</div>
          <div class="card-text">
            <h3>운동 당일 수기 대진표</h3>
            <p>급수 맞춰서 손으로 짜면 20분은 기본이죠?</p>
          </div>
        </div>
      </div>
      <div class="bottom">이 모든 게 오늘 끝납니다 →</div>
    </div>
  </body>`
},

// ── 3. 솔루션 소개 ────────────────────────────────────────────────────────
{
  name: "03_solution",
  html: `
  <style>${BASE_CSS}
    body { background: #0F172A; }
    .bg-glow { position: absolute; width: 700px; height: 700px; border-radius: 50%;
      background: radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%);
      top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .logo-wrap { display: flex; align-items: center; gap: 24px; margin-bottom: 40px; }
    .logo-img { width: 120px; height: 120px; border-radius: 28px; }
    .logo-name { font-size: 72px; font-weight: 900; color: #FACC15; }
    .tagline { font-size: 38px; font-weight: 700; color: #fff; text-align: center; line-height: 1.6; margin-bottom: 16px; }
    .tagline span { color: #FACC15; }
    .desc { font-size: 24px; color: #94A3B8; text-align: center; line-height: 1.7; }
    .chips { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 48px; }
    .chip { background: rgba(250,204,21,0.15); border: 1px solid rgba(250,204,21,0.3);
      color: #FACC15; font-size: 20px; font-weight: 700; padding: 10px 24px; border-radius: 999px; }
  </style>
  <body>
    <div class="bg-glow"></div>
    <div class="slide">
      <div class="logo-name">콕매니저 🏸</div>
      <div class="tagline">배드민턴 클럽 운영의<br><span>모든 것</span>을 한 곳에</div>
      <div class="desc">회원관리 · 일정관리 · 회비관리 · 자동대진표<br>총무 혼자서도 클럽 운영이 쉬워집니다</div>
      <div class="chips">
        <div class="chip">무료 시작</div>
        <div class="chip">앱 설치 가능</div>
        <div class="chip">카카오톡 공유</div>
      </div>
    </div>
  </body>`
},

// ── 4. 기능: 회원 가입 ────────────────────────────────────────────────────
{
  name: "04_member",
  html: `
  <style>${BASE_CSS}
    body { background: #F0FDF4; }
    .num { font-size: 22px; font-weight: 900; color: #16A34A; letter-spacing: 3px;
      background: #DCFCE7; padding: 8px 20px; border-radius: 999px; margin-bottom: 28px; }
    .title { font-size: 58px; font-weight: 900; color: #0F172A; text-align: center;
      line-height: 1.2; margin-bottom: 20px; }
    .title span { color: #16A34A; }
    .sub { font-size: 26px; color: #64748B; text-align: center; margin-bottom: 56px; line-height: 1.6; }
    .mockup { background: #fff; border-radius: 32px; padding: 36px 48px; width: 820px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
    .mock-row { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
    .mock-label { font-size: 20px; font-weight: 700; color: #374151; width: 140px; flex-shrink: 0; }
    .mock-input { flex: 1; background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 16px;
      padding: 16px 24px; font-size: 20px; color: #94A3B8; font-family: inherit; }
    .mock-btn { width: 100%; background: #16A34A; color: #fff; border: none; border-radius: 20px;
      padding: 22px; font-size: 24px; font-weight: 900; font-family: inherit; margin-top: 12px; cursor: pointer; }
    .link-box { background: #DCFCE7; border: 2px solid #86EFAC; border-radius: 20px;
      padding: 20px 28px; font-size: 20px; color: #166534; font-weight: 700;
      display: flex; align-items: center; gap: 12px; margin-top: 28px; }
    .link-chip { background: #16A34A; color: #fff; border-radius: 10px; padding: 6px 16px;
      font-size: 18px; font-weight: 900; flex-shrink: 0; }
  </style>
  <body>
    <div class="slide">
      <div class="num">FEATURE 01</div>
      <div class="title">신규 회원 받기,<br><span>링크 하나</span>로 끝</div>
      <div class="sub">단톡에 링크 공유 → 회원이 직접 신청 → 자동 등록</div>
      <div class="mockup">
        <div class="mock-row">
          <div class="mock-label">이름</div>
          <div class="mock-input">홍길동</div>
        </div>
        <div class="mock-row">
          <div class="mock-label">전화번호</div>
          <div class="mock-input">010 - **** - ****</div>
        </div>
        <div class="mock-row">
          <div class="mock-label">성별 / 급수</div>
          <div class="mock-input">남 · B급</div>
        </div>
        <button class="mock-btn">가입 신청하기</button>
        <div class="link-box">
          <div class="link-chip">링크</div>
          cockmanager.kr/join/abc123
        </div>
      </div>
    </div>
  </body>`
},

// ── 5. 기능: 운동 일정 + 참석 ─────────────────────────────────────────────
{
  name: "05_session",
  html: `
  <style>${BASE_CSS}
    body { background: #EFF6FF; }
    .num { font-size: 22px; font-weight: 900; color: #2563EB; letter-spacing: 3px;
      background: #DBEAFE; padding: 8px 20px; border-radius: 999px; margin-bottom: 28px; }
    .title { font-size: 56px; font-weight: 900; color: #0F172A; text-align: center;
      line-height: 1.2; margin-bottom: 20px; }
    .title span { color: #2563EB; }
    .sub { font-size: 24px; color: #64748B; text-align: center; margin-bottom: 44px; line-height: 1.6; }
    .flow { display: flex; align-items: center; gap: 0; width: 900px; }
    .step { flex: 1; background: #fff; border-radius: 24px; padding: 28px 16px; text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
    .step-icon { font-size: 48px; margin-bottom: 12px; }
    .step-text { font-size: 20px; font-weight: 900; color: #0F172A; margin-bottom: 8px; }
    .step-desc { font-size: 17px; color: #64748B; line-height: 1.4; }
    .arrow { font-size: 36px; color: #CBD5E1; padding: 0 8px; flex-shrink: 0; }
    .stats { display: flex; gap: 16px; margin-top: 28px; }
    .stat { flex: 1; background: #2563EB; color: #fff; border-radius: 20px; padding: 20px;
      text-align: center; }
    .stat-num { font-size: 40px; font-weight: 900; }
    .stat-label { font-size: 17px; opacity: 0.8; margin-top: 4px; }
    .stat.green { background: #16A34A; }
    .stat.amber { background: #D97706; }
  </style>
  <body>
    <div class="slide">
      <div class="num">FEATURE 02</div>
      <div class="title">참석 신청도<br><span>링크 하나</span>로 자동화</div>
      <div class="sub">일정 만들고 → 링크 공유 → 명단 자동 집계</div>
      <div class="flow">
        <div class="step">
          <div class="step-icon">📅</div>
          <div class="step-text">일정 생성</div>
          <div class="step-desc">날짜·시간·<br>장소·정원 입력</div>
        </div>
        <div class="arrow">›</div>
        <div class="step">
          <div class="step-icon">🔗</div>
          <div class="step-text">링크 공유</div>
          <div class="step-desc">카톡에<br>링크만 뿌리면</div>
        </div>
        <div class="arrow">›</div>
        <div class="step">
          <div class="step-icon">✅</div>
          <div class="step-text">자동 집계</div>
          <div class="step-desc">참석·불참·대기<br>자동 정리</div>
        </div>
      </div>
      <div class="stats" style="width:900px">
        <div class="stat">
          <div class="stat-num">12명</div>
          <div class="stat-label">참석 확정</div>
        </div>
        <div class="stat amber">
          <div class="stat-num">3명</div>
          <div class="stat-label">대기 중</div>
        </div>
        <div class="stat" style="background:#EF4444">
          <div class="stat-num">2명</div>
          <div class="stat-label">불참</div>
        </div>
      </div>
    </div>
  </body>`
},

// ── 6. 기능: 회비 관리 ────────────────────────────────────────────────────
{
  name: "06_fee",
  html: `
  <style>${BASE_CSS}
    body { background: #FFFBEB; }
    .num { font-size: 22px; font-weight: 900; color: #D97706; letter-spacing: 3px;
      background: #FEF3C7; padding: 8px 20px; border-radius: 999px; margin-bottom: 28px; }
    .title { font-size: 56px; font-weight: 900; color: #0F172A; text-align: center;
      line-height: 1.2; margin-bottom: 20px; }
    .title span { color: #D97706; }
    .sub { font-size: 24px; color: #64748B; text-align: center; margin-bottom: 48px; }
    .table-wrap { background: #fff; border-radius: 28px; overflow: hidden; width: 860px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.1); }
    .t-header { background: #0F172A; display: flex; padding: 20px 32px; gap: 0; }
    .t-col { color: #fff; font-size: 20px; font-weight: 700; flex: 1; text-align: center; }
    .t-row { display: flex; padding: 18px 32px; border-bottom: 1px solid #F1F5F9;
      align-items: center; }
    .t-row:last-child { border-bottom: none; }
    .t-cell { flex: 1; font-size: 20px; color: #0F172A; text-align: center; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 999px; font-size: 17px;
      font-weight: 900; }
    .paid { background: #DCFCE7; color: #16A34A; }
    .unpaid { background: #FEE2E2; color: #DC2626; }
    .summary { display: flex; gap: 16px; margin-top: 24px; width: 860px; }
    .sum-box { flex: 1; border-radius: 20px; padding: 20px; text-align: center; }
    .sum-num { font-size: 36px; font-weight: 900; }
    .sum-label { font-size: 18px; margin-top: 4px; }
  </style>
  <body>
    <div class="slide">
      <div class="num">FEATURE 03</div>
      <div class="title">회비 관리도<br><span>한눈에</span> 파악</div>
      <div class="sub">엑셀 없이, 납부·미납 현황 자동 정리</div>
      <div class="table-wrap">
        <div class="t-header">
          <div class="t-col">이름</div>
          <div class="t-col">납부액</div>
          <div class="t-col">상태</div>
        </div>
        <div class="t-row">
          <div class="t-cell">김민준</div>
          <div class="t-cell">30,000원</div>
          <div class="t-cell"><span class="badge paid">납부 완료</span></div>
        </div>
        <div class="t-row">
          <div class="t-cell">이서연</div>
          <div class="t-cell">30,000원</div>
          <div class="t-cell"><span class="badge paid">납부 완료</span></div>
        </div>
        <div class="t-row" style="background:#FFF9F9">
          <div class="t-cell">박지훈</div>
          <div class="t-cell">—</div>
          <div class="t-cell"><span class="badge unpaid">미납</span></div>
        </div>
        <div class="t-row">
          <div class="t-cell">최수아</div>
          <div class="t-cell">30,000원</div>
          <div class="t-cell"><span class="badge paid">납부 완료</span></div>
        </div>
      </div>
      <div class="summary">
        <div class="sum-box" style="background:#DCFCE7;color:#16A34A">
          <div class="sum-num">8명</div>
          <div class="sum-label">납부 완료</div>
        </div>
        <div class="sum-box" style="background:#FEE2E2;color:#DC2626">
          <div class="sum-num">3명</div>
          <div class="sum-label">미납</div>
        </div>
        <div class="sum-box" style="background:#FEF3C7;color:#D97706">
          <div class="sum-num">240,000원</div>
          <div class="sum-label">이번 달 수납액</div>
        </div>
      </div>
    </div>
  </body>`
},

// ── 7. 기능: 자동 대진표 ──────────────────────────────────────────────────
{
  name: "07_bracket",
  html: `
  <style>${BASE_CSS}
    body { background: #F5F3FF; }
    .num { font-size: 22px; font-weight: 900; color: #7C3AED; letter-spacing: 3px;
      background: #EDE9FE; padding: 8px 20px; border-radius: 999px; margin-bottom: 28px; }
    .title { font-size: 56px; font-weight: 900; color: #0F172A; text-align: center;
      line-height: 1.2; margin-bottom: 20px; }
    .title span { color: #7C3AED; }
    .sub { font-size: 24px; color: #64748B; text-align: center; margin-bottom: 44px; }
    .bracket-wrap { display: flex; gap: 20px; align-items: flex-start; width: 900px; }
    .b-section { flex: 1; }
    .b-header { font-size: 20px; font-weight: 900; color: #fff; background: #7C3AED;
      border-radius: 16px 16px 0 0; padding: 14px 20px; text-align: center; }
    .b-header.blue { background: #2563EB; }
    .match { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 14px 20px;
      display: flex; justify-content: space-between; align-items: center; }
    .match:last-child { border-radius: 0 0 16px 16px; border-bottom: none; }
    .team { font-size: 19px; font-weight: 700; color: #0F172A; }
    .vs { font-size: 16px; font-weight: 900; color: #94A3B8; }
    .level-chip { font-size: 15px; font-weight: 900; padding: 4px 12px; border-radius: 999px; }
    .lv-a { background: #DCFCE7; color: #16A34A; }
    .lv-b { background: #EDE9FE; color: #7C3AED; }
    .btn-area { margin-top: 28px; text-align: center; }
    .gen-btn { background: #7C3AED; color: #fff; border: none; border-radius: 20px;
      padding: 22px 60px; font-size: 26px; font-weight: 900; font-family: inherit;
      box-shadow: 0 8px 30px rgba(124,58,237,0.35); }
  </style>
  <body>
    <div class="slide">
      <div class="num">FEATURE 04</div>
      <div class="title">대진표,<br><span>버튼 하나</span>로 자동 완성</div>
      <div class="sub">급수·성별 균형을 AI가 자동으로 맞춰드려요</div>
      <div class="bracket-wrap">
        <div class="b-section">
          <div class="b-header">코트 A</div>
          <div class="match">
            <div class="team">김민준 · 이서연</div>
            <div class="vs">VS</div>
            <div class="team">박지훈 · 최수아</div>
          </div>
          <div class="match">
            <div class="team">정태양 · 윤하나</div>
            <div class="vs">VS</div>
            <div class="team">강민호 · 신지아</div>
          </div>
        </div>
        <div class="b-section">
          <div class="b-header blue">코트 B</div>
          <div class="match">
            <div class="team">오준혁 · 임소현</div>
            <div class="vs">VS</div>
            <div class="team">배성우 · 노유진</div>
          </div>
          <div class="match">
            <div class="team">한재원 · 조민아</div>
            <div class="vs">VS</div>
            <div class="team">서동현 · 유채린</div>
          </div>
        </div>
      </div>
      <div class="btn-area">
        <button class="gen-btn">대진 자동 생성</button>
      </div>
    </div>
  </body>`
},

// ── 8. 앱처럼 사용 (PWA) ──────────────────────────────────────────────────
{
  name: "08_pwa",
  html: `
  <style>${BASE_CSS}
    body { background: #0F172A; }
    .bg-circle { position: absolute; border-radius: 50%; }
    .num { font-size: 22px; font-weight: 900; color: #38BDF8; letter-spacing: 3px;
      background: rgba(56,189,248,0.15); padding: 8px 20px; border-radius: 999px; margin-bottom: 28px; z-index:1; }
    .title { font-size: 56px; font-weight: 900; color: #fff; text-align: center;
      line-height: 1.2; margin-bottom: 20px; z-index:1; }
    .title span { color: #38BDF8; }
    .sub { font-size: 24px; color: #94A3B8; text-align: center; margin-bottom: 48px; z-index:1; }
    .phones { display: flex; gap: 28px; align-items: center; z-index:1; }
    .phone { background: #1E293B; border-radius: 32px; padding: 20px 16px; width: 220px;
      border: 2px solid #334155; }
    .phone-screen { background: #0F172A; border-radius: 20px; padding: 16px 12px; }
    .app-icon-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .app-icon { width: 56px; height: 56px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .home-label { font-size: 13px; color: #64748B; text-align: center; margin-top: 8px; }
    .install-banner { background: #FACC15; border-radius: 16px; padding: 12px 16px;
      margin-top: 12px; text-align: center; font-size: 16px; font-weight: 900; color: #0F172A; }
    .feature-list { display: flex; flex-direction: column; gap: 16px; margin-left: 32px; z-index:1; }
    .feat { display: flex; align-items: center; gap: 16px; }
    .feat-dot { width: 10px; height: 10px; border-radius: 50%; background: #38BDF8; flex-shrink: 0; }
    .feat-text { font-size: 22px; color: #E2E8F0; font-weight: 600; }
  </style>
  <body>
    <div class="bg-circle" style="width:500px;height:500px;background:rgba(56,189,248,0.06);top:-100px;right:-100px;"></div>
    <div class="slide">
      <div class="num">BONUS</div>
      <div class="title">앱 설치도<br><span>가능해요</span></div>
      <div class="sub">따로 앱스토어 없이, 홈 화면에 바로 추가</div>
      <div class="phones">
        <div class="phone">
          <div class="phone-screen">
            <div class="app-icon-row">
              <div class="app-icon" style="background:#FACC15">🏸</div>
              <div class="app-icon" style="background:#1E3A5F">📱</div>
              <div class="app-icon" style="background:#1A2E1A">📷</div>
              <div class="app-icon" style="background:#2D1B69">🎵</div>
            </div>
            <div class="home-label">홈 화면에 추가</div>
          </div>
          <div class="install-banner">콕매니저 설치 완료!</div>
        </div>
        <div class="feature-list">
          <div class="feat"><div class="feat-dot"></div><div class="feat-text">앱처럼 전체화면 실행</div></div>
          <div class="feat"><div class="feat-dot"></div><div class="feat-text">iOS · 안드로이드 모두 지원</div></div>
          <div class="feat"><div class="feat-dot"></div><div class="feat-text">앱스토어 설치 필요 없음</div></div>
          <div class="feat"><div class="feat-dot"></div><div class="feat-text">링크 없이 바로 실행</div></div>
          <div class="feat"><div class="feat-dot"></div><div class="feat-text">항상 최신 버전 자동 유지</div></div>
        </div>
      </div>
    </div>
  </body>`
},

// ── 9. 전체 요약 그리드 ───────────────────────────────────────────────────
{
  name: "09_summary",
  html: `
  <style>${BASE_CSS}
    body { background: #F8FAFC; }
    .title { font-size: 52px; font-weight: 900; color: #0F172A; text-align: center;
      margin-bottom: 12px; }
    .title span { color: #FACC15; }
    .sub { font-size: 24px; color: #64748B; text-align: center; margin-bottom: 48px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 880px; }
    .card { border-radius: 28px; padding: 36px; display: flex; flex-direction: column; gap: 16px; }
    .card-icon { font-size: 52px; }
    .card-title { font-size: 28px; font-weight: 900; }
    .card-desc { font-size: 20px; line-height: 1.6; opacity: 0.85; }
  </style>
  <body>
    <div class="slide">
      <div class="title">콕매니저 <span>4가지</span> 핵심 기능</div>
      <div class="sub">총무 업무의 80%를 자동으로 처리합니다</div>
      <div class="grid">
        <div class="card" style="background:#DCFCE7;color:#14532D">
          <div class="card-icon">👥</div>
          <div class="card-title">회원 관리</div>
          <div class="card-desc">가입 링크 공유만으로<br>신규 회원 자동 등록</div>
        </div>
        <div class="card" style="background:#DBEAFE;color:#1E3A8A">
          <div class="card-icon">📅</div>
          <div class="card-title">운동 일정</div>
          <div class="card-desc">참석·불참·대기 현황<br>실시간 자동 집계</div>
        </div>
        <div class="card" style="background:#FEF3C7;color:#78350F">
          <div class="card-icon">💰</div>
          <div class="card-title">회비 관리</div>
          <div class="card-desc">납부·미납 현황 한눈에<br>엑셀 없이 자동 정리</div>
        </div>
        <div class="card" style="background:#EDE9FE;color:#4C1D95">
          <div class="card-icon">🏆</div>
          <div class="card-title">자동 대진표</div>
          <div class="card-desc">급수·성별 균형 대진표<br>버튼 하나로 생성</div>
        </div>
      </div>
    </div>
  </body>`
},

// ── 10. CTA ──────────────────────────────────────────────────────────────
{
  name: "10_cta",
  html: `
  <style>${BASE_CSS}
    body { background: #0F172A; }
    .bg-glow { position: absolute; width: 800px; height: 800px; border-radius: 50%;
      background: radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%);
      top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .logo { font-size: 64px; font-weight: 900; color: #FACC15; margin-bottom: 12px; z-index:1; }
    .headline { font-size: 52px; font-weight: 900; color: #fff; text-align: center;
      line-height: 1.3; margin-bottom: 20px; z-index:1; }
    .headline span { color: #FACC15; }
    .desc { font-size: 24px; color: #94A3B8; text-align: center; line-height: 1.7;
      margin-bottom: 52px; z-index:1; }
    .cta-btn { background: #FACC15; color: #0F172A; border: none; border-radius: 24px;
      padding: 28px 72px; font-size: 30px; font-weight: 900; font-family: inherit;
      box-shadow: 0 8px 40px rgba(250,204,21,0.35); margin-bottom: 24px; z-index:1; }
    .url { font-size: 22px; color: #FACC15; opacity: 0.7; z-index:1; margin-bottom: 48px; }
    .note { font-size: 20px; color: #475569; z-index:1; text-align: center; }
    .note span { color: #FACC15; }
  </style>
  <body>
    <div class="bg-glow"></div>
    <div class="slide">
      <div class="logo">콕매니저 🏸</div>
      <div class="headline">총무 혼자 다 하지 마세요.<br>운동에만 <span>집중하세요.</span></div>
      <div class="desc">배드민턴 클럽 운영, 이제 스마트하게.<br>지금 바로 무료로 시작할 수 있습니다.</div>
      <button class="cta-btn">무료로 시작하기</button>
      <div class="url">프로필 링크에서 바로 시작</div>
      <div class="note">
        #배드민턴 &nbsp;#배드민턴동호회 &nbsp;#<span>콕매니저</span><br>
        #배드민턴클럽 &nbsp;#동호회총무 &nbsp;#클럽관리앱
      </div>
    </div>
  </body>`
},

]; // end slides

// ─── 메인 실행 ─────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(slide.html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1200)); // 웹폰트 로드 대기

    const outPath = path.join(OUT, `${slide.name}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`✅ ${slide.name}.png`);
  }

  await browser.close();
  console.log(`\n🎉 완료! 저장 위치: ${OUT}`);
})();
