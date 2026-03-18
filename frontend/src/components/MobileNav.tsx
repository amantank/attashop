import { useEffect, useRef, useState, useCallback } from "react";

const GREEN = "#2E9E4F";
const YELLOW = "#FFD600";
const BAR_H = 52;
const PAD = 4;
const PILL_H = 45;
const PILL_R = PILL_H;
const CR = 46;
const DURATION = 460;

const icons: Record<string, JSX.Element> = {
  Home: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  Favorite: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  Orders: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 7h8M8 12h8M8 17h5" />
    </svg>
  ),
  Profile: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
};

export const routes = [
  { label: "Home", path: "/" },
  { label: "Favorite", path: "/favorite" },
  { label: "Orders", path: "/orders" },
  { label: "Profile", path: "/profile" },
];

// ─── Easing ────────────────────────────────────────────────────────────────
function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Canvas draw ───────────────────────────────────────────────────────────
function drawBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ax: number,
  pillW: number,
) {
  ctx.clearRect(0, 0, w, h);
  const iR = PILL_R + PAD;
  const nL = ax - pillW / 2 - PAD;
  const nR = ax + pillW / 2 + PAD;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = -2;

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 0);
  ctx.lineTo(nL - CR, 0);
  ctx.bezierCurveTo(nL, 0, nL, 0, nL, CR);
  ctx.lineTo(nL, h - iR);
  ctx.bezierCurveTo(nL, h, nL, h, nL + iR, h);
  ctx.lineTo(nR - iR, h);
  ctx.bezierCurveTo(nR, h, nR, h, nR, h - iR);
  ctx.lineTo(nR, CR);
  ctx.bezierCurveTo(nR, 0, nR, 0, nR + CR, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.closePath();

  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.restore();
}

// ─── Measure where pill will land after DOM swap (no flicker) ──────────────
function measureFutureMetrics(
  targetIdx: number,
  wrapWidth: number,
): { ax: number; pillW: number } {
  const ghost = document.createElement("div");
  ghost.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;display:flex;align-items:center;justify-content:space-around;padding:0 16px 6px;width:${wrapWidth}px;height:${BAR_H}px;top:-9999px;left:0;`;

  routes.forEach((r, i) => {
    const slot = document.createElement("div");
    slot.style.cssText =
      "display:flex;align-items:center;justify-content:center;";
    if (i === targetIdx) {
      slot.innerHTML = `<div style="display:flex;align-items:center;gap:7px;background:${YELLOW};border-radius:999px;padding:10px 20px 10px 14px;font-size:14px;font-weight:700;white-space:nowrap;font-family:sans-serif;height:${PILL_H}px;box-sizing:border-box;">${r.label}</div>`;
    } else {
      slot.innerHTML = `<div style="width:36px;height:36px;"></div>`;
    }
    ghost.appendChild(slot);
  });

  document.body.appendChild(ghost);
  const pillEl = ghost.children[targetIdx].firstElementChild as HTMLElement;
  const pillRect = pillEl.getBoundingClientRect();
  const ghostRect = ghost.getBoundingClientRect();
  const result = {
    ax: pillRect.left - ghostRect.left + pillRect.width / 2,
    pillW: pillRect.width,
  };
  document.body.removeChild(ghost);
  return result;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function BottomNavBar() {
  const [active, setActive] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  // Animation refs — avoid re-renders during animation
  const animRef = useRef<number | null>(null);
  const curAx = useRef(0);
  const curW = useRef(0);
  const fromAx = useRef(0);
  const fromW = useRef(0);
  const toAx = useRef(0);
  const toW = useRef(0);
  const startTime = useRef<number | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    canvas.width = wr.width;
    canvas.height = BAR_H;
  }, []);

  const getMetrics = useCallback((idx: number) => {
    const wrap = wrapRef.current;
    const items = itemsRef.current;
    if (!wrap || !items) return null;
    const btns = items.querySelectorAll<HTMLButtonElement>("button");
    if (!btns[idx]) return null;
    const br = btns[idx].getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    return { ax: br.left - wr.left + br.width / 2, pillW: br.width };
  }, []);

  const tick = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (!startTime.current) startTime.current = ts;
    const t = easeOutQuart(Math.min((ts - startTime.current) / DURATION, 1));

    curAx.current = lerp(fromAx.current, toAx.current, t);
    curW.current = lerp(fromW.current, toW.current, t);
    drawBg(ctx, canvas.width, canvas.height, curAx.current, curW.current);

    if (t < 1) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      animRef.current = null;
    }
  }, []);

  const startAnim = useCallback(
    (fAx: number, fW: number, tAx: number, tW: number) => {
      fromAx.current = fAx;
      fromW.current = fW;
      toAx.current = tAx;
      toW.current = tW;
      startTime.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  // Init
  useEffect(() => {
    resizeCanvas();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const m = getMetrics(active);
        if (!m) return;
        curAx.current = m.ax;
        curW.current = m.pillW;
        fromAx.current = m.ax;
        fromW.current = m.pillW;
        toAx.current = m.ax;
        toW.current = m.pillW;
        const canvas = canvasRef.current!;
        drawBg(
          canvas.getContext("2d")!,
          canvas.width,
          canvas.height,
          m.ax,
          m.pillW,
        );
      }),
    );
  }, [active]);

  // Resize observer
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      const m = getMetrics(active);
      if (m) {
        curAx.current = m.ax;
        curW.current = m.pillW;
        const canvas = canvasRef.current!;
        drawBg(
          canvas.getContext("2d")!,
          canvas.width,
          canvas.height,
          m.ax,
          m.pillW,
        );
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [active, resizeCanvas, getMetrics]);

  const handlePress = useCallback(
    (i: number) => {
      if (i === active) return;

      // 1. Snapshot current live position
      const fAx = curAx.current;
      const fW = curW.current;

      // 2. Measure future pill position BEFORE DOM changes
      const wrapW = wrapRef.current?.getBoundingClientRect().width ?? 400;
      const future = measureFutureMetrics(i, wrapW);

      // 3. Swap active (triggers re-render → new DOM)
      setActive(i);

      // 4. Animate canvas from old → pre-measured new
      startAnim(fAx, fW, future.ax, future.pillW);
    },
    [active, startAnim],
  );

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[9999] md:hidden"
      style={{
        height: BAR_H,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: BAR_H,
          display: "block",
        }}
      />

      <div
        ref={itemsRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: BAR_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 6px 6px",
          zIndex: 10,
        }}
      >
        {routes.map((route, i) => (
          <button
            key={route.label}
            onClick={() => handlePress(i)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {i === active ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: YELLOW,
                  borderRadius: 18,
                  padding: "10px 20px 10px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#222",
                  whiteSpace: "nowrap",
                  height: PILL_H,
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{ color: "#e53935", display: "flex", flexShrink: 0 }}
                >
                  {icons[route.label]}
                </span>
                <span>{route.label}</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {icons[route.label]}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
