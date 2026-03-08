import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface MetricData {
  label: string;
  value: number;
  max: number;
  unit: string;
  hue: number;
}

const MiniGraph = ({ data, hue }: { data: number[]; hue: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw line
    ctx.beginPath();
    const step = w / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = h - (data[i] / 100) * h * 0.8 - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.15)`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }, [data, hue]);

  return <canvas ref={canvasRef} width={120} height={32} className="w-full h-8" />;
};

const DataDashboard = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { label: "CORTEX ACTIVITY", value: 76, max: 100, unit: "%", hue: 180 },
    { label: "SYNAPTIC RATE", value: 2.4, max: 5, unit: "THz", hue: 260 },
    { label: "NEURAL ENTROPY", value: 34, max: 100, unit: "dB", hue: 320 },
    { label: "MESH DENSITY", value: 891, max: 1000, unit: "n/cm³", hue: 200 },
  ]);

  const [graphData, setGraphData] = useState<Record<string, number[]>>({
    "CORTEX ACTIVITY": Array(20).fill(0).map(() => 60 + Math.random() * 30),
    "SYNAPTIC RATE": Array(20).fill(0).map(() => 40 + Math.random() * 40),
    "NEURAL ENTROPY": Array(20).fill(0).map(() => 20 + Math.random() * 50),
    "MESH DENSITY": Array(20).fill(0).map(() => 70 + Math.random() * 25),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: Math.max(0, Math.min(m.max, m.value + (Math.random() - 0.48) * m.max * 0.08)),
        }))
      );
      setGraphData((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const arr = [...next[key]];
          arr.shift();
          arr.push(Math.max(10, Math.min(95, arr[arr.length - 1] + (Math.random() - 0.48) * 15)));
          next[key] = arr;
        }
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.8, duration: 0.8 }}
      className="absolute bottom-20 left-6 z-20 pointer-events-none"
    >
      <div className="neon-border rounded-sm bg-card/60 backdrop-blur-sm p-3 w-56">
        <div className="text-[9px] text-muted-foreground tracking-[0.3em] uppercase mb-3 font-display">
          ◆ NEURAL TELEMETRY
        </div>

        <div className="space-y-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 + i * 0.15 }}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[8px] text-muted-foreground tracking-[0.2em]">
                  {m.label}
                </span>
                <span
                  className="text-[11px] font-display tracking-wider"
                  style={{ color: `hsl(${m.hue}, 100%, 60%)` }}
                >
                  {typeof m.value === "number" && m.value < 10
                    ? m.value.toFixed(1)
                    : Math.round(m.value)}
                  <span className="text-[8px] ml-0.5 opacity-60">{m.unit}</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-[2px] bg-muted rounded-full overflow-hidden mb-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, hsl(${m.hue}, 100%, 40%), hsl(${m.hue}, 100%, 60%))`,
                    boxShadow: `0 0 6px hsl(${m.hue}, 100%, 50%, 0.5)`,
                  }}
                  animate={{ width: `${(m.value / m.max) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Mini graph */}
              <MiniGraph data={graphData[m.label] || []} hue={m.hue} />
            </motion.div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="text-[8px] text-muted-foreground/50 font-mono tracking-wider">
            STREAM::LIVE ● {new Date().toISOString().slice(11, 19)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DataDashboard;
