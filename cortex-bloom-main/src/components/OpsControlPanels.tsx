import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitPullRequest,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  Store,
  Upload,
  UserCog,
  Workflow,
} from "lucide-react";

const serviceCards = [
  { label: "Updater API", status: "Healthy", meta: "v0.4.3 • 99.98%", icon: RefreshCw },
  { label: "Ops Control API", status: "Healthy", meta: "queue 12 • p95 142ms", icon: Server },
  { label: "GitHub Agent", status: "Degraded", meta: "2 failed jobs • retrying", icon: GitPullRequest },
  { label: "Store/Data API", status: "Healthy", meta: "req/min 184 • 0.3% err", icon: Store },
];

const jobs = [
  { name: "PR triage sweep", schedule: "*/15 * * * *", last: "2m ago", result: "pass" },
  { name: "Updater telemetry heartbeat", schedule: "*/5 * * * *", last: "1m ago", result: "pass" },
  { name: "Error digest rollup", schedule: "0 */2 * * *", last: "47m ago", result: "warn" },
  { name: "Build artifact check", schedule: "*/30 * * * *", last: "6m ago", result: "pass" },
];

const recentActions = [
  "Published canary 0.4.3+12",
  "Rotated maintainer API token",
  "Queued GitHub review sweep",
  "Installer upload validated",
];

const Panel = ({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.65, ease: "easeOut" }}
    className="neon-border rounded-sm bg-card/65 backdrop-blur-sm p-4"
  >
    <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-3">{title}</p>
    {children}
  </motion.section>
);

const OpsControlPanels = () => {
  return (
    <div className="absolute inset-0 z-20 px-6 pt-20 pb-8 pointer-events-none">
      <div className="grid grid-cols-12 gap-4 h-full">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Panel title="Fleet Overview" delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serviceCards.map((service) => {
                const Icon = service.icon;
                const healthy = service.status === "Healthy";
                return (
                  <div key={service.label} className="border border-border/40 rounded-sm p-3 bg-background/35">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs tracking-wide">
                        <Icon className="w-3.5 h-3.5 text-primary/80" />
                        <span>{service.label}</span>
                      </div>
                      <span className={`text-[10px] ${healthy ? "text-emerald-300" : "text-amber-300"}`}>
                        {healthy ? "● OK" : "● WARN"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{service.meta}</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Updater + Agent Controls" delay={0.4}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs tracking-wider text-primary">Published Channels</div>
                <div className="text-[11px] space-y-1 text-muted-foreground">
                  <div>stable: 0.4.2 (Win x64)</div>
                  <div>canary: 0.4.3+12 (Win x64)</div>
                  <div>artifact hash: sha256:4bc9...9a71</div>
                </div>
                <div className="flex gap-3 text-[11px] text-primary/90">
                  <span className="inline-flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Upload Installer</span>
                  <span className="inline-flex items-center gap-1"><Workflow className="w-3.5 h-3.5" /> Publish Metadata</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xs tracking-wider text-primary">GitHub Agent Queue</div>
                <div className="text-[11px] space-y-1 text-muted-foreground">
                  <div>active tasks: 3</div>
                  <div>pending reviews: 7</div>
                  <div>CI failures triaged: 2</div>
                </div>
                <div className="flex gap-3 text-[11px] text-primary/90">
                  <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Restart</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Drain Queue</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Jobs + Schedule Health" delay={0.55}>
            <div className="grid grid-cols-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              <span>Job</span>
              <span>Schedule</span>
              <span>Last Run</span>
              <span>Status</span>
            </div>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.name} className="grid grid-cols-4 text-[11px] border border-border/30 bg-background/30 rounded-sm p-2">
                  <span className="truncate pr-2">{job.name}</span>
                  <span className="font-mono text-muted-foreground">{job.schedule}</span>
                  <span className="text-muted-foreground">{job.last}</span>
                  <span className={job.result === "pass" ? "text-emerald-300" : "text-amber-300"}>
                    {job.result === "pass" ? "PASS" : "WARN"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Security + Access" delay={0.35}>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="inline-flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary/80" /> Token hygiene</span>
                <span className="text-emerald-300">compliant</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="inline-flex items-center gap-2"><UserCog className="w-3.5 h-3.5 text-primary/80" /> Role scopes</span>
                <span className="text-amber-300">review due</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-primary/80" /> Backup age</span>
                <span className="text-primary">1h 12m</span>
              </div>
            </div>
          </Panel>

          <Panel title="Audit Stream" delay={0.5}>
            <div className="space-y-2 text-[11px] text-muted-foreground">
              {recentActions.map((item, idx) => (
                <div key={item} className="flex items-start gap-2">
                  {idx === 1 ? (
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-300" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-300" />
                  )}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default OpsControlPanels;
