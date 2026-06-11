import {
  notFoundResponse,
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { findDuplicateActiveMember } from "@/lib/member-identity";
import { formatPhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

async function findClubMember(
  memberId: number,
  clubId: number
) {
  return await prisma.member.findFirst({
    where: {
      id: memberId,
      clubId,
    },
  });
}

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "fees") {
      const feeMembers = await prisma.member.findMany({
        where: {
          clubId: admin.clubId,
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(feeMembers);
    }

    const members = await prisma.member.findMany({
      where: { clubId: admin.clubId },
      select: {
        id: true,
        name: true,
        gender: true,
        birth: true,
        phone: true,
        level: true,
        customFieldValue: true,
        note: true,
        status: true,
        createdAt: true,
        deleted: true,
        deletedAt: true,
        withdrawnAt: true,
        positionId: true,
        position: {
          select: { id: true, name: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      name,
      gender,
      birth,
      phone,
      level,
      customFieldValue,
      note,
      positionId,
    } = body;

    const normalizedName = String(name ?? "").trim();
    const normalizedPhone = formatPhoneNumber(phone);

    if (!normalizedName || !gender || !level) {
      return NextResponse.json(
        { error: "이름, 성별, 급수는 필수입니다." },
        { status: 400 }
      );
    }

    const duplicateMember = await findDuplicateActiveMember(
      normalizedName,
      normalizedPhone,
      { clubId: admin.clubId }
    );

    if (duplicateMember) {
      return NextResponse.json(
        {
          error:
            "이미 동일한 이름과 연락처로 등록된 회원이 있습니다.",
        },
        { status: 409 }
      );
    }

    const newMember = await prisma.$transaction(async (tx) => {
      const createdMember = await tx.member.create({
        data: {
          name: normalizedName,
          gender,
          birth: birth ? new Date(birth) : null,
          phone: normalizedPhone,
          level,
          customFieldValue: customFieldValue
            ? String(customFieldValue).trim()
            : "",
          note: note ? String(note).trim() : "",
          clubId: admin.clubId,
          status: "approved",
          positionId: positionId ? Number(positionId) : null,
        },
      });

      const specialFees = await tx.specialFee.findMany({
        where: { clubId: admin.clubId },
        select: { id: true },
      });

      if (specialFees.length > 0) {
        await tx.specialFeePayment.createMany({
          data: specialFees.map((specialFee) => ({
            specialFeeId: specialFee.id,
            memberId: createdMember.id,
          })),
        });
      }

      return createdMember;
    });

    const club = await prisma.club.findUnique({ where: { id: admin.clubId }, select: { name: true } });
    void sendTelegramAlert({
      event: "MEMBER_DIRECT_CREATE",
      clubName: club?.name ?? String(admin.clubId),
      name: normalizedName,
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const {
      id,
      name,
      gender,
      birth,
      phone,
      level,
      customFieldValue,
      note,
      positionId,
    } = body;
    const memberId = Number(id);
    const normalizedName = String(name ?? "").trim();
    const normalizedPhone = formatPhoneNumber(phone);

    if (!Number.isFinite(memberId)) {
      return NextResponse.json(
        { error: "잘못된 회원 ID입니다." },
        { status: 400 }
      );
    }

    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("수정할 회원을 찾을 수 없습니다.");
    }

    const duplicateMember = await findDuplicateActiveMember(
      normalizedName,
      normalizedPhone,
      { clubId: admin.clubId, excludeMemberId: existingMember.id }
    );

    if (duplicateMember) {
      return NextResponse.json(
        {
          error:
            "이미 동일한 이름과 연락처로 등록된 회원이 있습니다.",
        },
        { status: 409 }
      );
    }

    const formatBirth = (value: Date | null) => {
      if (!value) return "-";
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}.${m}.${d}`;
    };

    const newBirth = birth ? new Date(birth) : null;
    const normalizedCustomFieldValue = customFieldValue ? String(customFieldValue).trim() : "";
    const normalizedNote = note ? String(note).trim() : "";

    const changes: { field: string; before: string; after: string }[] = [];
    if (existingMember.name !== normalizedName)
      changes.push({ field: "이름", before: existingMember.name, after: normalizedName });
    if ((existingMember.gender ?? "-") !== (gender ?? "-"))
      changes.push({ field: "성별", before: existingMember.gender || "-", after: gender || "-" });
    if (formatBirth(existingMember.birth) !== formatBirth(newBirth))
      changes.push({ field: "생년월일", before: formatBirth(existingMember.birth), after: formatBirth(newBirth) });
    if (existingMember.phone !== normalizedPhone)
      changes.push({ field: "연락처", before: existingMember.phone || "-", after: normalizedPhone || "-" });
    if ((existingMember.level ?? "-") !== (level ?? "-"))
      changes.push({ field: "급수", before: existingMember.level || "-", after: level || "-" });
    if ((existingMember.customFieldValue ?? "") !== normalizedCustomFieldValue)
      changes.push({ field: "추가정보", before: existingMember.customFieldValue || "-", after: normalizedCustomFieldValue || "-" });
    if ((existingMember.note ?? "") !== normalizedNote)
      changes.push({ field: "메모", before: existingMember.note || "-", after: normalizedNote || "-" });

    const updatedMember = await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        name: normalizedName,
        gender,
        birth: newBirth,
        phone: normalizedPhone,
        level,
        customFieldValue: normalizedCustomFieldValue,
        note: normalizedNote,
        positionId:
          positionId === undefined
            ? undefined
            : positionId
              ? Number(positionId)
              : null,
      },
    });

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });

    void sendTelegramAlert({
      event: "MEMBER_UPDATE",
      clubName: club?.name ?? String(admin.clubId),
      name: updatedMember.name,
      changes,
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const memberId = Number(id);
    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("삭제할 회원을 찾을 수 없습니다.");
    }

    await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        deleted: true,
        deletedAt: new Date(),
        withdrawnAt: new Date(),
      },
    });

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });

    void sendTelegramAlert({
      event: "MEMBER_DELETE",
      clubName: club?.name ?? String(admin.clubId),
      name: existingMember.name,
    });

    return NextResponse.json({ message: "삭제 성공" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { id } = await req.json();
    const memberId = Number(id);
    const existingMember = await findClubMember(
      memberId,
      admin.clubId
    );

    if (!existingMember) {
      return notFoundResponse("복구할 회원을 찾을 수 없습니다.");
    }

    const duplicateMember = await findDuplicateActiveMember(
      String(existingMember.name).trim(),
      formatPhoneNumber(existingMember.phone),
      { clubId: admin.clubId, excludeMemberId: existingMember.id }
    );

    if (duplicateMember) {
      return NextResponse.json(
        {
          error:
            "이미 동일한 이름과 연락처로 등록된 회원이 있어 복구할 수 없습니다.",
        },
        { status: 409 }
      );
    }

    await prisma.member.update({
      where: { id: existingMember.id },
      data: {
        deleted: false,
        deletedAt: null,
        withdrawnAt: null,
        phone: formatPhoneNumber(existingMember.phone),
      },
    });

    return NextResponse.json({ message: "복구 성공" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "회원 복구에 실패했습니다." },
      { status: 500 }
    );
  }
}
