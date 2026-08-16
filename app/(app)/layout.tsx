import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The same rule start.sh's banner uses: a CALL-E key present means a
  // candidate with a number on file will really be dialed.
  const callsLive = Boolean(process.env.CALLE_API_KEY?.trim());

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
      {/* The exchange floor at night: two tungsten pools over the bakelite,
          and a faint jack-field grid. The glass panels need something to
          refract; nothing here moves — the room is still until a line is. */}
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
            width: 620,
            height: 620,
            borderRadius: "50%",
            top: -180,
            left: "10%",
            background: "rgba(200,155,60,0.10)",
            filter: "blur(100px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 560,
            height: 560,
            borderRadius: "50%",
            bottom: -200,
            right: -140,
            background: "rgba(226,89,63,0.05)",
            filter: "blur(110px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(239,231,211,0.045) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(239,231,211,0.045) 1px, transparent 1px)",
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
        <Sidebar callsLive={callsLive} />
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
