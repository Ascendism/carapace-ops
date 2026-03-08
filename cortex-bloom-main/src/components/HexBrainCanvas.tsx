import { useEffect, useRef, useMemo } from "react";

interface Node {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  connections: number[];
  pulse: number;
  layer: number;
}

// Generate brain-shaped point cloud
function generateBrainNodes(): Node[] {
  const ns: Node[] = [];

  // Brain hemisphere function - creates a realistic brain shape
  const addHemisphere = (side: number) => {
    const count = 60;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;

      // Brain dimensions: wider than tall, elongated front-to-back
      let rx = 130 + Math.random() * 20; // left-right
      let ry = 95 + Math.random() * 15;  // top-bottom
      let rz = 110 + Math.random() * 15; // front-back

      let x = rx * Math.sin(phi) * Math.cos(theta) * (side > 0 ? 0.52 : -0.52) + side * 30;
      let y = ry * Math.cos(phi) * 0.85;
      let z = rz * Math.sin(phi) * Math.sin(theta);

      // Flatten the bottom
      if (y > 60) y = 60 + (y - 60) * 0.3;

      // Cortex folds - add wrinkles
      const foldFreq = 4 + Math.random() * 3;
      const foldAmp = 8 + Math.random() * 6;
      x += Math.sin(phi * foldFreq + theta * 2) * foldAmp * 0.3;
      y += Math.cos(theta * foldFreq) * foldAmp * 0.25;
      z += Math.sin(theta * foldFreq + phi) * foldAmp * 0.3;

      ns.push({
        x, y, z,
        px: 0, py: 0,
        connections: [],
        pulse: Math.random() * Math.PI * 2,
        layer: side > 0 ? 0 : 1,
      });
    }
  };

  // Left and right hemispheres
  addHemisphere(1);
  addHemisphere(-1);

  // Cerebellum (back-bottom)
  for (let i = 0; i < 25; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 50 + Math.random() * 15;
    ns.push({
      x: r * Math.sin(phi) * Math.cos(theta) * 0.8,
      y: 50 + Math.abs(r * Math.cos(phi)) * 0.4,
      z: -70 + r * Math.sin(phi) * Math.sin(theta) * 0.6,
      px: 0, py: 0,
      connections: [],
      pulse: Math.random() * Math.PI * 2,
      layer: 2,
    });
  }

  // Brain stem
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const angle = t * Math.PI * 2;
    const r = 15 + Math.random() * 8;
    ns.push({
      x: Math.cos(angle) * r * 0.7,
      y: 65 + t * 40,
      z: -50 - t * 20 + Math.sin(angle) * r * 0.5,
      px: 0, py: 0,
      connections: [],
      pulse: Math.random() * Math.PI * 2,
      layer: 3,
    });
  }

  // Corpus callosum (center connection between hemispheres)
  for (let i = 0; i < 15; i++) {
    const t = i / 15;
    const z = -60 + t * 120;
    ns.push({
      x: (Math.random() - 0.5) * 20,
      y: -30 + Math.sin(t * Math.PI) * 25,
      z: z * 0.5,
      px: 0, py: 0,
      connections: [],
      pulse: Math.random() * Math.PI * 2,
      layer: 4,
    });
  }

  // Deep inner nodes (thalamus/hypothalamus area)
  for (let i = 0; i < 20; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 20;
    ns.push({
      x: r * Math.sin(phi) * Math.cos(theta) * 0.5,
      y: r * Math.cos(phi) * 0.4,
      z: r * Math.sin(phi) * Math.sin(theta) * 0.5,
      px: 0, py: 0,
      connections: [],
      pulse: Math.random() * Math.PI * 2,
      layer: -1,
    });
  }

  // Create connections
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      const dx = ns[i].x - ns[j].x;
      const dy = ns[i].y - ns[j].y;
      const dz = ns[i].z - ns[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const threshold = (ns[i].layer === ns[j].layer) ? 55 : 45;
      if (dist < threshold && ns[i].connections.length < 6) {
        ns[i].connections.push(j);
        ns[j].connections.push(i);
      }
    }
  }

  return ns;
}

const HexBrainCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const glitchRef = useRef({ active: false, startTime: 0, intensity: 0 });

  const nodes = useMemo(() => generateBrainNodes(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    };
    canvas.addEventListener("mousemove", handleMouse);

    const draw = () => {
      timeRef.current += 0.008;
      const t = timeRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;

      // Glitch every 16 seconds
      const glitch = glitchRef.current;
      const cycleTime = t % 16;
      if (cycleTime < 0.8) {
        if (!glitch.active) {
          glitch.active = true;
          glitch.startTime = t;
          glitch.intensity = 0.6 + Math.random() * 0.4;
        }
      } else {
        glitch.active = false;
      }

      const glitchProgress = glitch.active ? (t - glitch.startTime) / 0.8 : 0;
      const glitchFade = glitch.active
        ? Math.sin(glitchProgress * Math.PI) * glitch.intensity
        : 0;

      ctx.clearRect(0, 0, w, h);

      // Glitch: horizontal slice displacement
      if (glitch.active && glitchFade > 0.1) {
        ctx.save();
        const slices = 3 + Math.floor(Math.random() * 4);
        for (let s = 0; s < slices; s++) {
          const sliceY = Math.random() * h;
          const sliceH = 2 + Math.random() * 15;
          const offset = (Math.random() - 0.5) * 40 * glitchFade;
          ctx.drawImage(canvas, 0, sliceY, w, sliceH, offset, sliceY, w, sliceH);
        }
        ctx.restore();
      }

      // Rotation
      const rotY = t * 0.3 + mouseRef.current.x * 0.5;
      const rotX = mouseRef.current.y * 0.3 + 0.1;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Glitch rotation jitter
      const jitterX = glitch.active ? (Math.random() - 0.5) * 3 * glitchFade : 0;
      const jitterY = glitch.active ? (Math.random() - 0.5) * 3 * glitchFade : 0;

      // Project nodes
      for (const node of nodes) {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        const y1 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;
        const scale = 400 / (400 + z2);
        node.px = cx + x1 * scale + jitterX;
        node.py = cy + y1 * scale + jitterY;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (const j of n.connections) {
          if (j <= i) continue;
          const m = nodes[j];
          const pulseVal = (Math.sin(t * 2 + n.pulse) + 1) * 0.5;
          const alpha = 0.06 + pulseVal * 0.12;

          const flowT = (t * 1.5 + n.pulse) % 1;

          ctx.beginPath();
          ctx.moveTo(n.px, n.py);
          ctx.lineTo(m.px, m.py);

          // Color by layer type
          let hue = 180;
          if (n.layer === -1 || m.layer === -1) hue = 260;
          else if (n.layer === 2 || m.layer === 2) hue = 200;
          else if (n.layer === 3 || m.layer === 3) hue = 320;
          else if (n.layer === 4 || m.layer === 4) hue = 220;

          // Glitch color shift
          const glitchHueShift = glitch.active ? Math.random() * 60 * glitchFade : 0;

          ctx.strokeStyle = `hsla(${hue + glitchHueShift}, 100%, 50%, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Signal dots
          if (Math.random() > 0.75) {
            const fx = n.px + (m.px - n.px) * flowT;
            const fy = n.py + (m.py - n.py) * flowT;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${pulseVal * 0.5})`;
            ctx.fill();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pulseVal = (Math.sin(t * 3 + node.pulse) + 1) * 0.5;
        const size = 1.2 + pulseVal * 1.2;
        const hue = node.layer === -1 ? 320 : node.layer === 2 ? 200 : node.layer === 3 ? 280 : 180;
        const glitchHue = glitch.active ? Math.random() * 40 * glitchFade : 0;

        // Glow
        ctx.beginPath();
        ctx.arc(node.px, node.py, size + 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + glitchHue}, 100%, 60%, ${pulseVal * 0.12})`;
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(node.px, node.py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + glitchHue}, 100%, ${60 + pulseVal * 30}%, ${0.4 + pulseVal * 0.6})`;
        ctx.fill();
      }

      // Glitch: RGB split overlay
      if (glitch.active && glitchFade > 0.2) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = glitchFade * 0.15;
        ctx.drawImage(canvas, -3 * glitchFade, 0);
        ctx.globalAlpha = glitchFade * 0.1;
        ctx.drawImage(canvas, 3 * glitchFade, 1);
        ctx.restore();
      }

      // Glitch: flash line
      if (glitch.active && Math.random() < 0.3) {
        const lineY = Math.random() * h;
        ctx.fillStyle = `hsla(180, 100%, 80%, ${glitchFade * 0.08})`;
        ctx.fillRect(0, lineY, w, 1 + Math.random() * 2);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
    };
  }, [nodes]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0"
      style={{ background: "transparent" }}
    />
  );
};

export default HexBrainCanvas;
