import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { sendTelegramNewClubAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clubName, username, email, password, confirmPassword } =
      body;
    console.log("[signup] New club signup requested", {
      clubName: String(clubName ?? "").trim(),
      username: String(username ?? "").trim(),
      email: String(email ?? "").trim().toLowerCase(),
    });

    if (
      !clubName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "클럽/소모임 이름, 관리자 아이디, 관리자 이메일, 비밀번호, 비밀번호 확인을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (String(password) !== String(confirmPassword)) {
      return NextResponse.json(
        { error: "비밀번호 확인이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "비밀번호는 6자 이상으로 입력해주세요." },
        { status: 400 }
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: String(username).trim() },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 아이디입니다." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.admin.findFirst({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 이메일입니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: String(clubName).trim(),
        },
      });

      await tx.admin.create({
        data: {
          username: String(username).trim(),
          email: String(email).trim().toLowerCase(),
          password: hashedPassword,
          clubId: club.id,
          role: "SUPER_ADMIN",
        },
      });

      return club;
    });

    console.log("[signup] Club created successfully", {
      clubId: result.id,
      clubName: result.name,
    });

    try {
      await sendTelegramNewClubAlert({
        clubName: result.name,
      });
    } catch (telegramError) {
      console.error(
        "Telegram new club alert failed",
        telegramError
      );
    }

    return NextResponse.json({
      message: "클럽/소모임이 생성되었습니다.",
      clubId: result.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
