import { requireAuthAdmin, unauthorizedResponse } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

const CATEGORIES = ["사용방법 문의", "기능 추가 요구", "버그 제보", "기타"] as const;

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const category = String(body.category ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "문의 유형을 선택해주세요." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "문의 내용을 입력해주세요." }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "문의 내용은 2000자 이하로 입력해주세요." }, { status: 400 });
    }

    const supportTo = process.env.SUPPORT_EMAIL;
    if (!supportTo) {
      return NextResponse.json({ error: "지원 이메일이 설정되지 않았습니다." }, { status: 500 });
    }

    const [club, adminRecord] = await Promise.all([
      prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } }),
      prisma.admin.findUnique({ where: { id: admin.adminId }, select: { email: true } }),
    ]);

    const clubName = club?.name ?? String(admin.clubId);
    const adminEmail = adminRecord?.email ?? "";

    const subject = `[콕매니저 문의] ${category} — ${clubName}`;

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f172a;padding:24px 32px;">
      <p style="margin:0;color:#7dd3fc;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">콕매니저🏸</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:900;">고객 문의 접수</h1>
    </div>

    <div style="padding:28px 32px 8px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748b;font-weight:600;width:90px;">클럽</td>
          <td style="padding:10px 0;color:#0f172a;font-weight:700;">${clubName}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;color:#64748b;font-weight:600;">이메일</td>
          <td style="padding:10px 0;color:#0f172a;">${adminEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-weight:600;">문의 유형</td>
          <td style="padding:10px 0;">
            <span style="background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">${category}</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:8px 32px 32px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#475569;">문의 내용</p>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;font-size:14px;color:#1e293b;line-height:1.7;white-space:pre-wrap;border:1px solid #e2e8f0;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">이 메일에 답장하면 <strong>${adminEmail}</strong> 으로 전달됩니다.</p>
    </div>
  </div>
</body>
</html>`;

    const text = [
      `[콕매니저 문의] ${category}`,
      `클럽: ${clubName}`,
      `이메일: ${adminEmail}`,
      ``,
      message,
    ].join("\n");

    await sendEmail({
      to: supportTo,
      subject,
      html,
      text,
      replyTo: adminEmail,
    });

    void sendTelegramAlert({
      event: "SUPPORT_INQUIRY",
      clubName,
      adminEmail,
      category,
      preview: message.slice(0, 80) + (message.length > 80 ? "…" : ""),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[support]", message);
    return NextResponse.json({ error: `문의 전송에 실패했습니다. (${message})` }, { status: 500 });
  }
}
