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

async function findDuplicateActiveMember(
  clubId: number,
  name: string,
  phone: string,
  excludeMemberId?: number
) {
  if (!phone) {
    return null;
  }

  const candidates = await prisma.member.findMany({
    where: {
      clubId,
      name,
      deleted: false,
      ...(excludeMemberId
        ? {
            NOT: {
              id: excludeMemberId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      phone: true,
    },
  });

  const normalizedPhone = normalizePhoneNumber(phone);

  return (
    candidates.find(
      (member) =>
        normalizePhoneNumber(member.phone) === normalizedPhone
    ) ?? null
  );
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
      admin.clubId,
      normalizedName,
      normalizedPhone
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
      admin.clubId,
      normalizedName,
      normalizedPhone,
      existingMember.id
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

    const updatedMember = await prisma.member.update({
      where: { id: existingMember.id },
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
      },
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
      admin.clubId,
      String(existingMember.name).trim(),
      formatPhoneNumber(existingMember.phone),
      existingMember.id
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
