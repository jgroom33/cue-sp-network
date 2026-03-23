// Educational mode types for packet flow visualization

export interface MplsLabel {
  value: number;
  ttl: number;
  tc: number;
  bottom: boolean;
  purpose: string; // e.g., "Transport (Node SID 16002)", "VPN Label", "Adj-SID"
}

export interface PacketHeaders {
  ethernet?: {
    srcMac: string;
    dstMac: string;
    etherType: string;
    sVlan?: number;
    cVlan?: number;
  };
  mpls?: MplsLabel[];
  ip?: {
    src: string;
    dst: string;
    ttl: number;
    dscp: string;
    protocol: string;
  };
  vxlan?: {
    outerSrcIp: string;
    outerDstIp: string;
    outerSrcPort: number;
    outerDstPort: number;
    vni: number;
  };
  pseudowire?: {
    pwLabel: number;
    controlWord: boolean;
  };
}

export type PacketAction =
  | { type: "mpls-push"; label: MplsLabel }
  | { type: "mpls-swap"; from: number; to: number }
  | { type: "mpls-pop"; label: number }
  | { type: "vxlan-encap"; vni: number; outerDst: string }
  | { type: "vxlan-decap" }
  | { type: "qinq-push"; svlan: number }
  | { type: "ttl-decrement"; from: number; to: number }
  | { type: "qos-classify"; dscp: string; fwdClass: string }
  | { type: "qos-police"; result: "conform" | "exceed"; action: string }
  | { type: "ip-lookup"; result: string }
  | { type: "php-pop"; label: number }
  | { type: "vpn-label-pop"; label: number }
  | { type: "forward"; outInterface: string };

export interface PacketState {
  hop: number;
  device: string;
  ingressInterface: string;
  egressInterface: string;
  headers: PacketHeaders;
  actions: PacketAction[];
  qosClass?: string;
  qosAction?: string;
  annotation?: string; // Educational explanation for this hop
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: "l3vpn" | "l2vpn" | "vxlan" | "sr-te" | "bgp" | "tilfa" | "internet";
  icon: string;
  color: string;
  concepts: string[];
  initialDscp?: string;
  // Path hints — the engine uses these to compute the actual path
  sourceDevice: string;
  destDevice: string;
  explicitPath?: string[]; // For SR-TE or forced paths
  overlayType?: "l3vpn" | "vxlan" | "l2vpn" | "internet";
}

export interface ComputedScenario {
  definition: ScenarioDefinition;
  path: string[];             // Ordered device names
  pathLinks: PathLink[];      // Links between hops
  packetStates: PacketState[];
}

export interface PathLink {
  source: string;
  target: string;
  sourceInterface: string;
  targetInterface: string;
}

export type AnimationSpeed = 0.5 | 1 | 2 | 4;

export interface AnimationState {
  playing: boolean;
  currentHop: number;
  speed: AnimationSpeed;
  progress: number; // 0-1, interpolation between hops
}

export interface WhatIfState {
  disabledLinks: Set<string>; // "device1::device2" format
  active: boolean;
}

export interface EducationalState {
  activeScenario: ComputedScenario | null;
  animation: AnimationState;
  whatIf: WhatIfState;
  showQoS: boolean;
  showOverlay: boolean;
}

export type EducationalAction =
  | { type: "SET_SCENARIO"; scenario: ComputedScenario | null }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "STEP_FORWARD" }
  | { type: "STEP_BACKWARD" }
  | { type: "SET_HOP"; hop: number }
  | { type: "SET_SPEED"; speed: AnimationSpeed }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "TOGGLE_LINK"; linkKey: string }
  | { type: "TOGGLE_WHAT_IF" }
  | { type: "TOGGLE_QOS" }
  | { type: "TOGGLE_OVERLAY" }
  | { type: "RESET" };

export function educationalReducer(
  state: EducationalState,
  action: EducationalAction
): EducationalState {
  switch (action.type) {
    case "SET_SCENARIO":
      return {
        ...state,
        activeScenario: action.scenario,
        animation: { playing: false, currentHop: 0, speed: 1, progress: 0 },
      };
    case "PLAY":
      return { ...state, animation: { ...state.animation, playing: true } };
    case "PAUSE":
      return { ...state, animation: { ...state.animation, playing: false } };
    case "STEP_FORWARD": {
      const maxHop = state.activeScenario
        ? state.activeScenario.packetStates.length - 1
        : 0;
      const next = Math.min(state.animation.currentHop + 1, maxHop);
      return {
        ...state,
        animation: { ...state.animation, currentHop: next, progress: 0, playing: false },
      };
    }
    case "STEP_BACKWARD": {
      const prev = Math.max(state.animation.currentHop - 1, 0);
      return {
        ...state,
        animation: { ...state.animation, currentHop: prev, progress: 0, playing: false },
      };
    }
    case "SET_HOP":
      return {
        ...state,
        animation: { ...state.animation, currentHop: action.hop, progress: 0 },
      };
    case "SET_SPEED":
      return {
        ...state,
        animation: { ...state.animation, speed: action.speed },
      };
    case "SET_PROGRESS":
      return {
        ...state,
        animation: { ...state.animation, progress: action.progress },
      };
    case "TOGGLE_LINK": {
      const newDisabled = new Set(state.whatIf.disabledLinks);
      if (newDisabled.has(action.linkKey)) {
        newDisabled.delete(action.linkKey);
      } else {
        newDisabled.add(action.linkKey);
      }
      return {
        ...state,
        whatIf: { ...state.whatIf, disabledLinks: newDisabled },
      };
    }
    case "TOGGLE_WHAT_IF":
      return {
        ...state,
        whatIf: { ...state.whatIf, active: !state.whatIf.active },
      };
    case "TOGGLE_QOS":
      return { ...state, showQoS: !state.showQoS };
    case "TOGGLE_OVERLAY":
      return { ...state, showOverlay: !state.showOverlay };
    case "RESET":
      return initialEducationalState;
    default:
      return state;
  }
}

export const initialEducationalState: EducationalState = {
  activeScenario: null,
  animation: { playing: false, currentHop: 0, speed: 1, progress: 0 },
  whatIf: { disabledLinks: new Set(), active: false },
  showQoS: false,
  showOverlay: true,
};
