import {
  requireAuthAdmin,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const admin = await requireAuthAdmin();

    if (!admin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const specialFeeIdParam = searchParams.get("id");
    const specialFeeId = specialFeeIdParam
      ? Number(specialFeeIdParam)
      : null;

    if (
      specialFeeIdParam !== null &&
      specialFeeId !== null &&
      Number.isFinite(specialFeeId)
    ) {
      const specialFee = await prisma.specialFee.findFirst({
        where: {
          id: specialFeeId,
          clubId: admin.clubId,
        },
        include: {
          payments: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!specialFee) {
        return NextResponse.json(
          { error: "수시회비 항목을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...specialFee,
        paidCount: specialFee.payments.filter(
          (payment) => payment.paid
        ).length,
      });
    }

    const specialFees = await prisma.specialFee.findMany({
      where: { clubId: admin.clubId },
      select: {
        id: true,
        title: true,
        amount: true,
        description: true,
        dueDate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const paidCounts =
      specialFees.length === 0
        ? []
        : await prisma.specialFeePayment.groupBy({
            by: ["specialFeeId"],
            where: {
              paid: true,
              specialFeeId: {
                in: specialFees.map((specialFee) => specialFee.id),
              },
            },
            _count: {
              _all: true,
            },
          });

    const paidCountMap = new Map(
      paidCounts.map((row) => [row.specialFeeId, row._count._all])
    );

    return NextResponse.json(
      specialFees.map((specialFee) => ({
        ...specialFee,
        paidCount: paidCountMap.get(specialFee.id) ?? 0,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 목록을 불러오지 못했습니다." },
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

    const { title, amount, dueDate, description } = await req.json();

    if (!title || !amount) {
      return NextResponse.json(
        { error: "항목 이름과 금액은 필수입니다." },
        { status: 400 }
      );
    }

    const activeMembers = await prisma.member.findMany({
      where: {
        clubId: admin.clubId,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    const created = await prisma.$transaction(async (tx) => {
      const specialFee = await tx.specialFee.create({
        data: {
          title: String(title).trim(),
          amount: Number(amount),
          description: description ? String(description).trim() : "",
          dueDate: dueDate ? new Date(dueDate) : null,
          clubId: admin.clubId,
        },
      });

      if (activeMembers.length > 0) {
        await tx.specialFeePayment.createMany({
          data: activeMembers.map((member) => ({
            specialFeeId: specialFee.id,
            memberId: member.id,
          })),
        });
      }

      return tx.specialFee.findUniqueOrThrow({
        where: { id: specialFee.id },
        include: {
          payments: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    });

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });

    void sendTelegramAlert({
      event: "SPECIAL_FEE_CREATE",
      clubName: club?.name ?? String(admin.clubId),
      feeTitle: created.title,
      amount: created.amount,
    });

    return NextResponse.json({
      ...created,
      paidCount: 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 생성에 실패했습니다." },
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
    const specialFeeId = Number(id);

    if (!Number.isFinite(specialFeeId)) {
      return NextResponse.json(
        { error: "삭제할 수시회비 항목을 확인해주세요." },
        { status: 400 }
      );
    }

    const existingSpecialFee = await prisma.specialFee.findFirst({
      where: {
        id: specialFeeId,
        clubId: admin.clubId,
      },
    });

    if (!existingSpecialFee) {
      return NextResponse.json(
        { error: "수시회비 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.specialFee.delete({
      where: { id: existingSpecialFee.id },
    });

    const club = await prisma.club.findUnique({
      where: { id: admin.clubId },
      select: { name: true },
    });

    void sendTelegramAlert({
      event: "SPECIAL_FEE_DELETE",
      clubName: club?.name ?? String(admin.clubId),
      feeTitle: existingSpecialFee.title,
      amount: existingSpecialFee.amount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "수시회비 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
