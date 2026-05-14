import https from "node:https";

type TelegramNewClubAlertInput = {
  clubName: string;
};

type BracketGenerationMode = "STANDARD" | "TEAM_BATTLE";

export type TelegramAlertInput =
  | {
      event: "ACCOUNT_DELETE";
      clubName: string;
      adminUsername: string;
      adminEmail: string;
    }
  | {
      event: "MEMBER_REQUEST_APPLY";
      clubName: string;
      name: string;
      gender: string;
      level: string;
    }
  | { event: "MEMBER_REQUEST_APPROVE"; clubName: string; name: string }
  | { event: "MEMBER_REQUEST_REJECT"; clubName: string; name: string }
  | { event: "MEMBER_DIRECT_CREATE"; clubName: string; name: string }
  | { event: "MEMBER_UPDATE"; clubName: string; name: string }
  | { event: "MEMBER_DELETE"; clubName: string; name: string }
  | { event: "SESSION_CREATE"; clubName: string; title: string; date: string }
  | {
      event: "SESSION_UPDATE";
      clubName: string;
      title: string;
      date: string;
      changes: { field: string; before: string; after: string }[];
    }
  | { event: "SESSION_DELETE"; clubName: string; title: string; date: string }
  | {
      event: "SESSION_RESPOND_REGISTER";
      clubName: string;
      sessionTitle: string;
      memberName: string;
      guestCount: number;
      status: string;
    }
  | {
      event: "SESSION_RESPOND_CANCEL";
      clubName: string;
      sessionTitle: string;
      memberName: string;
    }
  | {
      event: "SESSION_BRACKET_CREATE";
      clubName: string;
      sessionTitle: string;
      generationMode: BracketGenerationMode;
    }
  | {
      event: "SUPPORT_INQUIRY";
      clubName: string;
      adminEmail: string;
      category: string;
      message: string;
    }
  | { event: "ADMIN_MEMBERS_TAB_CLICK"; clubName: string }
  | { event: "ADMIN_FEES_TAB_CLICK"; clubName: string }
  | {
      event: "SESSION_ADMIN_REGISTER";
      clubName: string;
      sessionTitle: string;
      participantName: string;
      participantType: "member" | "guest";
      status: string;
    }
  | {
      event: "MONTHLY_FEE_TOGGLE";
      clubName: string;
      memberName: string;
      year: number;
      month: number;
      paid: boolean;
    }
  | {
      event: "YEARLY_FEE_TOGGLE";
      clubName: string;
      memberName: string;
      year: number;
      paid: boolean;
    }
  | {
      event: "SPECIAL_FEE_CREATE";
      clubName: string;
      feeTitle: string;
      amount: number;
    }
  | {
      event: "SPECIAL_FEE_DELETE";
      clubName: string;
      feeTitle: string;
      amount: number;
    }
  | {
      event: "SPECIAL_FEE_TOGGLE";
      clubName: string;
      memberName: string;
      feeTitle: string;
      paid: boolean;
    }
  | {
      event: "SESSION_BRACKET_SWAP";
      clubName: string;
      sessionTitle: string;
      roundNumber: number;
      fromCourtNumber: number;
      toCourtNumber: number;
      fromPlayerName: string;
      toPlayerName: string;
    }
  | {
      event: "SESSION_BRACKET_EXPORT";
      clubName: string;
      sessionTitle: string;
      imageCount: number;
    }
  | {
      event: "LEDGER_MANUAL_INCOME_CREATE";
      clubName: string;
      title: string;
      category: string;
      amount: number;
      memberName?: string | null;
    }
  | {
      event: "LEDGER_MANUAL_EXPENSE_CREATE";
      clubName: string;
      title: string;
      category: string;
      amount: number;
      memberName?: string | null;
    }
  | { event: "LEDGER_RESET"; clubName: string }
  | {
      event: "COURT_BOARD_START";
      clubName: string;
      sessionTitle: string;
      courtCount: number;
    }
  | {
      event: "COURT_BOARD_COURT_ASSIGNED";
      clubName: string;
      sessionTitle: string;
      courtNumber: number;
      teamA: string[];
      teamB: string[];
    }
  | {
      event: "COURT_BOARD_MATCH_COMPLETE";
      clubName: string;
      sessionTitle: string;
      courtNumber: number;
      teamA: string[];
      teamB: string[];
      winner: "A" | "B" | null;
    };

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    console.warn("[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return null;
  }

  return { botToken, chatId };
}

function formatWon(amount: number) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

function getBracketModeLabel(mode: BracketGenerationMode) {
  return mode === "TEAM_BATTLE" ? "팀대항 자동대진" : "일반 자동대진";
}

function buildNewClubAlertMessage({ clubName }: TelegramNewClubAlertInput) {
  return ["🎉 콕매니저 새 클럽 생성", `클럽: ${clubName}`].join("\n");
}

function buildAlertMessage(input: TelegramAlertInput): string {
  switch (input.event) {
    case "ACCOUNT_DELETE":
      return [
        "🗑️ 클럽 계정 삭제",
        `클럽: ${input.clubName}`,
        `관리자 아이디: ${input.adminUsername}`,
        `관리자 이메일: ${input.adminEmail || "-"}`,
      ].join("\n");

    case "MEMBER_REQUEST_APPLY":
      return [
        "🙋 새 가입 신청",
        `클럽: ${input.clubName}`,
        `신청자: ${input.name} (${input.gender} / ${input.level})`,
      ].join("\n");

    case "MEMBER_REQUEST_APPROVE":
      return [
        "✅ 가입 신청 승인",
        `클럽: ${input.clubName}`,
        `회원: ${input.name}`,
      ].join("\n");

    case "MEMBER_REQUEST_REJECT":
      return [
        "🚫 가입 신청 거절",
        `클럽: ${input.clubName}`,
        `신청자: ${input.name}`,
      ].join("\n");

    case "MEMBER_DIRECT_CREATE":
      return [
        "👤 회원 직접 등록",
        `클럽: ${input.clubName}`,
        `회원: ${input.name}`,
      ].join("\n");

    case "MEMBER_UPDATE":
      return [
        "✏️ 회원 정보 수정",
        `클럽: ${input.clubName}`,
        `회원: ${input.name}`,
      ].join("\n");

    case "MEMBER_DELETE":
      return [
        "🗑️ 회원 삭제",
        `클럽: ${input.clubName}`,
        `회원: ${input.name}`,
      ].join("\n");

    case "SESSION_CREATE":
      return [
        "📅 운동 일정 등록",
        `클럽: ${input.clubName}`,
        `일정: ${input.title}`,
        `날짜: ${input.date}`,
      ].join("\n");

    case "SESSION_UPDATE": {
      const changeLines = input.changes.map(
        (c) => `  • ${c.field}: ${c.before} → ${c.after}`
      );
      return [
        "🛠️ 운동 일정 수정",
        `클럽: ${input.clubName}`,
        `일정: ${input.title}`,
        `날짜: ${input.date}`,
        ...(changeLines.length > 0
          ? ["", "변경 내역:", ...changeLines]
          : ["", "(변경 내역 없음)"]),
      ].join("\n");
    }

    case "SESSION_DELETE":
      return [
        "🗑️ 운동 일정 삭제",
        `클럽: ${input.clubName}`,
        `일정: ${input.title}`,
        `날짜: ${input.date}`,
      ].join("\n");

    case "SESSION_RESPOND_REGISTER": {
      const statusLabel =
        input.status === "WAITLIST" ? "대기 등록" : "참석 신청";
      const guestSuffix =
        input.guestCount > 0 ? ` (+게스트 ${input.guestCount}명)` : "";

      return [
        `🏸 ${statusLabel}`,
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `회원: ${input.memberName}${guestSuffix}`,
      ].join("\n");
    }

    case "SESSION_RESPOND_CANCEL":
      return [
        "❌ 참석 취소",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `회원: ${input.memberName}`,
      ].join("\n");

    case "SESSION_BRACKET_CREATE":
      return [
        "🏸 자동 대진 생성",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `유형: ${getBracketModeLabel(input.generationMode)}`,
      ].join("\n");

    case "SUPPORT_INQUIRY":
      return [
        "📩 고객 문의",
        `클럽: ${input.clubName}`,
        `이메일: ${input.adminEmail}`,
        `유형: ${input.category}`,
        "----------------------",
        input.message,
      ].join("\n");

    case "ADMIN_MEMBERS_TAB_CLICK":
      return [
        "🖱️ 관리자 클릭",
        `클럽: ${input.clubName}`,
        "화면: 회원 탭",
      ].join("\n");

    case "ADMIN_FEES_TAB_CLICK":
      return [
        "🖱️ 관리자 클릭",
        `클럽: ${input.clubName}`,
        "화면: 회비 탭",
      ].join("\n");

    case "SESSION_ADMIN_REGISTER": {
      const statusLabel = input.status === "WAITLIST" ? "대기 등록" : "참석 등록";
      const typeLabel = input.participantType === "guest" ? "게스트" : "회원";

      return [
        "📝 관리자 직접 참석 등록",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `구분: ${typeLabel}`,
        `이름: ${input.participantName}`,
        `상태: ${statusLabel}`,
      ].join("\n");
    }

    case "MONTHLY_FEE_TOGGLE":
      return [
        "💸 월회비 체크 변경",
        `클럽: ${input.clubName}`,
        `회원: ${input.memberName}`,
        `대상: ${input.year}년 ${input.month}월`,
        `상태: ${input.paid ? "납부" : "미납"}`,
      ].join("\n");

    case "YEARLY_FEE_TOGGLE":
      return [
        "📆 연회비 체크 변경",
        `클럽: ${input.clubName}`,
        `회원: ${input.memberName}`,
        `대상: ${input.year}년`,
        `상태: ${input.paid ? "전체 납부" : "전체 미납"}`,
      ].join("\n");

    case "SPECIAL_FEE_CREATE":
      return [
        "🧾 수시회비 생성",
        `클럽: ${input.clubName}`,
        `회비: ${input.feeTitle}`,
        `금액: ${formatWon(input.amount)}`,
      ].join("\n");

    case "SPECIAL_FEE_DELETE":
      return [
        "🗑️ 수시회비 삭제",
        `클럽: ${input.clubName}`,
        `회비: ${input.feeTitle}`,
        `금액: ${formatWon(input.amount)}`,
      ].join("\n");

    case "SPECIAL_FEE_TOGGLE":
      return [
        "🧾 수시회비 체크 변경",
        `클럽: ${input.clubName}`,
        `회원: ${input.memberName}`,
        `회비: ${input.feeTitle}`,
        `상태: ${input.paid ? "납부" : "미납"}`,
      ].join("\n");

    case "SESSION_BRACKET_SWAP":
      return [
        "🔁 자동대진 선수 수정",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `라운드: ${input.roundNumber}`,
        `변경: ${input.fromPlayerName} ↔ ${input.toPlayerName}`,
        `코트: ${input.fromCourtNumber}번 ↔ ${input.toCourtNumber}번`,
      ].join("\n");

    case "SESSION_BRACKET_EXPORT":
      return [
        "🖼️ 자동대진 이미지 저장",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `저장 이미지: ${input.imageCount}장`,
      ].join("\n");

    case "LEDGER_MANUAL_INCOME_CREATE":
      return [
        "💰 장부 수동 입금 등록",
        `클럽: ${input.clubName}`,
        `항목: ${input.title}`,
        `분류: ${input.category}`,
        `금액: ${formatWon(input.amount)}`,
        ...(input.memberName ? [`회원: ${input.memberName}`] : []),
      ].join("\n");

    case "LEDGER_MANUAL_EXPENSE_CREATE":
      return [
        "💳 장부 수동 지출 등록",
        `클럽: ${input.clubName}`,
        `항목: ${input.title}`,
        `분류: ${input.category}`,
        `금액: ${formatWon(input.amount)}`,
        ...(input.memberName ? [`회원: ${input.memberName}`] : []),
      ].join("\n");

    case "LEDGER_RESET":
      return ["♻️ 장부 초기화", `클럽: ${input.clubName}`].join("\n");

    case "COURT_BOARD_START":
      return [
        "🎯 실시간 대진 시작",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `코트 수: ${input.courtCount}코트`,
      ].join("\n");

    case "COURT_BOARD_COURT_ASSIGNED":
      return [
        "📋 코트 배정 완료",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `코트 ${input.courtNumber}번`,
        `A팀: ${input.teamA.join(", ")}`,
        `B팀: ${input.teamB.join(", ")}`,
      ].join("\n");

    case "COURT_BOARD_MATCH_COMPLETE": {
      const winnerLabel =
        input.winner === "A" ? "A팀 승" :
        input.winner === "B" ? "B팀 승" : "결과 없음";
      return [
        "🏆 경기 완료",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `코트 ${input.courtNumber}번`,
        `A팀: ${input.teamA.join(", ")}`,
        `B팀: ${input.teamB.join(", ")}`,
        `결과: ${winnerLabel}`,
      ].join("\n");
    }
  }
}

async function sendMessage(text: string) {
  const config = getTelegramConfig();
  if (!config) return;

  const payload = new URLSearchParams({ chat_id: config.chatId, text });
  const response = await postTelegramForm(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    payload.toString()
  );

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `텔레그램 알림 전송 실패. ${response.statusCode} ${response.body}`
    );
  }
}

export async function sendTelegramNewClubAlert(input: TelegramNewClubAlertInput) {
  const config = getTelegramConfig();
  if (!config) return;

  console.log("[telegram] new club alert", input);
  await sendMessage(buildNewClubAlertMessage(input));
  console.log("[telegram] sent");
}

export async function sendTelegramAlert(input: TelegramAlertInput) {
  const config = getTelegramConfig();
  if (!config) return;

  console.log("[telegram] alert", input.event);
  try {
    await sendMessage(buildAlertMessage(input));
    console.log("[telegram] sent", input.event);
  } catch (error) {
    console.error("[telegram] failed", input.event, error);
  }
}

function postTelegramForm(url: string, body: string) {
  return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "POST",
        family: 4,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: responseBody,
          });
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(10_000, () => {
      request.destroy(new Error("텔레그램 전송 요청이 시간 초과되었습니다."));
    });
    request.write(body);
    request.end();
  });
}
