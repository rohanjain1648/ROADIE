import Link from "next/link";
import type { QEntity } from "@/lib/qloo/types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("group inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#6a3df7] to-[#e3336e] text-white shadow-[0_6px_14px_-6px_rgba(91,50,240,0.7)] transition-transform group-hover:-rotate-6 group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 18c3-8 6-12 8-12s3 4 4 6 2 3 4 3" />
          <circle cx="4" cy="18" r="1.6" fill="currentColor" />
          <circle cx="20" cy="15" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight">Roadie</span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium text-muted">
          <Link href="/#demos" className="hidden rounded-full px-3.5 py-2 transition hover:bg-panel-2 hover:text-text md:block">Demos</Link>
          <Link href="/proof" className="rounded-full px-3.5 py-2 transition hover:bg-panel-2 hover:text-text">Proof</Link>
          <Link href="/#mcp" className="hidden rounded-full px-3.5 py-2 transition hover:bg-panel-2 hover:text-text sm:block">MCP</Link>
          <a
            href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/"}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full px-3.5 py-2 transition hover:bg-panel-2 hover:text-text sm:block"
          >
            GitHub
          </a>
          <Link href="/plan" className="btn-primary ml-2 rounded-full px-4 py-2 font-semibold">
            Plan a tour
          </Link>
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
    <div className="mb-8">
      {kicker && (
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-acid">
          <span className="h-px w-6 bg-acid/60" />
          {kicker}
        </div>
      )}
      <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{sub}</p>}
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
