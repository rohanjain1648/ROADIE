import Link from "next/link";
import type { QEntity } from "@/lib/qloo/types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("group inline-flex items-center gap-2", className)}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-acid text-ink transition-transform group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 18c3-8 6-12 8-12s3 4 4 6 2 3 4 3" />
          <circle cx="4" cy="18" r="1.6" fill="currentColor" />
          <circle cx="20" cy="15" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-[15px] font-bold tracking-tight">ROADIE</span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm text-muted">
          <Link href="/plan" className="rounded-md px-3 py-1.5 hover:text-text">Plan a tour</Link>
          <Link href="/proof" className="rounded-md px-3 py-1.5 hover:text-text">Proof</Link>
          <Link href="/#mcp" className="hidden rounded-md px-3 py-1.5 hover:text-text sm:block">MCP</Link>
          <a
            href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/"}
            target="_blank"
            rel="noreferrer"
            className="ml-1 hidden rounded-md border border-line px-3 py-1.5 text-text hover:border-acid/60 sm:block"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Pill({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "acid" | "heat" | "amber" | "sky"; className?: string }) {
  const tones = {
    default: "border-line bg-panel-2 text-muted",
    acid: "border-acid/30 bg-acid/10 text-acid",
    heat: "border-heat/30 bg-heat/10 text-heat",
    amber: "border-amber/30 bg-amber/10 text-amber",
    sky: "border-sky/30 bg-sky/10 text-sky",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function AffinityBar({ value, className }: { value?: number; className?: string }) {
  if (value === undefined) return null;
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)} title={`Qloo affinity ${value.toFixed(3)}`}>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-line">
        <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-acid-dim to-acid" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[10px] text-muted">{value.toFixed(2)}</span>
    </span>
  );
}

export function EntityRow({ entity, label, compact }: { entity: QEntity | null | undefined; label?: string; compact?: boolean }) {
  if (!entity) return <div className="text-sm text-muted">{label ? `${label}: ` : ""}—</div>;
  return (
    <div className="min-w-0">
      {label && <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={cx("truncate font-medium", compact ? "text-sm" : "text-[15px]")}>{entity.name}</span>
        <AffinityBar value={entity.affinity} />
        {entity.mock && <Pill tone="amber">mock</Pill>}
      </div>
      {!compact && entity.address && <div className="truncate text-xs text-muted">{entity.address}</div>}
      <div className="truncate font-mono text-[10px] text-muted/60" title="Qloo entity ID — every recommendation is grounded">
        {entity.id}
      </div>
    </div>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      {kicker && <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-acid">{kicker}</div>}
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function ModeBanner({ mode }: { mode?: { qloo: string; llm: string; llmModel?: string } }) {
  if (!mode) return null;
  const mockQloo = mode.qloo === "mock";
  const mockLlm = mode.llm === "mock";
  if (!mockQloo && !mockLlm) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Pill tone="acid">● Qloo live</Pill>
        <Pill tone="sky">LLM: {mode.llm} · {mode.llmModel}</Pill>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber/30 bg-amber/5 px-3 py-2 text-xs text-amber">
      <strong className="font-semibold">Demo mode.</strong>{" "}
      {mockQloo && "Qloo data is MOCKED (add QLOO_API_KEY). "}
      {mockLlm && "LLM text is templated (add GROQ_API_KEY or OPENAI_API_KEY). "}
      Names shown are placeholders, not real recommendations.
    </div>
  );
}
