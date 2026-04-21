const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/weekly";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slides = [

// ── 화: 공감 밈 ──────────────────────────────────────────────────────────
{ name: "tue_meme", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0;padding:80px;}
.tag{background:rgba(250,204,21,0.15);border:2px solid rgba(250,204,21,0.4);color:#FACC15;
  font-size:22px;font-weight:900;padding:10px 28px;border-radius:999px;letter-spacing:2px;margin-bottom:52px;}
.scene{background:#1E293B;border-radius:32px;width:100%;padding:44px 52px;margin-bottom:40px;}
.chat-label{font-size:20px;color:#64748B;font-weight:700;margin-bottom:24px;letter-spacing:1px;}
.chat{display:flex;flex-direction:column;gap:14px;}
.bubble{display:inline-flex;align-items:center;gap:12px;background:#334155;border-radius:18px;
  padding:16px 24px;align-self:flex-start;max-width:90%;}
.bubble.me{background:#FACC15;align-self:flex-end;}
.name{font-size:17px;color:#94A3B8;font-weight:700;margin-bottom:4px;}
.msg{font-size:22px;color:#F1F5F9;font-weight:600;}
.bubble.me .msg{color:#0F172A;font-weight:900;}
.reaction{font-size:18px;color:#64748B;margin-top:4px;}
.punchline{text-align:center;}
.punch-top{font-size:30px;color:#94A3B8;margin-bottom:16px;}
.punch-big{font-size:62px;font-weight:900;color:#fff;line-height:1.2;}
.punch-big em{color:#FACC15;font-style:normal;}
.punch-sub{font-size:24px;color:#475569;margin-top:20px;}
</style></head><body>
  <div class="tag">총무님 공감 100%</div>
  <div class="scene">
    <div class="chat-label">📱 운동 일정 단톡방</div>
    <div class="chat">
      <div>
        <div class="name">총무</div>
        <div class="bubble"><span class="msg">이번 주 토요일 참석 여부 댓글로 달아주세요!</span></div>
      </div>
      <div style="align-self:flex-end;text-align:right;">
        <div class="name" style="color:#FACC15;">회원 A</div>
        <div class="bubble me"><span class="msg">신청합니다 🙋</span></div>
      </div>
      <div>
        <div class="name">회원 B</div>
        <div class="bubble"><span class="msg">저도요!</span></div>
      </div>
      <div>
        <div class="name">회원 C</div>
        <div class="bubble"><span class="msg">불참이요 ㅠ</span></div>
      </div>
      <div>
        <div class="name">회원 D</div>
        <div class="bubble"><span class="msg">참석합니다</span></div>
      </div>
      <div style="align-self:center;background:#1E293B;border-radius:12px;padding:10px 20px;">
        <span style="font-size:17px;color:#64748B;">💬 댓글 23개 더보기...</span>
      </div>
    </div>
  </div>
  <div class="punchline">
    <div class="punch-top">그래서 총무님은 지금</div>
    <div class="punch-big">하나씩<br><em>직접 세는 중</em> 🫠</div>
    <div class="punch-sub">#배드민턴총무 #배드민턴동호회 #콕매니저</div>
  </div>
</body></html>` },

// ── 수: Before/After ──────────────────────────────────────────────────────
{ name: "wed_before_after", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F8FAFC;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:72px 72px 60px;}
.top{text-align:center;}
.kicker{font-size:22px;font-weight:700;color:#94A3B8;letter-spacing:2px;margin-bottom:16px;}
.title{font-size:58px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#FACC15;font-style:normal;}
.compare{display:flex;gap:24px;width:100%;}
.col{flex:1;border-radius:28px;overflow:hidden;}
.col-label{font-size:20px;font-weight:900;padding:18px 24px;letter-spacing:1px;text-align:center;}
.col.before .col-label{background:#EF4444;color:#fff;}
.col.after .col-label{background:#16A34A;color:#fff;}
.col-body{padding:24px;display:flex;flex-direction:column;gap:12px;}
.col.before .col-body{background:#FFF5F5;border:2px solid #FECACA;border-top:none;border-radius:0 0 28px 28px;}
.col.after .col-body{background:#F0FDF4;border:2px solid #BBF7D0;border-top:none;border-radius:0 0 28px 28px;}
.chat-msg{background:#fff;border-radius:14px;padding:12px 16px;font-size:17px;color:#475569;
  border:1.5px solid #E2E8F0;line-height:1.5;}
.chat-msg.red{border-color:#FECACA;background:#FFF5F5;color:#DC2626;font-weight:700;}
.ui-row{background:#fff;border-radius:14px;padding:14px 18px;display:flex;align-items:center;
  justify-content:space-between;border:1.5px solid #BBF7D0;}
.ui-name{font-size:18px;font-weight:700;color:#0F172A;}
.badge-ok{background:#DCFCE7;color:#16A34A;font-size:15px;font-weight:900;
  padding:5px 14px;border-radius:999px;}
.badge-no{background:#FEE2E2;color:#DC2626;font-size:15px;font-weight:900;
  padding:5px 14px;border-radius:999px;}
.badge-wait{background:#FEF9C3;color:#CA8A04;font-size:15px;font-weight:900;
  padding:5px 14px;border-radius:999px;}
.count-row{background:#0F172A;border-radius:14px;padding:14px 18px;text-align:center;
  font-size:18px;font-weight:900;color:#FACC15;}
.chaos{font-size:42px;text-align:center;margin:8px 0;}
.bottom{text-align:center;}
.bottom-txt{font-size:24px;color:#64748B;}
.bottom-txt strong{color:#0F172A;}
</style></head><body>
  <div class="top">
    <div class="kicker">참석 관리 비교</div>
    <div class="title">이제 이렇게 <em>바뀝니다</em></div>
  </div>
  <div class="compare">
    <div class="col before">
      <div class="col-label">❌ 기존 방식</div>
      <div class="col-body">
        <div class="chat-msg">신청합니다 🙋</div>
        <div class="chat-msg">저도요!</div>
        <div class="chat-msg">불참이요 ㅠ</div>
        <div class="chat-msg">저도 참석!</div>
        <div class="chat-msg">다음엔 갈게요~</div>
        <div class="chat-msg">저도요 저도요</div>
        <div class="chat-msg red">💬 댓글 28개... 🫠</div>
        <div class="chaos">😩</div>
      </div>
    </div>
    <div class="col after">
      <div class="col-label">✅ 콕매니저</div>
      <div class="col-body">
        <div class="ui-row"><span class="ui-name">김민준</span><span class="badge-ok">참석</span></div>
        <div class="ui-row"><span class="ui-name">이서연</span><span class="badge-ok">참석</span></div>
        <div class="ui-row"><span class="ui-name">박지훈</span><span class="badge-no">불참</span></div>
        <div class="ui-row"><span class="ui-name">최수아</span><span class="badge-wait">대기</span></div>
        <div class="ui-row"><span class="ui-name">정현우</span><span class="badge-ok">참석</span></div>
        <div class="count-row">참석 12 · 불참 3 · 대기 2</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt"><strong>콕매니저</strong>는 회원이 직접 신청 → 자동 집계</div>
  </div>
</body></html>` },

// ── 금: 꿀팁 정보성 ──────────────────────────────────────────────────────
{ name: "fri_tips", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#FEF9EE;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:72px 80px;}
.top{text-align:center;}
.kicker{font-size:22px;font-weight:700;color:#D97706;letter-spacing:2px;margin-bottom:16px;
  background:#FDE68A;padding:8px 24px;border-radius:999px;display:inline-block;}
.title{font-size:56px;font-weight:900;color:#0F172A;margin-top:16px;line-height:1.2;}
.title em{color:#D97706;font-style:normal;}
.tips{display:flex;flex-direction:column;gap:20px;width:100%;}
.tip{background:#fff;border-radius:24px;padding:32px 36px;display:flex;gap:24px;align-items:flex-start;
  box-shadow:0 4px 20px rgba(0,0,0,0.06);}
.tip-num{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;
  justify-content:center;font-size:26px;font-weight:900;color:#fff;flex-shrink:0;}
.n1{background:#FACC15;color:#0F172A;}
.n2{background:#FB923C;}
.n3{background:#34D399;}
.tip-content{}
.tip-title{font-size:26px;font-weight:900;color:#0F172A;margin-bottom:8px;}
.tip-desc{font-size:19px;color:#64748B;line-height:1.6;}
.tip-desc strong{color:#0F172A;font-weight:700;}
.bottom{text-align:center;background:#0F172A;border-radius:24px;padding:24px 40px;width:100%;}
.bottom-txt{font-size:22px;color:#94A3B8;}
.bottom-txt strong{color:#FACC15;}
</style></head><body>
  <div class="top">
    <div class="kicker">총무 꿀팁</div>
    <div class="title">클럽 운영 편해지는<br><em>꿀팁 3가지</em></div>
  </div>
  <div class="tips">
    <div class="tip">
      <div class="tip-num n1">1</div>
      <div class="tip-content">
        <div class="tip-title">참석 마감 시간을 공지에 못박아라</div>
        <div class="tip-desc">운동 <strong>3일 전 자정 마감</strong>으로 고정하면<br>당일 취소·추가 요청이 확 줄어요.</div>
      </div>
    </div>
    <div class="tip">
      <div class="tip-num n2">2</div>
      <div class="tip-content">
        <div class="tip-title">회비는 월 첫째 주에 일괄 정리</div>
        <div class="tip-desc">납부 기한을 <strong>매월 1~7일</strong>로 통일하면<br>독촉 메시지 보낼 일이 없어져요.</div>
      </div>
    </div>
    <div class="tip">
      <div class="tip-num n3">3</div>
      <div class="tip-content">
        <div class="tip-title">신규 회원 등록은 링크 하나로</div>
        <div class="tip-desc">이름·연락처·급수 직접 받지 말고<br><strong>가입 링크</strong> 공유하면 총무 손 안 가요.</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">이 세 가지, <strong>콕매니저</strong>에서는 전부 자동입니다 🏸</div>
  </div>
</body></html>` },

// ── 일: 숫자 카드 ────────────────────────────────────────────────────────
{ name: "sun_numbers", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:80px 80px 72px;}
.top{text-align:center;}
.kicker{font-size:22px;font-weight:700;color:#64748B;letter-spacing:3px;margin-bottom:20px;}
.title{font-size:52px;font-weight:900;color:#fff;line-height:1.25;}
.title em{color:#FACC15;font-style:normal;}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;}
.card{border-radius:28px;padding:36px 32px;display:flex;flex-direction:column;gap:12px;}
.c1{background:linear-gradient(135deg,#1E293B,#0F172A);border:2px solid #334155;}
.c2{background:linear-gradient(135deg,#422006,#1C0A00);border:2px solid #92400E;}
.c3{background:linear-gradient(135deg,#052E16,#0F172A);border:2px solid #166534;}
.c4{background:linear-gradient(135deg,#FACC15,#F59E0B);border:2px solid #D97706;}
.card-num{font-size:72px;font-weight:900;line-height:1;}
.c1 .card-num{color:#FACC15;}
.c2 .card-num{color:#F97316;}
.c3 .card-num{color:#34D399;}
.c4 .card-num{color:#0F172A;}
.card-label{font-size:20px;font-weight:700;line-height:1.4;}
.c1 .card-label,.c2 .card-label,.c3 .card-label{color:#94A3B8;}
.c4 .card-label{color:#0F172A;}
.card-sub{font-size:16px;line-height:1.5;}
.c1 .card-sub,.c2 .card-sub,.c3 .card-sub{color:#475569;}
.c4 .card-sub{color:#78350F;font-weight:700;}
.bottom{text-align:center;}
.bottom-txt{font-size:26px;font-weight:700;color:#94A3B8;}
.bottom-txt strong{color:#FACC15;}
</style></head><body>
  <div class="top">
    <div class="kicker">NUMBERS</div>
    <div class="title">배드민턴 총무님이<br>매달 쓰는 <em>시간</em></div>
  </div>
  <div class="cards">
    <div class="card c1">
      <div class="card-num">3h+</div>
      <div class="card-label">참석 취합·정리</div>
      <div class="card-sub">단톡방 댓글 하나씩 세는 시간</div>
    </div>
    <div class="card c2">
      <div class="card-num">2h+</div>
      <div class="card-label">회비 정리</div>
      <div class="card-sub">엑셀 열어서 납부자 체크하는 시간</div>
    </div>
    <div class="card c3">
      <div class="card-num">1h+</div>
      <div class="card-label">대진표 짜기</div>
      <div class="card-sub">급수·성별 맞춰 손으로 짜는 시간</div>
    </div>
    <div class="card c4">
      <div class="card-num">0분</div>
      <div class="card-label">콕매니저 사용 후</div>
      <div class="card-sub">전부 자동으로 처리됩니다</div>
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
