import { motion } from "framer-motion";

const HUDOverlay = () => {
  const stats = [
    { label: "ENVIRONMENT", value: "PRODUCTION", color: "primary" },
    { label: "INCIDENT STATE", value: "NO ACTIVE P1", color: "primary" },
    { label: "FLEET UPTIME", value: "99.98%", color: "primary" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top left corner markers */}
      <div className="absolute top-6 left-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="space-y-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-neon" />
              <div>
                <div className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase">
                  {stat.label}
                </div>
                <div className="text-xs text-primary font-display tracking-wider">
                  {stat.value}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom right data stream */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 right-6 text-right"
      >
        <div className="text-[9px] text-muted-foreground tracking-[0.2em] font-mono space-y-1">
          <div>OPS.CONTROL.v0.1</div>
          <div className="text-primary/40">STORE::OPS SPLIT ACTIVE</div>
          <div className="text-neon-accent/40">AUDIT::ENABLED</div>
        </div>
      </motion.div>

      {/* Top right corner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-6 right-6"
      >
        <div className="neon-border px-3 py-1.5 rounded-sm">
          <div className="text-[10px] text-primary tracking-[0.3em] font-display">
OPS.CARAPACEAI.ORG
          </div>
        </div>
      </motion.div>

      {/* Corner brackets */}
      <svg className="absolute top-4 left-4 w-6 h-6 text-primary/30">
        <path d="M0 20 L0 0 L20 0" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="absolute top-4 right-4 w-6 h-6 text-primary/30">
        <path d="M24 0 L24 20" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M4 0 L24 0" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="absolute bottom-4 left-4 w-6 h-6 text-primary/30">
        <path d="M0 4 L0 24 L20 24" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg className="absolute bottom-4 right-4 w-6 h-6 text-primary/30">
        <path d="M24 4 L24 24 L4 24" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default HUDOverlay;
