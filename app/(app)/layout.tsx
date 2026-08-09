import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const liveCalls = process.env.OPENLINE_LIVE_CALLS === "true";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Blob field. The glass panels need something to refract. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            top: -100,
            right: -80,
            background: "rgba(197,52,27,0.20)",
            filter: "blur(80px)",
            animation: "blobDrift 28s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 560,
            height: 560,
            borderRadius: "50%",
            bottom: -120,
            left: -150,
            background: "rgba(92,122,74,0.15)",
            filter: "blur(80px)",
            animation: "blobDrift 34s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: "50%",
            top: "40%",
            right: "20%",
            background: "rgba(194,138,46,0.12)",
            filter: "blur(80px)",
            animation: "blobDrift 22s ease-in-out infinite 4s",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(50,30,5,0.04) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(50,30,5,0.04) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "42px 42px",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Sidebar liveCalls={liveCalls} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
