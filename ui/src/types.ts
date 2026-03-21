// TypeScript interfaces matching CUE export structure

export type DeviceRole = "PE" | "P" | "RR" | "AGG" | "ASBR" | "CE" | "PCE" | "EXTERNAL";
export type LinkType = "core" | "edge" | "customer" | "peering";
export type OverlayType = "ibgp" | "ebgp" | "sr-sids" | "link-ips" | "loopbacks";

export interface OverlayLink {
  source: string;
  target: string;
  type: "ibgp" | "ebgp";
  peerGroup?: string;
  addressFamilies: string[];
  isRRClient: boolean;
  sourceLoopback: string;
  targetLoopback: string;
}

export interface SRLabel {
  nodeSid: number;
  srgbStart: number;
  adjSids: { label: number; iface: string; neighbor: string }[];
}

export interface OverlayData {
  bgpLinks: OverlayLink[];
  srLabels: Record<string, SRLabel>;
  linkAddresses: Record<string, { aIp: string; zIp: string }>;
}

export interface NetworkData {
  network: {
    topo: Topology;
    device_configs: Record<string, Device>;
  };
}

export interface Topology {
  devices: string[];
  device_roles: Record<string, DeviceRole>;
  links: Link[];
  loopbacks: Record<string, string>;
  vtep_loopbacks: Record<string, string>;
  p2p_subnets: Record<string, string>;
  customer_subnets: Record<string, string>;
  management_subnet: string;
  sp_asn: number;
  ce1_asn: number;
  upstream_asn: number;
  isis_area: string;
}

export interface Link {
  a_end: LinkEnd;
  z_end: LinkEnd;
  type: LinkType;
  metric?: number;
}

export interface LinkEnd {
  device: string;
  interface: string;
}

export interface Interface {
  name: string;
  description: string;
  enabled: boolean;
  mtu: number;
  ipv4?: string;
  ipv6?: string;
  type: "loopback" | "physical" | "lag" | "subinterface";
}

export interface Device {
  hostname: string;
  role: DeviceRole;
  router_id: string;
  interfaces: Interface[];
  mgmt_vrf?: ManagementVRF;
  isis_config?: ISISConfig;
  sr_config?: SRConfig;
  bgp_config?: BGPConfig;
  bfd_config?: BFDConfig;
  qos_config?: QoSConfig;
  tilfa_config?: TILFAConfig;
  sr_policy_config?: SRPolicyConfig;
  acl_config?: ACLConfig;
  copp_config?: CoPPConfig;
  route_policy_config?: RoutePolicyConfig;
  rpki_config?: RPKIConfig;
  macsec_config?: MACsecConfig;
  flowspec_config?: FlowspecConfig;
  lldp_config?: LLDPConfig;
  vxlan_config?: VXLANConfig;
  l2vpn_config?: L2VPNConfig;
  vrrp_config?: VRRPConfig;
  dot1q_config?: Dot1qConfig;
  dot1ad_config?: Dot1adConfig;
  l2qos_config?: L2QoSConfig;
  handoff_config?: HandoffConfig;
  ospf_config?: OSPFConfig;
  ntp_config?: NTPConfig;
  ldp_config?: LDPConfig;
  netflow_config?: NetflowConfig;
  static_routes?: StaticRoute[];
}

export interface ManagementVRF {
  vrf_name: string;
  interface: string;
  ipv4: string;
  gateway: string;
}

// IS-IS
export interface ISISConfig {
  instance: string;
  net: string;
  level: string;
  interfaces: ISISInterface[];
  authentication?: { type: string; key: string; key_id?: number };
  lsp_mtu: number;
  overload_bit: boolean;
  spf_initial_delay?: number;
  spf_second_delay?: number;
  spf_max_wait?: number;
  max_lsp_lifetime?: number;
  hostname_dynamic?: boolean;
}

export interface ISISInterface {
  name: string;
  level: string;
  metric: number;
  passive: boolean;
  network_type: string;
}

// Segment Routing
export interface SRConfig {
  enabled: boolean;
  srgb: LabelRange;
  srlb: LabelRange;
  node_sids: NodeSID[];
  adj_sids: AdjSID[];
  mapping_server: boolean;
}

export interface LabelRange {
  start: number;
  end: number;
}

export interface NodeSID {
  index: number;
  prefix: string;
  php: boolean;
}

export interface AdjSID {
  label: number;
  interface: string;
  neighbor: string;
  protected: boolean;
}

// BGP
export interface BGPConfig {
  asn: number;
  router_id: string;
  peer_groups: BGPPeerGroup[];
  neighbors: BGPNeighbor[];
  is_route_reflector: boolean;
  l3vpns?: L3VPN[];
  evpn_instances?: EVPNInstance[];
  graceful_restart?: GracefulRestart;
}

export interface BGPPeerGroup {
  name: string;
  remote_as?: number;
  update_source?: string;
  address_families?: string[];
  send_community?: string;
  next_hop_self?: boolean;
}

export interface BGPNeighbor {
  address: string;
  remote_as: number;
  description: string;
  peer_type: "internal" | "external";
  update_source?: string;
  peer_group?: string;
  address_families: string[];
  route_reflector_client?: boolean;
  send_community?: string;
  next_hop_self?: boolean;
  bfd?: boolean;
  vrf?: string;
  add_path?: { receive: boolean; send_max: number };
  multihop?: { enabled: boolean; ttl: number };
}

export interface L3VPN {
  name: string;
  rd: string;
  rt_import: string[];
  rt_export: string[];
  interfaces: string[];
  ipv4: boolean;
  ipv6: boolean;
}

export interface EVPNInstance {
  name: string;
  evi: number;
  rd: string;
  rt_import: string[];
  rt_export: string[];
}

export interface GracefulRestart {
  enabled: boolean;
  restart_time: number;
  stalepath_time: number;
  long_lived?: { enabled: boolean; stale_time: number };
}

// BFD
export interface BFDConfig {
  enabled: boolean;
  profiles: BFDProfile[];
  sessions: BFDSession[];
  sbfd_reflector?: SBFDReflector;
}

export interface BFDProfile {
  name: string;
  min_tx: number;
  min_rx: number;
  detect_multiplier: number;
  echo_mode: boolean;
}

export interface BFDSession {
  interface: string;
  multihop: boolean;
  profile: string;
  mode: string;
  peer?: string;
}

export interface SBFDReflector {
  discriminator: number;
  description: string;
}

// QoS
export interface QoSConfig {
  enabled: boolean;
  forwarding_classes: ForwardingClass[];
  policies: QoSPolicy[];
  interface_bindings: QoSBinding[];
}

export interface ForwardingClass {
  name: string;
  dscp_match: string[];
  mpls_tc: number;
  queue_id: number;
}

export interface QoSPolicy {
  name: string;
  type: string;
  entries: QoSPolicyEntry[];
}

export interface QoSPolicyEntry {
  forwarding_class: string;
  scheduler?: { type: string; weight?: number; priority?: string; bandwidth_percent?: number };
  policer?: { type: string; cir: number; cbs: number; pir?: number; pbs?: number };
}

export interface QoSBinding {
  interface: string;
  ingress_policy?: string;
  egress_policy?: string;
}

// TI-LFA
export interface TILFAConfig {
  enabled: boolean;
  default_protection: string;
  interfaces: TILFAInterface[];
  microloop_avoidance?: { enabled: boolean; rib_update_delay: number };
}

export interface TILFAInterface {
  name: string;
  protection: string;
  enabled: boolean;
  max_repair_sids: number;
  srlg_groups: string[];
}

// SR Policy
export interface SRPolicyConfig {
  enabled: boolean;
  policies: SRPolicy[];
}

export interface SRPolicy {
  name: string;
  color: number;
  endpoint: string;
  binding_sid: { label: number; explicit: boolean };
  candidate_paths: CandidatePath[];
}

export interface CandidatePath {
  name: string;
  preference: number;
  protocol_origin: string;
  segment_lists: SegmentList[];
}

export interface SegmentList {
  name: string;
  weight: number;
  segments: Segment[];
}

export interface Segment {
  type: string;
  sid: number;
}

// ACL
export interface ACLConfig {
  acls: ACL[];
  interface_bindings: ACLBinding[];
}

export interface ACL {
  name: string;
  type: string;
  entries: ACLEntry[];
}

export interface ACLEntry {
  sequence: number;
  action: string;
  match: Record<string, unknown>;
  description: string;
}

export interface ACLBinding {
  interface: string;
  ingress?: string;
  egress?: string;
}

// CoPP
export interface CoPPConfig {
  enabled: boolean;
  policy: CoPPPolicy;
}

export interface CoPPPolicy {
  name: string;
  entries: CoPPEntry[];
}

export interface CoPPEntry {
  protocol_class: string;
  policer: {
    cir: number;
    cbs: number;
    conform_action: string;
    exceed_action: string;
  };
}

// Route Policy
export interface RoutePolicyConfig {
  prefix_lists: PrefixList[];
  community_lists: CommunityList[];
  as_path_lists: AsPathList[];
  route_maps: RouteMap[];
}

export interface PrefixList {
  name: string;
  entries: { sequence: number; action: string; prefix: string; ge?: number; le?: number }[];
}

export interface CommunityList {
  name: string;
  type: string;
  entries: { action: string; match_type: string; community: string }[];
}

export interface AsPathList {
  name: string;
  entries: { action: string; regex: string }[];
}

export interface RouteMap {
  name: string;
  entries: RouteMapEntry[];
}

export interface RouteMapEntry {
  sequence: number;
  action: string;
  match?: Record<string, unknown>;
  set?: Record<string, unknown>;
}

// RPKI
export interface RPKIConfig {
  enabled: boolean;
  servers: RPKIServer[];
  validation_policy: { entries: { state: string; action: string }[] };
}

export interface RPKIServer {
  address: string;
  port: number;
  preference: number;
  refresh_interval: number;
  retry_interval: number;
  expire_interval: number;
  transport: string;
}

// MACsec
export interface MACsecConfig {
  enabled: boolean;
  mka_policies: MKAPolicy[];
  key_chains: MACsecKeyChain[];
  interfaces: MACsecInterface[];
}

export interface MKAPolicy {
  name: string;
  cipher_suite: string;
  key_server_priority: number;
  confidentiality_offset: number;
  include_sci: boolean;
  replay_protection: boolean;
  replay_window: number;
}

export interface MACsecKeyChain {
  name: string;
  keys: { id: number; key_string: string; lifetime: string; cryptographic_algorithm: string }[];
}

export interface MACsecInterface {
  interface: string;
  mka_policy: string;
  key_chain: string;
}

// Flowspec
export interface FlowspecConfig {
  enabled: boolean;
  rules: FlowspecRule[];
  validation: { accept_ibgp: boolean; accept_ebgp: boolean; max_rules: number };
  address_families: string[];
}

export interface FlowspecRule {
  name: string;
  match: Record<string, unknown>;
  action: Record<string, unknown>;
}

// LLDP
export interface LLDPConfig {
  enabled: boolean;
  tx_interval: number;
  hold_multiplier: number;
  reinit_delay: number;
  tx_delay: number;
  chassis_id_subtype: string;
  optional_tlvs: string[];
  interfaces?: LLDPInterface[];
}

export interface LLDPInterface {
  interface: string;
  enabled: boolean;
  tx: boolean;
  rx: boolean;
}

// VXLAN
export interface VXLANConfig {
  enabled: boolean;
  vtep: VTEPConfig;
  l2_vnis: L2VNI[];
  l3_vnis: L3VNI[];
  anycast_gateway?: AnycastGateway;
  ethernet_segments?: EthernetSegment[];
}

export interface VTEPConfig {
  source: { interface: string; ipv4: string };
  udp_port: number;
  learning: string;
}

export interface L2VNI {
  vni: number;
  vlan_id: number;
  rt_import: string[];
  rt_export: string[];
  evi: number;
  ingress_replication: boolean;
  arp_suppression: boolean;
}

export interface L3VNI {
  vni: number;
  vrf: string;
  rt_import: string[];
  rt_export: string[];
}

export interface AnycastGateway {
  virtual_mac: string;
  interfaces: { vlan_id: number; ipv4: string }[];
}

export interface EthernetSegment {
  esi: string;
  interface: string;
  df_election: { type: string; preference?: number };
  active_active: boolean;
}

// L2VPN
export interface L2VPNConfig {
  enabled: boolean;
  vpws: VPWSInstance[];
  vpls: VPLSInstance[];
}

export interface VPWSInstance {
  name: string;
  service_id: number;
  interface: string;
  pseudowire: Pseudowire;
  split_horizon: boolean;
}

export interface Pseudowire {
  pw_id: number;
  peer: string;
  pw_type: string;
  signaling: string;
  mtu: number;
  control_word: boolean;
  status_signaling: boolean;
}

export interface VPLSInstance {
  name: string;
  vpls_id: number;
  rd: string;
  rt_import: string[];
  rt_export: string[];
  signaling: string;
  mac_learning: boolean;
  mac_limit: number;
  flood_unknown_unicast: boolean;
  peers: string[];
}

// VRRP
export interface VRRPConfig {
  enabled: boolean;
  groups: VRRPGroup[];
}

export interface VRRPGroup {
  vrid: number;
  interface: string;
  version: number;
  address_family: string;
  virtual_addresses: string[];
  priority: number;
  advert_interval: number;
  preempt: boolean;
  accept_mode: boolean;
  track_interfaces?: { interface: string; priority_decrement: number }[];
}

// 802.1Q
export interface Dot1qConfig {
  enabled: boolean;
  vlans: { vlan_id: number; name: string }[];
  interfaces: Dot1qInterface[];
  classification_rules?: Dot1qClassRule[];
}

export interface Dot1qInterface {
  interface: string;
  port_mode: string;
  tpid: number;
  native_vlan?: number;
  allowed_vlans?: number[];
  ingress_filtering: boolean;
}

export interface Dot1qClassRule {
  name: string;
  match_type: string;
  vlan_range?: number[];
  action: string;
}

// 802.1ad
export interface Dot1adConfig {
  enabled: boolean;
  interfaces: Dot1adInterface[];
}

export interface Dot1adInterface {
  interface: string;
  port_mode: string;
  svlan: { svlan_id: number; tpid: number };
  cvlan_range: number[];
}

// L2 QoS
export interface L2QoSConfig {
  enabled: boolean;
  mapping_tables: L2QoSMappingTable[];
  classification_rules?: L2QoSClassRule[];
}

export interface L2QoSMappingTable {
  name: string;
  pcp_to_dscp: { pcp: number; dei: number; dscp: string }[];
}

export interface L2QoSClassRule {
  name: string;
  match_type: string;
  action: string;
}

// CE Handoff
export interface HandoffConfig {
  handoffs: CEHandoff[];
}

export interface CEHandoff {
  name: string;
  side: "pe" | "ce";
  interface: string;
  service_type: string;
  routing_protocol: string;
  bgp_routing?: { asn: number; neighbors: BGPNeighbor[]; peer_groups: BGPPeerGroup[] };
  ospf_routing?: { config: OSPFConfig };
  static_routing?: { routes: StaticRoute[] };
  encapsulation: string;
  untagged_encap?: Record<string, unknown>;
  dot1q_encap?: Record<string, unknown>;
  dot1ad_encap?: Record<string, unknown>;
  qos?: Record<string, unknown>;
}

// OSPF
export interface OSPFConfig {
  enabled: boolean;
  version: number;
  router_id: string;
  areas: OSPFArea[];
  interfaces: OSPFInterface[];
}

export interface OSPFArea {
  area_id: string;
  area_type: string;
}

export interface OSPFInterface {
  name: string;
  area_id: string;
  network_type: string;
  metric: number;
  passive: boolean;
  hello_interval: number;
  dead_interval: number;
  priority: number;
  bfd: boolean;
}

export interface StaticRoute {
  prefix: string;
  next_hop: string;
  metric?: number;
  description?: string;
}

// NTP
export interface NTPConfig {
  enabled: boolean;
  servers: { address: string; prefer?: boolean; version: number; key_id?: number; iburst?: boolean; vrf?: string }[];
  peers?: { address: string; version: number }[];
  authentication?: { key_id: number; type: string; key: string }[];
  source_interface?: string;
}

// LDP
export interface LDPConfig {
  enabled: boolean;
  router_id: string;
  interfaces: { name: string }[];
  igp_sync: boolean;
}

// Netflow/IPFIX
export interface NetflowConfig {
  enabled: boolean;
  exporters: { name: string; destination: string; port: number; version: string }[];
  monitors: { name: string; record: string }[];
}

// Validation
export interface ValidationRule {
  name: string;
  description: string;
  status: "pass" | "fail";
  affectedDevices?: string[];
}
