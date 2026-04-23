import https from "node:https";

// ─── 타입 정의 ──────────────────────────────────────────────────────────────

type TelegramNewClubAlertInput = {
  clubName: string;
};

export type TelegramAlertInput =
  | { event: "MEMBER_REQUEST_APPLY"; clubName: string; name: string; gender: string; level: string }
  | { event: "MEMBER_REQUEST_APPROVE"; clubName: string; name: string }
  | { event: "MEMBER_REQUEST_REJECT"; clubName: string; name: string }
  | { event: "MEMBER_DIRECT_CREATE"; clubName: string; name: string }
  | { event: "SESSION_CREATE"; clubName: string; title: string; date: string }
  | { event: "SESSION_RESPOND_REGISTER"; clubName: string; sessionTitle: string; memberName: string; guestCount: number; status: string }
  | { event: "SESSION_RESPOND_CANCEL"; clubName: string; sessionTitle: string; memberName: string }
  | { event: "SESSION_BRACKET_CREATE"; clubName: string; sessionTitle: string }
  | { event: "SUPPORT_INQUIRY"; clubName: string; adminEmail: string; category: string; preview: string };

// ─── Config ─────────────────────────────────────────────────────────────────

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    console.warn("[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return null;
  }

  return { botToken, chatId };
}

// ─── 메시지 빌더 ─────────────────────────────────────────────────────────────

function buildNewClubAlertMessage({ clubName }: TelegramNewClubAlertInput) {
  return ["콕매니저🏸 새 클럽 생성", `클럽: ${clubName}`].join("\n");
}

function buildAlertMessage(input: TelegramAlertInput): string {
  switch (input.event) {
    case "MEMBER_REQUEST_APPLY":
      return [
        "🙋 가입 신청",
        `클럽: ${input.clubName}`,
        `신청자: ${input.name} (${input.gender} / ${input.level})`,
      ].join("\n");

    case "MEMBER_REQUEST_APPROVE":
      return [
        "✅ 가입 승인",
        `클럽: ${input.clubName}`,
        `회원: ${input.name}`,
      ].join("\n");

    case "MEMBER_REQUEST_REJECT":
      return [
        "❌ 가입 거절",
        `클럽: ${input.clubName}`,
        `신청자: ${input.name}`,
      ].join("\n");

    case "MEMBER_DIRECT_CREATE":
      return [
        "👤 회원 직접 등록",
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
        "🚫 참석 취소",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
        `회원: ${input.memberName}`,
      ].join("\n");

    case "SESSION_BRACKET_CREATE":
      return [
        "🔀 대진표 생성",
        `클럽: ${input.clubName}`,
        `일정: ${input.sessionTitle}`,
      ].join("\n");

    case "SUPPORT_INQUIRY":
      return [
        "📩 고객 문의",
        `클럽: ${input.clubName}`,
        `이메일: ${input.adminEmail}`,
        `유형: ${input.category}`,
        `내용: ${input.preview}`,
      ].join("\n");
  }
}

// ─── 전송 함수 ───────────────────────────────────────────────────────────────

async function sendMessage(text: string) {
  const config = getTelegramConfig();
  if (!config) return;

  const payload = new URLSearchParams({ chat_id: config.chatId, text });

  const response = await postTelegramForm(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    payload.toString()
  );

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`텔레그램 알림 전송 실패. ${response.statusCode} ${response.body}`);
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
    // 알림 실패가 본 요청에 영향 주지 않도록 에러 삼킴
    console.error("[telegram] failed", input.event, error);
  }
}

// ─── HTTP 헬퍼 ───────────────────────────────────────────────────────────────

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
        response.on("data", (chunk) => { responseBody += chunk; });
        response.on("end", () => {
          resolve({ statusCode: response.statusCode ?? 0, body: responseBody });
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
