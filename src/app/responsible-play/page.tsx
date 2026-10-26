import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Responsible Play",
  description:
    "Casinova is entertainment for adults 18 and older. Set a limit before you deposit, take breaks, and find help, including the National Problem Gambling Helpline.",
  keywords: ["responsible play", "responsible gaming", "Casinova", "problem gambling help"],
  path: "/responsible-play",
});

export default function ResponsiblePlayPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Responsible play", href: "/responsible-play" },
            ]}
          />
          <h1 className="text-4xl font-black text-white">Responsible play</h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#c7c9e0]">
            <p>Casinova is entertainment. Set a limit before you deposit, and stop when you hit it.</p>
            <p>You must be 18 or older to play.</p>
            <p>Do not chase losses. Take breaks.</p>
            <p>
              If play stops being fun, stop playing and talk to someone you trust, or contact{" "}
              <Link href="/support" className="text-[#00E5FF]">
                support
              </Link>
              . In the US, the National Problem Gambling Helpline is 1-800-522-4700.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
