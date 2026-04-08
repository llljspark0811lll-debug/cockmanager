import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { findDuplicateActiveMember } from "@/lib/member-identity";
import { formatPhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const pendingRequests = await prisma.memberRequest.findMany({
      where: {
        clubId: admin.clubId,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        approvedCount: 0,
      });
    }

    const seenIdentityKeys = new Set<string>();

    for (const memberRequest of pendingRequests) {
      const normalizedPhone = formatPhoneNumber(memberRequest.phone);
      const identityKey = `${memberRequest.name.trim()}::${normalizedPhone}`;

      if (seenIdentityKeys.has(identityKey)) {
        return NextResponse.json(
          {
            error:
              "동일한 이름과 연락처의 신청이 포함되어 있어 전체 승인할 수 없습니다. 개별 확인 후 다시 시도해주세요.",
          },
          { status: 409 }
        );
      }

      seenIdentityKeys.add(identityKey);

      const duplicateMember = await findDuplicateActiveMember(
        memberRequest.name,
        normalizedPhone,
        { clubId: memberRequest.clubId }
      );

      if (duplicateMember) {
        return NextResponse.json(
          {
            error:
              "이미 동일한 이름과 연락처로 등록된 회원이 포함되어 있어 전체 승인할 수 없습니다. 개별 확인 후 다시 시도해주세요.",
          },
          { status: 409 }
        );
      }
    }

    const specialFeeIds = await prisma.specialFee.findMany({
      where: { clubId: admin.clubId },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      const createdMembers = [];

      for (const memberRequest of pendingRequests) {
        const createdMember = await tx.member.create({
          data: {
            name: memberRequest.name,
            gender: memberRequest.gender,
            birth: memberRequest.birth,
            phone: formatPhoneNumber(memberRequest.phone),
            level: memberRequest.level,
            customFieldValue: memberRequest.customFieldValue,
            note: memberRequest.note,
            clubId: memberRequest.clubId,
            status: "approved",
          },
        });

        createdMembers.push(createdMember);
      }

      if (specialFeeIds.length > 0 && createdMembers.length > 0) {
        await tx.specialFeePayment.createMany({
          data: createdMembers.flatMap((member) =>
            specialFeeIds.map((specialFee) => ({
              specialFeeId: specialFee.id,
              memberId: member.id,
            }))
          ),
        });
      }

      await tx.memberRequest.updateMany({
        where: {
          id: {
            in: pendingRequests.map((memberRequest) => memberRequest.id),
          },
        },
        data: {
          status: "APPROVED",
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      approvedCount: pendingRequests.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "가입 신청 전체 승인 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
