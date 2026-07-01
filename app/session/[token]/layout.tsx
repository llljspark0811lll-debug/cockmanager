import type { Metadata } from "next";
import prisma from "@/lib/prisma";

const siteUrl = "https://www.cockmanager.kr";
const ogVersion = "3";

type SessionLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({
  params,
}: SessionLayoutProps): Promise<Metadata> {
  const { token } = await params;

  const session = await prisma.clubSession.findUnique({
    where: {
      publicToken: token,
    },
    select: {
      title: true,
      club: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!session) {
    return {
      title: "참석신청서",
      description: "콕매니저 운동 일정 참석 신청 링크",
      openGraph: {
        title: "참석신청서",
        description: "콕매니저 운동 일정 참석 신청 링크",
      },
      twitter: {
        title: "참석신청서",
        description: "콕매니저 운동 일정 참석 신청 링크",
      },
    };
  }

  const title = session.title;
  const description = `${session.club.name}\n운동 일정 참석 링크`;
  const encodedToken = encodeURIComponent(token);
  const pageUrl = `${siteUrl}/session/${encodedToken}`;
  const imageUrl = `${siteUrl}/api/og/session/${encodedToken}/preview.png?v=${ogVersion}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: pageUrl,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${session.title} 참석 신청`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function SessionLayout({ children }: SessionLayoutProps) {
  return children;
}
