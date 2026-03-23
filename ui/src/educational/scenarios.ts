import type { ScenarioDefinition } from "./types";

export const scenarios: ScenarioDefinition[] = [
  // ═══════════════════════════════════════
  // Getting Started
  // ═══════════════════════════════════════
  {
    id: "simple-ip-forwarding",
    name: "Simple IP Forwarding",
    shortName: "IP Fwd",
    description:
      "A basic IP packet travels from a customer device through the aggregation layer to the PE router. No MPLS labels, no overlays — just hop-by-hop IP forwarding with TTL decrement and MAC rewrite at each hop. Start here to understand the fundamentals.",
    category: "l3vpn", // reuse l3vpn category for styling
    group: "getting-started",
    icon: "📡",
    color: "#22c55e",
    concepts: [
      "IP forwarding (hop-by-hop)",
      "TTL decrement",
      "MAC address rewrite",
      "Routing table lookup",
      "Layer 2 vs Layer 3",
    ],
    initialDscp: "be",
    sourceDevice: "ce2",
    destDevice: "pe1",
  },

  // ═══════════════════════════════════════
  // SP Core
  // ═══════════════════════════════════════
  {
    id: "l3vpn-ce-to-ce",
    name: "L3VPN CE-to-CE",
    shortName: "L3VPN",
    description:
      "Customer traffic from CE3 traverses the aggregation and MPLS backbone to reach CE2. The full path CE → AGG → PE → P → P → PE → AGG → CE shows the two-label stack (VPN + transport) pushed at ingress PE, swapped at P routers, and popped (PHP) at egress PE.",
    category: "l3vpn",
    group: "sp-core",
    icon: "🏷️",
    color: "#3b82f6",
    concepts: [
      "MPLS label push/swap/pop",
      "VPN + Transport label stack",
      "Penultimate Hop Popping (PHP)",
      "VRF route lookup",
      "SR-MPLS forwarding",
    ],
    initialDscp: "ef",
    sourceDevice: "ce3",
    destDevice: "ce2",
    overlayType: "l3vpn",
  },
  {
    id: "sr-te-low-latency",
    name: "SR-TE Low-Latency Path",
    shortName: "SR-TE",
    description:
      "An SR-TE policy steers traffic along an explicit path using a segment list (stack of Node SIDs). Instead of following the IGP shortest path, the packet is guided hop-by-hop through the specified nodes.",
    category: "sr-te",
    group: "sp-core",
    icon: "🎯",
    color: "#ec4899",
    concepts: [
      "Segment Routing Traffic Engineering",
      "Explicit segment list",
      "Node SID resolution",
      "Binding SID",
      "IGP vs engineered path",
    ],
    sourceDevice: "pe1",
    destDevice: "pe2",
    explicitPath: ["pe1", "p1", "pe2"],
    overlayType: "l3vpn",
  },
  {
    id: "bgp-route-reflection",
    name: "BGP Route Reflection",
    shortName: "BGP RR",
    description:
      "An iBGP UPDATE message flows from PE1 to route reflector RR1, which reflects it to PE2. This solves the iBGP full-mesh scaling problem. Watch the BGP attributes (next-hop, AS-path, communities) as the UPDATE traverses the network.",
    category: "bgp",
    group: "sp-core",
    icon: "🔄",
    color: "#f59e0b",
    concepts: [
      "iBGP full mesh problem",
      "Route reflector client",
      "NEXT_HOP preservation",
      "Cluster ID loop prevention",
      "BGP UPDATE message flow",
    ],
    sourceDevice: "pe1",
    destDevice: "pe2",
    explicitPath: ["pe1", "rr1", "pe2"],
  },
  {
    id: "tilfa-failover",
    name: "TI-LFA Failover",
    shortName: "TI-LFA",
    description:
      "When the primary pe1→p1 link fails, TI-LFA provides sub-50ms protection by pre-computing a backup path. The packet is re-routed through an alternate path with a repair segment list, then converges to the new IGP shortest path.",
    category: "tilfa",
    group: "sp-core",
    icon: "🛡️",
    color: "#ef4444",
    concepts: [
      "Topology-Independent LFA",
      "Pre-computed backup path",
      "Repair segment (Node SID)",
      "Sub-50ms convergence",
      "Post-convergence path",
    ],
    sourceDevice: "pe1",
    destDevice: "pe2",
    overlayType: "l3vpn",
  },
  {
    id: "internet-transit",
    name: "Internet Transit via ASBR",
    shortName: "Internet",
    description:
      "Customer traffic destined for the internet exits the SP network via an ASBR peering with the upstream ISP. Watch the eBGP next-hop change at the AS boundary, and how the MPLS domain terminates at the ASBR.",
    category: "internet",
    group: "sp-core",
    icon: "🌐",
    color: "#06b6d4",
    concepts: [
      "eBGP peering at AS boundary",
      "AS-path prepending",
      "Next-hop change at ASBR",
      "MPLS domain boundary",
      "Transit routing",
    ],
    initialDscp: "be",
    sourceDevice: "ce2",
    destDevice: "isp-upstream",
    overlayType: "internet",
  },

  // ═══════════════════════════════════════
  // Data Center
  // ═══════════════════════════════════════
  {
    id: "vxlan-ingress-replication",
    name: "VXLAN Ingress Replication",
    shortName: "VXLAN",
    description:
      "Layer 2 traffic between VXLAN VTEPs is encapsulated with a VXLAN header (VNI), UDP, and outer IP header. The original Ethernet frame rides inside the tunnel, enabling L2 extension across the IP fabric.",
    category: "vxlan",
    group: "data-center",
    icon: "🔀",
    color: "#8b5cf6",
    concepts: [
      "VXLAN encapsulation/decapsulation",
      "VNI (Virtual Network Identifier)",
      "VTEP source/destination IPs",
      "Outer IP + UDP headers",
      "Ingress replication (BUM traffic)",
    ],
    sourceDevice: "pe1",
    destDevice: "pe2",
    overlayType: "vxlan",
  },

  // ═══════════════════════════════════════
  // MEF Services
  // ═══════════════════════════════════════
  {
    id: "l2vpn-pseudowire",
    name: "L2VPN Pseudowire (VPWS)",
    shortName: "L2VPN PW",
    description:
      "A point-to-point Ethernet pseudowire carries Layer 2 frames transparently between CE1 and CE4 via provider-owned NIDs. The NIDs perform MEF UNI functions (bandwidth profiling, CoS mapping, S-VLAN tagging) before the frame enters the MPLS core.",
    category: "l2vpn",
    group: "mef-services",
    icon: "🔗",
    color: "#14b8a6",
    concepts: [
      "Pseudowire encapsulation",
      "PW label + Transport label stack",
      "MEF UNI bandwidth profile",
      "S-VLAN tagging at NID",
      "Service OAM (Y.1731)",
    ],
    sourceDevice: "ce1",
    destDevice: "ce4",
    overlayType: "l2vpn",
  },
  {
    id: "mef-enni-enni",
    name: "ENNI-ENNI E-Line",
    shortName: "ENNI-ENNI",
    description:
      "An inter-carrier E-Line service crosses the operator boundary via ENNI devices. Each carrier's ENNI performs S-VLAN translation at the handoff point, with OAM demarcation at a lower MD level (L2) than UNI OAM (L4).",
    category: "mef",
    group: "mef-services",
    icon: "🔄",
    color: "#f97316",
    concepts: [
      "ENNI inter-carrier handoff",
      "S-VLAN translation",
      "OAM MD level demarcation",
      "Carrier boundary",
      "MEF E-Line service",
    ],
    sourceDevice: "enni1",
    destDevice: "enni2",
    explicitPath: ["enni1", "pe1", "pe2", "enni2"],
    overlayType: "l2vpn",
  },
  {
    id: "mef-enni-uni",
    name: "ENNI-UNI E-Line",
    shortName: "ENNI→UNI",
    description:
      "A wholesale E-Line ingresses at the ENNI (from a partner carrier) and delivers to a retail customer at the UNI (NID2). The ENNI performs carrier-boundary policing while the UNI NID handles last-mile bandwidth profiling and CoS mapping.",
    category: "mef",
    group: "mef-services",
    icon: "↗️",
    color: "#f97316",
    concepts: [
      "Wholesale ENNI ingress",
      "Retail UNI delivery",
      "Asymmetric service endpoints",
      "Carrier-boundary policing",
      "Last-mile bandwidth profile",
    ],
    sourceDevice: "enni1",
    destDevice: "ce4",
    explicitPath: ["enni1", "pe1", "pe2", "nid2", "ce4"],
    overlayType: "l2vpn",
  },
  {
    id: "mef-all-to-one",
    name: "All-to-One Bundling",
    shortName: "All→1",
    description:
      "All customer C-VLANs (10, 20, 30) are mapped to a single EVC and carried over one S-VLAN. The NID strips individual VLAN tags and applies a single service tag — simplest MEF bundling model.",
    category: "mef",
    group: "mef-services",
    icon: "📦",
    color: "#a855f7",
    concepts: [
      "All-to-One bundling (MEF 10.4)",
      "Multiple C-VLANs → single EVC",
      "Single S-VLAN tag",
      "Simplified service mapping",
      "Port-based EVC",
    ],
    sourceDevice: "ce1",
    destDevice: "ce4",
    overlayType: "l2vpn",
    bundlingType: "all-to-one",
  },
  {
    id: "mef-many-to-one",
    name: "Many-to-One Bundling",
    shortName: "N→1",
    description:
      "Customer C-VLANs are grouped into multiple EVCs: VLANs 10+20 → EVC-A (S-VLAN 100), VLAN 30 → EVC-B (S-VLAN 200). The NID selectively maps VLANs to service instances, enabling differentiated treatment per VLAN group.",
    category: "mef",
    group: "mef-services",
    icon: "📦",
    color: "#a855f7",
    concepts: [
      "Many-to-One bundling (MEF 10.4)",
      "Selective C-VLAN grouping",
      "Multiple EVCs per UNI",
      "S-VLAN per service group",
      "Differentiated VLAN treatment",
    ],
    sourceDevice: "ce1",
    destDevice: "ce4",
    overlayType: "l2vpn",
    bundlingType: "many-to-one",
  },
  {
    id: "mef-one-to-one",
    name: "1:1 VLAN Bundling",
    shortName: "1:1",
    description:
      "Each customer C-VLAN maps to its own dedicated EVC: VLAN 10 → S-VLAN 100, VLAN 20 → S-VLAN 200, VLAN 30 → S-VLAN 300. Maximum isolation — each VLAN gets independent bandwidth profiling and OAM.",
    category: "mef",
    group: "mef-services",
    icon: "📦",
    color: "#a855f7",
    concepts: [
      "1:1 VLAN bundling (MEF 10.4)",
      "One C-VLAN → one EVC",
      "Per-VLAN S-VLAN mapping",
      "Independent bandwidth profiles",
      "Per-EVC OAM",
    ],
    sourceDevice: "ce1",
    destDevice: "ce4",
    overlayType: "l2vpn",
    bundlingType: "one-to-one",
  },
];

export const scenarioGroups: { id: string; label: string }[] = [
  { id: "getting-started", label: "Getting Started" },
  { id: "sp-core", label: "SP Core" },
  { id: "data-center", label: "Data Center" },
  { id: "mef-services", label: "MEF Services" },
];
