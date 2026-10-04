import { Suspense } from "react";
import { Nav } from "@/components/ui";
import { PlanClient } from "./PlanClient";

export const metadata = { title: "Plan a tour — ROADIE" };

export default function PlanPage() {
  return (
    <div className="glow-bg min-h-screen">
      <Nav />
      <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
        <PlanClient />
      </Suspense>
    </div>
  );
}
