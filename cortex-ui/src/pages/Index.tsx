import { motion } from "framer-motion";
import HexBrainCanvas from "@/components/HexBrainCanvas";
import HUDOverlay from "@/components/HUDOverlay";
import SatelliteMesh from "@/components/SatelliteMesh";
import OpsControlPanels from "@/components/OpsControlPanels";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background hex-grid-bg scanlines">
      {/* Radial void gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(var(--void)) 80%)",
        }}
      />

      {/* Brain visualization */}
      <div className="absolute inset-0">
        <HexBrainCanvas />
      </div>

      {/* HUD */}
      <HUDOverlay />

      {/* Ops Dashboard Panels */}
      <OpsControlPanels />

      {/* Satellite Mesh Network */}
      <SatelliteMesh />

      {/* Header title */}
      <div className="relative z-10 flex justify-center pt-8 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center"
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-2xl md:text-4xl font-display font-bold tracking-[0.3em] text-glow text-primary"
          >
            CARAPACE OPS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="text-[10px] md:text-xs text-muted-foreground tracking-[0.45em] uppercase font-mono mt-1"
          >
            Unified Infrastructure Control Plane
          </motion.p>
        </motion.div>
      </div>

      {/* Ambient glow spots */}
      <div
        className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--primary))" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--neon-accent))" }}
      />
    </div>
  );
};

export default Index;
