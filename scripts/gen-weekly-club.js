const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/weekly-club";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slides = [

// ── 화: 총무의 월간 루틴 밈 ───────────────────────────────────────────────
{ name: "tue_meme", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:68px 80px;}
.tag{background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);color:#FACC15;
  font-size:22px;font-weight:900;padding:10px 28px;border-radius:999px;letter-spacing:2px;}
.timeline{display:flex;flex-direction:column;gap:0;width:100%;}
.week{display:flex;align-items:stretch;gap:20px;}
.week-label{width:72px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4px;}
.week-badge{background:#334155;border-radius:10px;padding:6px 10px;font-size:16px;font-weight:900;color:#94A3B8;white-space:nowrap;}
.week-line{flex:1;width:2px;background:#1E293B;margin:6px auto 0;}
.tasks{flex:1;display:flex;flex-direction:column;gap:8px;padding-bottom:20px;}
.task{border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;}
.t-icon{font-size:22px;flex-shrink:0;}
.t-text{font-size:19px;font-weight:700;}
.task.red{background:#450A0A;border:1.5px solid #991B1B;}.task.red .t-text{color:#FCA5A5;}
.task.orange{background:#431407;border:1.5px solid #9A3412;}.task.orange .t-text{color:#FDB97D;}
.task.blue{background:#0C1A3A;border:1.5px solid #1E40AF;}.task.blue .t-text{color:#93C5FD;}
.task.yellow{background:#422006;border:1.5px solid #92400E;}.task.yellow .t-text{color:#FCD34D;}
.task.gray{background:#1E293B;border:1.5px solid #334155;}.task.gray .t-text{color:#CBD5E1;}
.punchline{text-align:center;}
.punch-label{font-size:24px;color:#64748B;margin-bottom:10px;}
.punch-big{font-size:58px;font-weight:900;color:#fff;line-height:1.2;}
.punch-big em{color:#FACC15;font-style:normal;}
</style></head><body>
  <div class="tag">정기 배드민턴 동호회 총무님</div>
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
        <div class="task yellow"><span class="t-icon">🏸</span><span class="t-text">참석 명단 보고 대진표 손으로 작성</span></div>
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
        <div class="task gray"><span class="t-icon">😮‍💨</span><span class="t-text">신규 회원 연락처·급수 수동 등록</span></div>
        <div class="task red"><span class="t-icon">💰</span><span class="t-text">다음 달 회비 준비 시작…</span></div>
      </div>
    </div>
  </div>
  <div class="punchline">
    <div class="punch-label">이걸 매달 반복하는 게</div>
    <div class="punch-big">총무님 <em>혼자</em>라고요? 🫠</div>
  </div>
</body></html>` },

// ── 수: Before/After (클럽 운영 전반) ────────────────────────────────────
{ name: "wed_before_after", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F8FAFC;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:60px 72px 52px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#94A3B8;letter-spacing:2px;margin-bottom:12px;}
.title{font-size:52px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#0F172A;font-style:normal;
  background:#FACC15;padding:0 12px;border-radius:10px;}
.compare{display:flex;gap:20px;width:100%;}
.col{flex:1;border-radius:24px;overflow:hidden;}
.col-label{font-size:18px;font-weight:900;padding:16px;letter-spacing:1px;text-align:center;}
.col.before .col-label{background:#EF4444;color:#fff;}
.col.after .col-label{background:#0F172A;color:#FACC15;}
.col-body{padding:18px 16px;display:flex;flex-direction:column;gap:10px;}
.col.before .col-body{background:#FFF5F5;border:2px solid #FECACA;border-top:none;border-radius:0 0 24px 24px;}
.col.after .col-body{background:#F0FDF4;border:2px solid #BBF7D0;border-top:none;border-radius:0 0 24px 24px;}
.tool{background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;
  border:1.5px solid #E2E8F0;}
.tool-icon{font-size:20px;flex-shrink:0;}
.tool-text{font-size:16px;font-weight:700;color:#475569;}
.tool-sub{font-size:13px;color:#94A3B8;margin-top:2px;}
.chaos{background:#FEE2E2;border-radius:12px;padding:10px 14px;text-align:center;
  font-size:15px;font-weight:900;color:#DC2626;border:1.5px solid #FECACA;}
.feature{background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;
  border:1.5px solid #BBF7D0;}
.f-icon{font-size:20px;flex-shrink:0;}
.f-text{font-size:16px;font-weight:700;color:#0F172A;}
.f-sub{font-size:13px;color:#16A34A;margin-top:2px;font-weight:700;}
.all-in{background:#0F172A;border-radius:12px;padding:12px 14px;text-align:center;
  font-size:15px;font-weight:900;color:#FACC15;}
.bottom{text-align:center;}
.bottom-txt{font-size:21px;color:#64748B;}
.bottom-txt strong{color:#0F172A;}
</style></head><body>
  <div class="top">
    <div class="kicker">클럽 운영 방식 비교</div>
    <div class="title">동호회 운영,<br>이제 <em>한 앱</em>으로</div>
  </div>
  <div class="compare">
    <div class="col before">
      <div class="col-label">❌ 기존 방식</div>
      <div class="col-body">
        <div class="tool">
          <span class="tool-icon">💬</span>
          <div><div class="tool-text">카카오톡</div><div class="tool-sub">공지·참석 취합·독촉</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">📊</span>
          <div><div class="tool-text">엑셀</div><div class="tool-sub">회원 명단·회비 정리</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">📝</span>
          <div><div class="tool-text">메모장·종이</div><div class="tool-sub">대진표 수기 작성</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">🧠</span>
          <div><div class="tool-text">총무 머릿속</div><div class="tool-sub">나머지 전부</div></div>
        </div>
        <div class="chaos">전부 따로따로 😮‍💨</div>
      </div>
    </div>
    <div class="col after">
      <div class="col-label">✅ 콕매니저</div>
      <div class="col-body">
        <div class="feature">
          <span class="f-icon">👥</span>
          <div><div class="f-text">회원 관리</div><div class="f-sub">가입 링크로 자동 등록</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">📅</span>
          <div><div class="f-text">일정·참석 관리</div><div class="f-sub">실시간 자동 집계</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">💰</span>
          <div><div class="f-text">회비 관리</div><div class="f-sub">납부·미납 자동 정리</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">🏸</span>
          <div><div class="f-text">자동 대진표</div><div class="f-sub">급수·성별 균형 자동</div></div>
        </div>
        <div class="all-in">전부 한 앱에서 ⚡</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt"><strong>콕매니저</strong> 하나로 총무 업무 80% 자동화</div>
  </div>
</body></html>` },

// ── 금: 정보성 (총무 월간 체크리스트) ────────────────────────────────────
{ name: "fri_tips", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#FEF9EE;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:64px 80px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#D97706;letter-spacing:2px;
  background:#FDE68A;padding:8px 24px;border-radius:999px;display:inline-block;margin-bottom:16px;}
.title{font-size:50px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#D97706;font-style:normal;}
.checklist{display:flex;flex-direction:column;gap:16px;width:100%;}
.item{background:#fff;border-radius:20px;padding:26px 28px;display:flex;gap:18px;
  align-items:flex-start;box-shadow:0 4px 16px rgba(0,0,0,0.05);}
.check{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;
  justify-content:center;font-size:22px;flex-shrink:0;}
.c1{background:#EDE9FE;}.c2{background:#DCFCE7;}.c3{background:#FEF3C7;}
.item-title{font-size:22px;font-weight:900;color:#0F172A;margin-bottom:6px;}
.item-desc{font-size:17px;color:#64748B;line-height:1.5;}
.item-desc strong{color:#0F172A;font-weight:700;}
.item-tag{display:inline-block;margin-top:8px;font-size:14px;font-weight:900;
  padding:4px 12px;border-radius:999px;}
.tag1{background:#EDE9FE;color:#7C3AED;}
.tag2{background:#DCFCE7;color:#16A34A;}
.tag3{background:#FEF3C7;color:#D97706;}
.bottom{background:#0F172A;border-radius:20px;padding:20px 32px;width:100%;text-align:center;}
.bottom-txt{font-size:20px;color:#94A3B8;}
.bottom-txt strong{color:#FACC15;}
</style></head><body>
  <div class="top">
    <div class="kicker">총무 월간 체크리스트</div>
    <div class="title">매달 빠뜨리면 안 되는<br><em>동호회 운영 3가지</em></div>
  </div>
  <div class="checklist">
    <div class="item">
      <div class="check c1">💰</div>
      <div>
        <div class="item-title">월초에 회비 마감일 공지</div>
        <div class="item-desc">납부 기한을 <strong>매월 7일</strong>로 고정하면<br>독촉 메시지 보낼 일이 확 줄어요.</div>
        <div class="item-tag tag1">콕매니저 → 납부 현황 자동 집계</div>
      </div>
    </div>
    <div class="item">
      <div class="check c2">📅</div>
      <div>
        <div class="item-title">운동 3일 전 참석 마감</div>
        <div class="item-desc">마감 전에 참석 인원 확정해야<br><strong>대진표·코트 예약</strong>이 수월해요.</div>
        <div class="item-tag tag2">콕매니저 → 참석 현황 실시간 확인</div>
      </div>
    </div>
    <div class="item">
      <div class="check c3">👥</div>
      <div>
        <div class="item-title">신규 회원은 링크로 바로 등록</div>
        <div class="item-desc">이름·연락처·급수 직접 받지 말고<br><strong>가입 링크</strong> 하나로 자동 수집하세요.</div>
        <div class="item-tag tag3">콕매니저 → 가입 링크 자동 생성</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">세 가지 전부, <strong>콕매니저</strong>에서 자동으로 관리됩니다 🏸</div>
  </div>
</body></html>` },

// ── 일: 숫자 카드 (월간 총무 업무 시간) ──────────────────────────────────
{ name: "sun_numbers", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#EFF6FF;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:72px 80px;}
.top{text-align:center;}
.kicker{font-size:20px;font-weight:700;color:#0369A1;letter-spacing:3px;margin-bottom:20px;}
.title{font-size:48px;font-weight:900;color:#0F172A;line-height:1.25;}
.title em{color:#0284C7;font-style:normal;}
.stats{display:flex;flex-direction:column;gap:16px;width:100%;}
.row{display:flex;gap:16px;}
.stat{flex:1;background:#FFFFFF;border:1.5px solid #BAE6FD;border-radius:22px;padding:28px 24px;}
.stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.stat-icon{font-size:28px;}
.stat-label{font-size:16px;font-weight:700;color:#0369A1;letter-spacing:1px;}
.stat-num{font-size:58px;font-weight:900;line-height:1;margin-bottom:8px;}
.s1 .stat-num{color:#7C3AED;}
.s2 .stat-num{color:#EA580C;}
.s3 .stat-num{color:#2563EB;}
.s4 .stat-num{color:#059669;}
.stat-desc{font-size:15px;color:#64748B;line-height:1.5;}
.total{background:linear-gradient(135deg,#FACC15,#F59E0B);border-radius:22px;
  padding:28px 36px;width:100%;display:flex;align-items:center;justify-content:space-between;}
.total-left{}
.total-label{font-size:20px;font-weight:700;color:#78350F;margin-bottom:8px;}
.total-num{font-size:80px;font-weight:900;color:#0F172A;line-height:1;letter-spacing:-2px;}
.total-right{text-align:right;}
.total-after{font-size:18px;font-weight:700;color:#92400E;margin-bottom:8px;}
.total-after-num{font-size:60px;font-weight:900;color:#0F172A;line-height:1;}
.divider{font-size:28px;color:#92400E;font-weight:900;}
</style></head><body>
  <div class="top">
    <div class="kicker">NUMBERS</div>
    <div class="title">배드민턴 총무님이<br>한 달에 쓰는 <em>시간</em></div>
  </div>
  <div class="stats">
    <div class="row">
      <div class="stat s1">
        <div class="stat-top">
          <span class="stat-icon">💰</span>
          <span class="stat-label">회비 관리</span>
        </div>
        <div class="stat-num">3h</div>
        <div class="stat-desc">납부 확인·독촉·엑셀 정리</div>
      </div>
      <div class="stat s2">
        <div class="stat-top">
          <span class="stat-icon">📅</span>
          <span class="stat-label">일정·참석</span>
        </div>
        <div class="stat-num">2h</div>
        <div class="stat-desc">공지·취합·인원 정리</div>
      </div>
    </div>
    <div class="row">
      <div class="stat s3">
        <div class="stat-top">
          <span class="stat-icon">🏸</span>
          <span class="stat-label">대진표</span>
        </div>
        <div class="stat-num">2h</div>
        <div class="stat-desc">매 운동마다 수기 작성</div>
      </div>
      <div class="stat s4">
        <div class="stat-top">
          <span class="stat-icon">👥</span>
          <span class="stat-label">회원 관리</span>
        </div>
        <div class="stat-num">1h</div>
        <div class="stat-desc">신규 등록·정보 수정</div>
      </div>
    </div>
    <div class="total">
      <div class="total-left">
        <div class="total-label">총무 월간 소요 시간</div>
        <div class="total-num">8h+</div>
      </div>
      <div class="divider">→</div>
      <div class="total-right">
        <div class="total-after">콕매니저 사용 후</div>
        <div class="total-after-num">1h↓</div>
      </div>
    </div>
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
