import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "콕매니저🏸",
    short_name: "콕매니저🏸",
    description: "배드민턴 클럽/소모임 운영 관리 프로그램",
    start_url: "/admin/login",
    scope: "/",
    display: "browser",
    orientation: "portrait",
    background_color: "#f8fbff",
    theme_color: "#111827",
    lang: "ko-KR",
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
