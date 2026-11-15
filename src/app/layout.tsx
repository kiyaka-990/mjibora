export const metadata = { title: "MjiBora — AI Service Desk" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a1420", color: "#e6f1ff" }}>
        {children}
      </body>
    </html>
  );
}
