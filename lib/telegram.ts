import https from "node:https";

type TelegramNewClubAlertInput = {
  clubName: string;
};

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    console.warn(
      "[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID"
    );
    return null;
  }

  return { botToken, chatId };
}

function buildNewClubAlertMessage({
  clubName,
}: TelegramNewClubAlertInput) {
  return [
    "콕매니저🏸 새 클럽 생성",
    `클럽: ${clubName}`,
  ].join("\n");
}

export async function sendTelegramNewClubAlert(
  input: TelegramNewClubAlertInput
) {
  const config = getTelegramConfig();

  if (!config) {
    return;
  }

  const payload = new URLSearchParams({
    chat_id: config.chatId,
    text: buildNewClubAlertMessage(input),
  });

  console.log("[telegram] Sending new club alert", {
    clubName: input.clubName,
    chatId: config.chatId,
  });

  const response = await postTelegramForm(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    payload.toString()
  );

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `텔레그램 알림 전송에 실패했습니다. ${response.statusCode} ${response.body}`
    );
  }

  console.log("[telegram] New club alert sent successfully", {
    clubName: input.clubName,
    chatId: config.chatId,
  });
}

function postTelegramForm(url: string, body: string) {
  return new Promise<{ statusCode: number; body: string }>(
    (resolve, reject) => {
      const request = https.request(
        url,
        {
          method: "POST",
          family: 4,
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded; charset=UTF-8",
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

      request.on("error", (error) => {
        reject(error);
      });

      request.setTimeout(10_000, () => {
        request.destroy(new Error("텔레그램 전송 요청이 시간 초과되었습니다."));
      });

      request.write(body);
      request.end();
    }
  );
}
