import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import {
  formatPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const requestId = Number(id);

    const memberRequest = await prisma.memberRequest.findFirst({
      where: {
        id: requestId,
        clubId: admin.clubId,
      },
    });

    if (!memberRequest) {
      return notFoundResponse("가입 신청을 찾을 수 없습니다.");
    }

    if (memberRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 처리된 가입 신청입니다." },
        { status: 400 }
      );
    }

    const normalizedPhone = formatPhoneNumber(memberRequest.phone);

    const duplicateMemberCandidates = await prisma.member.findMany({
      where: {
        clubId: memberRequest.clubId,
        name: memberRequest.name,
        deleted: false,
      },
      select: {
        id: true,
        phone: true,
      },
    });

    const duplicateMember =
      duplicateMemberCandidates.find(
        (member) =>
          normalizePhoneNumber(member.phone) ===
          normalizePhoneNumber(normalizedPhone)
      ) ?? null;

    if (duplicateMember) {
      return NextResponse.json(
        {
          error:
            "이미 동일한 이름과 연락처로 등록된 회원이 있습니다.",
        },
        { status: 409 }
      );
    }

    const specialFeeIds = await prisma.specialFee.findMany({
      where: { clubId: memberRequest.clubId },
      select: { id: true },
    });

    const createdMember = await prisma.$transaction(async (tx) => {
      const nextMember = await tx.member.create({
        data: {
          name: memberRequest.name,
          gender: memberRequest.gender,
          birth: memberRequest.birth,
          phone: normalizedPhone,
          level: memberRequest.level,
          customFieldValue: memberRequest.customFieldValue,
          note: memberRequest.note,
          clubId: memberRequest.clubId,
          status: "approved",
        },
      });

      if (specialFeeIds.length > 0) {
        await tx.specialFeePayment.createMany({
          data: specialFeeIds.map((specialFee) => ({
            specialFeeId: specialFee.id,
            memberId: nextMember.id,
          })),
        });
      }

      await tx.memberRequest.update({
        where: { id: memberRequest.id },
        data: {
          status: "APPROVED",
          processedAt: new Date(),
        },
      });

      return nextMember;
    });

    return NextResponse.json({
      success: true,
      member: createdMember,
      requestId: memberRequest.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 승인 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
