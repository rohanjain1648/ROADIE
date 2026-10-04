"use client";

import { motion } from "framer-motion";

// Decorative "tour poster" — illustrates the output format, not real data.
const ROWS = [
  { city: "MARKET A", heat: 94 },
  { city: "MARKET B", heat: 88 },
  { city: "MARKET C", heat: 81 },
  { city: "MARKET D", heat: 77 },
  { city: "MARKET E", heat: 69 },
];

export function HeroPoster() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[2rem] bg-acid/10 blur-3xl" aria-hidden />
      <motion.div
        initial={{ rotate: -2, y: 20, opacity: 0 }}
        animate={{ rotate: -2, y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.21, 0.6, 0.35, 1] }}
        className="relative rounded-3xl border border-line bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span>Tour book</span>
          <span className="text-acid">● agent</span>
        </div>
        <div className="mt-4 font-display text-2xl font-extrabold leading-tight">
          Where your fans
          <br />
          <span className="text-acid">actually are.</span>
        </div>
        <ul className="mt-5 space-y-2.5">
          {ROWS.map((r, i) => (
            <motion.li
              key={r.city}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className="flex items-center gap-3"
            >
              <span className="w-5 font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="w-24 text-xs font-semibold tracking-wider">{r.city}</span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-heat via-amber to-acid"
                  initial={{ width: 0 }}
                  animate={{ width: `${r.heat}%` }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.8 }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[10px] text-acid">{r.heat}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
          {[
            ["venue", "affinity"],
            ["opener", "local fans"],
            ["promo", "in-language"],
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg bg-panel-2 px-2 py-2">
              <div className="text-[11px] font-semibold">{a}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted">{b}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-[9px] uppercase tracking-widest text-muted/60">illustration</div>
      </motion.div>
    </div>
  );
}
