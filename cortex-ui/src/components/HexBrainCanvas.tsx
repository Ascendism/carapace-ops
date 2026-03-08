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

const HexBrainCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  const nodes = useMemo(() => {
    const ns: Node[] = [];
    const layers = 6;
    const nodesPerLayer = 24;

    for (let l = 0; l < layers; l++) {
      const layerRadius = 120 + l * 30 - Math.abs(l - layers / 2) * 15;
      for (let i = 0; i < nodesPerLayer; i++) {
        const angle = (i / nodesPerLayer) * Math.PI * 2 + l * 0.3;
        const yOffset = (l - layers / 2) * 50;
        const wobble = Math.sin(angle * 3) * 15;

        ns.push({
          x: Math.cos(angle) * (layerRadius + wobble),
          y: yOffset + Math.sin(angle * 2) * 20,
          z: Math.sin(angle) * (layerRadius + wobble),
          px: 0,
          py: 0,
          connections: [],
          pulse: Math.random() * Math.PI * 2,
          layer: l,
        });
      }
    }

    // Create connections - hexagonal-ish mesh
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const dz = ns[i].z - ns[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 90) {
          ns[i].connections.push(j);
          ns[j].connections.push(i);
        }
      }
    }

    // Add cortex surface nodes
    for (let i = 0; i < 40; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 160 + Math.random() * 30;
      ns.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: (r * Math.cos(phi)) * 0.7,
        z: r * Math.sin(phi) * Math.sin(theta),
        px: 0,
        py: 0,
        connections: [],
        pulse: Math.random() * Math.PI * 2,
        layer: -1,
      });
    }

    // Connect surface nodes
    for (let i = layers * nodesPerLayer; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const dz = ns[i].z - ns[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 110) {
          ns[i].connections.push(j);
        }
      }
      // Connect to inner nodes
      let closest = -1;
      let closestDist = Infinity;
      for (let j = 0; j < layers * nodesPerLayer; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const dz = ns[i].z - ns[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          closest = j;
        }
      }
      if (closest >= 0) ns[i].connections.push(closest);
    }

    return ns;
  }, []);

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

      ctx.clearRect(0, 0, w, h);

      // Rotation
      const rotY = t * 0.3 + mouseRef.current.x * 0.5;
      const rotX = mouseRef.current.y * 0.3;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project nodes
      for (const node of nodes) {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        const y1 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;
        const scale = 400 / (400 + z2);
        node.px = cx + x1 * scale;
        node.py = cy + y1 * scale;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (const j of n.connections) {
          if (j <= i) continue;
          const m = nodes[j];

          const pulseVal = (Math.sin(t * 2 + n.pulse) + 1) * 0.5;
          const alpha = 0.08 + pulseVal * 0.15;

          // Signal flowing along edge
          const flowT = (t * 1.5 + n.pulse) % 1;

          ctx.beginPath();
          ctx.moveTo(n.px, n.py);
          ctx.lineTo(m.px, m.py);

          if (n.layer === -1) {
            ctx.strokeStyle = `hsla(260, 100%, 65%, ${alpha})`;
          } else {
            ctx.strokeStyle = `hsla(180, 100%, 50%, ${alpha})`;
          }
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Flowing signal dot
          if (Math.random() > 0.7) {
            const fx = n.px + (m.px - n.px) * flowT;
            const fy = n.py + (m.py - n.py) * flowT;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(180, 100%, 70%, ${pulseVal * 0.6})`;
            ctx.fill();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pulseVal = (Math.sin(t * 3 + node.pulse) + 1) * 0.5;
        const size = 1.5 + pulseVal * 1.5;

        // Glow
        ctx.beginPath();
        ctx.arc(node.px, node.py, size + 4, 0, Math.PI * 2);
        const hue = node.layer === -1 ? 320 : 180;
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${pulseVal * 0.15})`;
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(node.px, node.py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${60 + pulseVal * 30}%, ${0.4 + pulseVal * 0.6})`;
        ctx.fill();
      }

      // Draw hexagonal overlay hints
      const hexSize = 30;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.1;
        const nextAngle = ((i + 1) / 6) * Math.PI * 2 + t * 0.1;
        const r = 220 + Math.sin(t + i) * 10;
        const x1 = cx + Math.cos(angle) * r;
        const y1 = cy + Math.sin(angle) * r * 0.4;
        const x2 = cx + Math.cos(nextAngle) * r;
        const y2 = cy + Math.sin(nextAngle) * r * 0.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(180, 100%, 50%, ${0.06 + Math.sin(t + i) * 0.03})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
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
