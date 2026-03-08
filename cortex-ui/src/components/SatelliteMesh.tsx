import { useEffect, useRef } from "react";

interface HexNode {
  cx: number;
  cy: number;
  size: number;
  phase: number;
  neighbors: number[];
}

const SatelliteMesh = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const hexSize = 22;
    const cols = 11;
    const rows = 5;
    const nodes: HexNode[] = [];
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const gridW = cols * hexSize * 1.78;
    const gridH = rows * hexSize * 1.55;
    const ox = (w - gridW) / 2 + hexSize * 1.2;
    const oy = (h - gridH) / 2 + hexSize * 0.6;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * hexSize * 1.78 + (r % 2) * hexSize * 0.89;
        const y = oy + r * hexSize * 1.55;
        nodes.push({ cx: x, cy: y, size: hexSize, phase: c * 0.4 + r * 0.6 + Math.random() * 0.5, neighbors: [] });
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].cx - nodes[j].cx;
        const dy = nodes[i].cy - nodes[j].cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hexSize * 2.2) {
          nodes[i].neighbors.push(j);
          nodes[j].neighbors.push(i);
        }
      }
    }

    let t = 0;

    const drawHex = (x: number, y: number, size: number, alpha: number, wave: number, time: number) => {
      const verts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        verts.push([x + Math.cos(angle) * size, y + Math.sin(angle) * size + wave]);
      }

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        if (i === 0) ctx.moveTo(verts[i][0], verts[i][1]);
        else ctx.lineTo(verts[i][0], verts[i][1]);
      }
      ctx.closePath();
      ctx.strokeStyle = `hsla(180, 100%, 50%, ${alpha * 0.35})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = `hsla(180, 100%, 50%, ${alpha * 0.03})`;
      ctx.fill();

      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const mx = (verts[i][0] + verts[next][0]) / 2;
        const my = (verts[i][1] + verts[next][1]) / 2;
        const circlePulse = (Math.sin(time * 2.5 + i * 1.05 + wave * 0.1) + 1) * 0.5;
        const r = 1.8 + circlePulse * 1.2;

        ctx.beginPath();
        ctx.arc(mx, my, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(180, 100%, 60%, ${circlePulse * alpha * 0.2})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(180, 100%, ${65 + circlePulse * 25}%, ${0.4 + circlePulse * 0.5 * alpha})`;
        ctx.fill();
      }
    };

    const draw = () => {
      t += 0.012;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (let waveLayer = 0; waveLayer < 3; waveLayer++) {
        ctx.beginPath();
        const waveY = ch * 0.55 + waveLayer * 12;
        const waveAmp = 6 + waveLayer * 3;
        const waveSpeed = t * (0.8 + waveLayer * 0.3);
        const waveFreq = 0.012 + waveLayer * 0.004;

        ctx.moveTo(0, ch);
        ctx.lineTo(0, waveY + Math.sin(waveSpeed) * waveAmp);
        for (let x = 0; x <= cw; x += 3) {
          const y = waveY + Math.sin(x * waveFreq + waveSpeed) * waveAmp
            + Math.sin(x * waveFreq * 0.5 + waveSpeed * 1.3) * waveAmp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();

        ctx.fillStyle = `hsla(180, 100%, 50%, ${0.025 - waveLayer * 0.007})`;
        ctx.fill();
      }

      for (let wl = 0; wl < 2; wl++) {
        ctx.beginPath();
        const baseY = ch * 0.35 + wl * 25;
        for (let x = 0; x <= cw; x += 2) {
          const y = baseY + Math.sin(x * 0.015 + t * 1.2 + wl) * 8 + Math.sin(x * 0.008 + t * 0.7) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(180, 100%, 55%, ${0.06 - wl * 0.02})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const waveI = Math.sin(t * 0.9 + n.phase) * 8;
        for (const j of n.neighbors) {
          if (j <= i) continue;
          const m = nodes[j];
          const waveJ = Math.sin(t * 0.9 + m.phase) * 8;
          const signalT = (t * 1.2 + n.phase * 0.5) % 1;
          const alpha = 0.12 + Math.sin(t + n.phase + m.phase) * 0.06;

          ctx.beginPath();
          ctx.moveTo(n.cx, n.cy + waveI);
          ctx.lineTo(m.cx, m.cy + waveJ);
          ctx.strokeStyle = `hsla(180, 100%, 45%, ${alpha})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();

          if (Math.random() > 0.6) {
            const sx = n.cx + (m.cx - n.cx) * signalT;
            const sy = (n.cy + waveI) + ((m.cy + waveJ) - (n.cy + waveI)) * signalT;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fillStyle = "hsla(180, 100%, 70%, 0.5)";
            ctx.fill();
          }
        }
      }

      for (const node of nodes) {
        const wave = Math.sin(t * 0.9 + node.phase) * 8;
        const distFromCenter = Math.abs(node.cx - cw / 2) / (cw / 2);
        const edgeFade = 1 - Math.pow(distFromCenter, 1.5);
        const vertFade = 1 - Math.pow(Math.abs(node.cy + wave - ch / 2) / (ch / 2), 2);
        const alpha = Math.max(0, edgeFade * vertFade);
        drawHex(node.cx, node.cy + wave, node.size, alpha, wave, t);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none" style={{ width: "min(600px, 80vw)", height: "220px" }}>
      <div className="absolute inset-0" style={{
        maskImage: "radial-gradient(ellipse 85% 80% at 50% 40%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 50% 40%, black 40%, transparent 100%)",
      }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ background: "transparent" }} />
      </div>
    </div>
  );
};

export default SatelliteMesh;
