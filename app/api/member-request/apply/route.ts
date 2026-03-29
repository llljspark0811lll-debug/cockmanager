import { formatPhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const joinToken = String(body.joinToken ?? "").trim();
    const name = String(body.name ?? "").trim();
    const gender = String(body.gender ?? "").trim();
    const level = String(body.level ?? "").trim();
    const phone = formatPhoneNumber(body.phone);
    const customFieldValue = String(
      body.customFieldValue ?? ""
    ).trim();
    const note = String(body.note ?? "").trim();

    if (!joinToken) {
      return NextResponse.json(
        { error: "가입 링크 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!name || !gender || !phone || !level) {
      return NextResponse.json(
        { error: "필수 정보를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const club = await prisma.club.findUnique({
      where: {
        publicJoinToken: joinToken,
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "가입할 클럽을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const [existingPendingRequest, existingMember] =
      await Promise.all([
        prisma.memberRequest.findFirst({
          where: {
            clubId: club.id,
            name,
            phone,
            status: "PENDING",
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.member.findFirst({
          where: {
            clubId: club.id,
            name,
            phone,
            deleted: false,
          },
        }),
      ]);

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error:
            "같은 이름과 연락처로 이미 가입 신청이 접수되어 있어요. 운영진 승인 후 다시 확인해주세요.",
        },
        { status: 409 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        {
          error:
            "이미 등록된 회원입니다. 중복 가입 신청이 필요하면 운영진에게 문의해주세요.",
        },
        { status: 409 }
      );
    }

    await prisma.memberRequest.create({
      data: {
        name,
        gender,
        birth: body.birth ? new Date(body.birth) : null,
        phone,
        level,
        customFieldValue,
        note,
        clubId: club.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 신청 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
