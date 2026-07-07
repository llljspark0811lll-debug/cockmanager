import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USERNAME_REGEX = /^[a-z0-9]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = String(searchParams.get("username") ?? "").trim().toLowerCase();

  if (!username) {
    return NextResponse.json(
      { available: false, error: "관리자 아이디를 입력해주세요." },
      { status: 400 }
    );
  }

  if (!ADMIN_USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { available: false, error: "관리자 아이디는 영문 소문자와 숫자만 사용할 수 있습니다." },
      { status: 400 }
    );
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({
    available: !existingAdmin,
    username,
  });
}
