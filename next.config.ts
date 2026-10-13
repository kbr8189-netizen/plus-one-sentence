import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 화면은 public/의 HTML 두 장: 참가자 `/`, 강사 보드 `/admin`
  async rewrites() {
    return [
      { source: "/", destination: "/participant.html" },
      { source: "/admin", destination: "/board.html" },
      { source: "/board", destination: "/board.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:page(participant.html|board.html|admin|board)?",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/:page(board.html|admin|board)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
