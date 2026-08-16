import type { Metadata } from "next";
import { Archivo, Big_Shoulders, Courier_Prime } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--display-face",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const courier = Courier_Prime({
  subsets: ["latin"],
  variable: "--mono",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenLine — phone screening for recruiting teams",
  description:
    "A screening-call platform for recruiters. Bring your shortlist, approve the questions once, and every candidate gets called — with structured answers back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bigShoulders.variable} ${courier.variable}`}
    >
      <body>
        {/* The direction contract must survive the production build as a real
            HTML comment, so it is emitted rather than written as JSX. */}
        <div
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Every screening call is a patch on the exchange board; OpenLine is the operator who never sleeps. Refuses the AI-SaaS gradient hero and the card-grid feature list.
OWN-WORLD: Bakelite near-black ground, brass jacks and cords, cream engraved labels, jewel-lamp status colors; condensed display caps, typewriter mono; no enclosure - plates, rules, and leader lines, never cards.
STORY: A judge watches the machine place a call - disclose itself, ask permission - and understands a human reads every word; they open the console.
FIRST VIEWPORT: Full-bleed switchboard; jack rows of the real shortlist; one patched cord glows amber into a ticker printing the disclosure transcript; condensed headline "THE OPERATOR WHO NEVER SLEEPS"; one brass pill CTA "Open the console".
FORM: The Exchange - own-list candidate 1 of 7; seed 34d229b9.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
