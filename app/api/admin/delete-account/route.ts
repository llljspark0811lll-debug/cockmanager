import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin, clearAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { password, confirm } = body;

  if (confirm !== "탈퇴") {
    return NextResponse.json({ error: "확인 문자가 올바르지 않습니다." }, { status: 400 });
  }

  const adminRecord = await prisma.admin.findUnique({
    where: { id: admin.adminId },
    select: { password: true, clubId: true },
  });
  if (!adminRecord) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(password, adminRecord.password);
  if (!isMatch) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  // Club 삭제 시 Admin, Member, Session 등 cascade 삭제
  await prisma.club.delete({ where: { id: adminRecord.clubId } });

  const response = NextResponse.json({ success: true });
  clearAuthCookie(response);
  return response;
}
