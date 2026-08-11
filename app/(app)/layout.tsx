import Sidebar from "@/components/layout/Sidebar";
import { liveCallsEnabled } from "@/lib/config";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const liveCalls = liveCallsEnabled();

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
        {/* The patch of sky — CALL-E's aqua drifting through the yellow. */}
        <div
          style={{
            position: "absolute",
            width: 560,
            height: 560,
            borderRadius: "50%",
            top: -140,
            left: "12%",
            background: "rgba(101,199,214,0.45)",
            filter: "blur(90px)",
            animation: "blobDrift 28s ease-in-out infinite",
          }}
        />
        {/* Warmer, lighter yellow pooling low. */}
        <div
          style={{
            position: "absolute",
            width: 620,
            height: 620,
            borderRadius: "50%",
            bottom: -160,
            right: -160,
            background: "rgba(255,241,150,0.55)",
            filter: "blur(90px)",
            animation: "blobDrift 34s ease-in-out infinite reverse",
          }}
        />
        {/* A faint white bloom keeping the middle airy. */}
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            top: "38%",
            left: "34%",
            background: "rgba(255,253,235,0.35)",
            filter: "blur(90px)",
            animation: "blobDrift 22s ease-in-out infinite 4s",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(29,27,16,0.05) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(29,27,16,0.05) 1px, transparent 1px)",
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
