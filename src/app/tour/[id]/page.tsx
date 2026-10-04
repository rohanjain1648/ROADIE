import Link from "next/link";
import { TourBook } from "@/components/TourBook";
import { Nav } from "@/components/ui";
import type { TourPlan } from "@/lib/agent/types";
import { kvGet } from "@/lib/cache";

export default async function TourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = /^[a-z0-9-]{4,40}$/i.test(id) ? await kvGet<TourPlan>(`tour:${id}`) : null;

  return (
    <div className="glow-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {plan ? (
          <TourBook plan={plan} />
        ) : (
          <div className="mx-auto max-w-md py-24 text-center">
            <h1 className="font-display text-2xl font-bold">Tour not found</h1>
            <p className="mt-2 text-sm text-muted">
              This link may have expired. Shared tours persist for 30 days when the app is deployed with Upstash Redis.
            </p>
            <Link href="/plan" className="mt-6 inline-block rounded-xl bg-acid px-4 py-2 text-sm font-semibold text-ink">
              Plan a new tour
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
