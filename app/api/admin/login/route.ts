import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username: String(username).trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "존재하지 않는 계정입니다." },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isMatch) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const token = await createToken({
      adminId: admin.id,
      clubId: admin.clubId,
      role: admin.role,
    });

    const response = NextResponse.json({
      message: "로그인되었습니다.",
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
