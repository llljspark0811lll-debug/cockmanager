import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { createToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramNewClubAlert } from "@/lib/telegram";

const ADMIN_USERNAME_REGEX = /^[A-Za-z0-9]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clubName, username, email, password, confirmPassword } = body;
    const trimmedClubName = String(clubName ?? "").trim();
    const trimmedUsername = String(username ?? "").trim();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    console.log("[signup] New club signup requested", {
      clubName: trimmedClubName,
      username: trimmedUsername,
      email: normalizedEmail,
    });

    if (
      !trimmedClubName ||
      !trimmedUsername ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "클럽/소모임 이름, 관리자 아이디, 관리자 이메일, 비밀번호, 비밀번호 확인을 입력해 주세요.",
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
        { error: "비밀번호는 6자 이상으로 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!ADMIN_USERNAME_REGEX.test(trimmedUsername)) {
      return NextResponse.json(
        {
          error: "관리자 아이디는 영문과 숫자만 사용할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 아이디입니다." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.admin.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 관리자 이메일입니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: trimmedClubName,
        },
      });

      const admin = await tx.admin.create({
        data: {
          username: trimmedUsername,
          email: normalizedEmail,
          password: hashedPassword,
          clubId: club.id,
          role: "SUPER_ADMIN",
        },
      });

      return { club, admin };
    });

    console.log("[signup] Club created successfully", {
      clubId: result.club.id,
      clubName: result.club.name,
    });

    try {
      await sendTelegramNewClubAlert({
        clubName: result.club.name,
      });
    } catch (telegramError) {
      console.error("Telegram new club alert failed", telegramError);
    }

    const token = await createToken({
      adminId: result.admin.id,
      clubId: result.admin.clubId,
      role: result.admin.role,
    });

    const response = NextResponse.json({
      message: "클럽/소모임이 생성되었습니다.",
      clubId: result.club.id,
    });

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
