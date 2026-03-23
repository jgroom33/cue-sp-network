import type { PacketState, PacketAction } from "../types";

interface Props {
  state: PacketState;
}

export function PacketInspector({ state }: Props) {
  return (
    <div className="px-3 py-2 border-b border-gray-700">
      {/* Device + interfaces */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-white">{state.device}</span>
        {state.ingressInterface && (
          <span className="text-[10px] text-gray-500">
            in: {state.ingressInterface}
          </span>
        )}
        {state.egressInterface && (
          <>
            <span className="text-[10px] text-gray-600">→</span>
            <span className="text-[10px] text-gray-500">
              out: {state.egressInterface}
            </span>
          </>
        )}
      </div>

      {/* Actions list */}
      {state.actions.length > 0 && (
        <div className="space-y-1 mb-2">
          {state.actions.map((action, i) => (
            <ActionBadge key={i} action={action} />
          ))}
        </div>
      )}

      {/* QoS info */}
      {state.qosClass && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-gray-500">QoS:</span>
          <span
            className={`px-1.5 py-0.5 rounded ${qosColor(state.qosClass)}`}
          >
            {state.qosClass}
          </span>
          {state.qosAction && (
            <span className="text-gray-500">→ {state.qosAction}</span>
          )}
        </div>
      )}

      {/* Annotation */}
      {state.annotation && (
        <div className="mt-2 p-2 rounded bg-blue-900/20 border border-blue-800/50 text-[11px] text-blue-200 leading-relaxed">
          {state.annotation}
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: PacketAction }) {
  const { icon, text, color } = formatAction(action);
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded ${color}`}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function formatAction(action: PacketAction): {
  icon: string;
  text: string;
  color: string;
} {
  switch (action.type) {
    case "mpls-push":
      return {
        icon: "↓",
        text: `Push MPLS ${action.label.value} (${action.label.purpose})`,
        color: "bg-purple-900/40 text-purple-200",
      };
    case "mpls-swap":
      return {
        icon: "⇄",
        text: `Swap MPLS ${action.from} → ${action.to}`,
        color: "bg-purple-900/30 text-purple-300",
      };
    case "mpls-pop":
      return {
        icon: "↑",
        text: `Pop MPLS ${action.label}`,
        color: "bg-purple-800/30 text-purple-300",
      };
    case "php-pop":
      return {
        icon: "↑",
        text: `PHP Pop MPLS ${action.label} (penultimate hop)`,
        color: "bg-orange-900/30 text-orange-300",
      };
    case "vpn-label-pop":
      return {
        icon: "↑",
        text: `Pop VPN Label ${action.label}`,
        color: "bg-blue-900/30 text-blue-300",
      };
    case "vxlan-encap":
      return {
        icon: "⊕",
        text: `VXLAN Encap VNI:${action.vni} → ${action.outerDst}`,
        color: "bg-indigo-900/30 text-indigo-300",
      };
    case "vxlan-decap":
      return {
        icon: "⊖",
        text: "VXLAN Decap (strip outer headers)",
        color: "bg-indigo-800/30 text-indigo-300",
      };
    case "qinq-push":
      return {
        icon: "↓",
        text: `Push S-VLAN ${action.svlan}`,
        color: "bg-teal-900/30 text-teal-300",
      };
    case "qinq-pop":
      return {
        icon: "↑",
        text: `Pop S-VLAN ${action.svlan}`,
        color: "bg-teal-800/30 text-teal-300",
      };
    case "mef-police":
      return {
        icon: action.result === "conform" ? "✓" : "!",
        text: `MEF BW Profile: CIR ${action.cir} — ${action.result} → ${action.action}`,
        color:
          action.result === "conform"
            ? "bg-green-900/20 text-green-400"
            : "bg-yellow-900/20 text-yellow-400",
      };
    case "cos-map":
      return {
        icon: "◇",
        text: `CoS Map: ${action.from} → ${action.to}`,
        color: "bg-yellow-900/30 text-yellow-300",
      };
    case "ttl-decrement":
      return {
        icon: "−",
        text: `TTL ${action.from} → ${action.to}`,
        color: "bg-gray-800/50 text-gray-400",
      };
    case "qos-classify":
      return {
        icon: "◆",
        text: `Classify DSCP ${action.dscp} → "${action.fwdClass}"`,
        color: "bg-green-900/30 text-green-300",
      };
    case "qos-police":
      return {
        icon: action.result === "conform" ? "✓" : "!",
        text: `Police: ${action.result} → ${action.action}`,
        color:
          action.result === "conform"
            ? "bg-green-900/20 text-green-400"
            : "bg-yellow-900/20 text-yellow-400",
      };
    case "ip-lookup":
      return {
        icon: "⊳",
        text: action.result,
        color: "bg-blue-900/20 text-blue-300",
      };
    case "forward":
      return {
        icon: "→",
        text: `Forward out ${action.outInterface}`,
        color: "bg-gray-800/40 text-gray-300",
      };
    default:
      return { icon: "•", text: JSON.stringify(action), color: "text-gray-400" };
  }
}

function qosColor(cls: string): string {
  switch (cls) {
    case "voice":
      return "bg-red-900/40 text-red-300";
    case "video":
      return "bg-orange-900/40 text-orange-300";
    case "critical-data":
      return "bg-yellow-900/40 text-yellow-300";
    case "bulk-data":
      return "bg-blue-900/40 text-blue-300";
    case "network-control":
      return "bg-purple-900/40 text-purple-300";
    default:
      return "bg-gray-700/40 text-gray-300";
  }
}
