export const metadata = {
  title: "幸运抽奖券生成器 · Upstash 版",
  description: "Vercel + Upstash Redis"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, background: "#f7f7fb" }}>{children}</body>
    </html>
  );
}
