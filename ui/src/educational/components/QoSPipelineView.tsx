import type { Device } from "../../types";
import type { PacketState } from "../types";

interface Props {
  state: PacketState;
  config?: Device;
}

export function QoSPipelineView({ state, config }: Props) {
  const qos = config?.qos_config;
  if (!qos?.enabled) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500">
        QoS not configured on {state.device}
      </div>
    );
  }

  const dscp = state.headers.ip?.dscp ?? "be";
  const fwdClass = state.qosClass ?? "best-effort";

  // Find matching forwarding class
  const fc = qos.forwarding_classes?.find((f) => f.name === fwdClass);
  const queueId = fc?.queue_id ?? 0;

  // Find ingress/egress policies (cast to any — the runtime JSON has richer
  // structure than the current TypeScript interface covers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ingressPolicy = qos.policies?.find((p) => p.type === "ingress") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const egressPolicy = qos.policies?.find((p) => p.type === "egress") as any;

  // Find policer
  const policer = ingressPolicy?.policers?.[0] as
    | { name: string; type: string; cir: number; pir?: number }
    | undefined;

  // Find scheduler for this queue
  const scheduler = (egressPolicy?.schedulers as
    | { queue_id: number; type: string; priority?: number; weight?: number; bandwidth_percent?: number }[]
    | undefined
  )?.find((s) => s.queue_id === queueId);

  // Find WRED profile
  const wredProfile = (egressPolicy?.wred_profiles as
    | { name: string; min_threshold: number; max_threshold: number; drop_probability: number; dscp_match?: string[] }[]
    | undefined
  )?.find((w) => w.dscp_match?.includes(dscp));

  return (
    <div className="px-3 py-2 space-y-2">
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        QoS Pipeline — {state.device}
      </h4>

      {/* Classification */}
      <PipelineStage
        title="Classification"
        color="bg-blue-900/30 border-blue-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-300">DSCP {dscp}</span>
          <Arrow />
          <span className="text-white font-semibold">"{fwdClass}"</span>
          <span className="text-gray-500 text-[10px]">(Queue {queueId})</span>
        </div>
      </PipelineStage>

      <ArrowDown />

      {/* Policing */}
      <PipelineStage
        title="Policing"
        color="bg-green-900/30 border-green-800"
      >
        {policer ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400">{policer.name}</span>
              <span className="text-[10px] text-gray-500">
                ({policer.type})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px]">
                CIR: {formatRate(policer.cir)}
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-[10px]">
                PIR: {formatRate(policer.pir)}
              </span>
            </div>
            {/* Rate bar */}
            <div className="mt-1 h-2 bg-gray-700 rounded overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: "60%" }} />
              <div className="bg-yellow-500 h-full" style={{ width: "20%" }} />
              <div className="bg-gray-600 h-full" style={{ width: "20%" }} />
            </div>
            <div className="flex justify-between text-[9px] mt-0.5">
              <span className="text-green-400">CONFORM → transmit</span>
              <span className="text-yellow-400">EXCEED → remark</span>
              <span className="text-red-400">VIOLATE → drop</span>
            </div>
          </div>
        ) : (
          <span className="text-gray-500 text-[10px]">No policer applied</span>
        )}
      </PipelineStage>

      <ArrowDown />

      {/* Queuing & Scheduling */}
      <PipelineStage
        title="Queuing & Scheduling"
        color="bg-purple-900/30 border-purple-800"
      >
        {scheduler ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-purple-300">
                Queue {scheduler.queue_id}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  scheduler.type === "strict-priority"
                    ? "bg-red-900/40 text-red-300"
                    : "bg-blue-900/40 text-blue-300"
                }`}
              >
                {scheduler.type === "strict-priority"
                  ? `Strict Priority ${scheduler.priority !== undefined ? `(P${scheduler.priority})` : ""}`
                  : `WFQ ${scheduler.bandwidth_percent}%`}
              </span>
            </div>
            {scheduler.type === "strict-priority" && (
              <span className="text-[10px] text-gray-500 block mt-0.5">
                Served before weighted-fair queues
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500 text-[10px]">
            Queue {queueId} — default scheduling
          </span>
        )}
      </PipelineStage>

      {/* WRED */}
      {wredProfile && (
        <>
          <ArrowDown />
          <PipelineStage
            title="WRED (Congestion Avoidance)"
            color="bg-orange-900/30 border-orange-800"
          >
            <div className="text-[10px]">
              <span className="text-orange-300">{wredProfile.name}</span>
              <span className="text-gray-500 ml-2">
                Min: {wredProfile.min_threshold}% | Max:{" "}
                {wredProfile.max_threshold}% | Drop:{" "}
                {wredProfile.drop_probability}%
              </span>
            </div>
          </PipelineStage>
        </>
      )}
    </div>
  );
}

function PipelineStage({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded p-2 border ${color}`}>
      <div className="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">
        {title}
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
}

function Arrow() {
  return <span className="text-gray-600">→</span>;
}

function ArrowDown() {
  return (
    <div className="flex justify-center">
      <span className="text-gray-600 text-xs">↓</span>
    </div>
  );
}

function formatRate(kbps: number | undefined): string {
  if (!kbps) return "—";
  if (kbps >= 1000000) return `${(kbps / 1000000).toFixed(0)} Gbps`;
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(0)} Mbps`;
  return `${kbps} Kbps`;
}
