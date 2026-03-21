import { useState, useEffect } from "react";
import type { Device } from "../types";

interface Props {
  device: Device;
}

type TabId =
  | "isis"
  | "sr"
  | "bgp"
  | "bfd"
  | "qos"
  | "tilfa"
  | "sr-policy"
  | "security"
  | "services"
  | "dot1q"
  | "l2qos"
  | "ospf";

interface Tab {
  id: TabId;
  label: string;
  available: boolean;
}

export default function ProtocolTabs({ device }: Props) {
  const tabs: Tab[] = [
    { id: "isis", label: "IS-IS", available: !!device.isis_config },
    { id: "sr", label: "SR-MPLS", available: !!device.sr_config?.enabled },
    { id: "bgp", label: "BGP", available: !!device.bgp_config },
    { id: "bfd", label: "BFD", available: !!device.bfd_config?.enabled },
    { id: "qos", label: "QoS", available: !!device.qos_config?.enabled },
    { id: "tilfa", label: "TI-LFA", available: !!device.tilfa_config?.enabled },
    { id: "sr-policy", label: "SR Policy", available: !!device.sr_policy_config?.enabled },
    {
      id: "security",
      label: "Security",
      available: !!(
        device.acl_config ||
        device.copp_config?.enabled ||
        device.route_policy_config ||
        device.rpki_config?.enabled ||
        device.macsec_config?.enabled ||
        device.flowspec_config?.enabled
      ),
    },
    {
      id: "services",
      label: "Services",
      available: !!(
        device.l2vpn_config?.enabled ||
        device.vxlan_config?.enabled ||
        device.vrrp_config?.enabled ||
        device.handoff_config
      ),
    },
    {
      id: "dot1q",
      label: "802.1Q/ad",
      available: !!(device.dot1q_config?.enabled || device.dot1ad_config?.enabled),
    },
    { id: "l2qos", label: "L2 QoS", available: !!device.l2qos_config?.enabled },
    { id: "ospf", label: "OSPF", available: !!device.ospf_config?.enabled },
  ];

  const availableTabs = tabs.filter((t) => t.available);
  const [activeTab, setActiveTab] = useState<TabId>(availableTabs[0]?.id || "isis");

  // Reset active tab when device changes
  useEffect(() => {
    const firstAvailable = tabs.find((t) => t.available)?.id;
    if (firstAvailable) setActiveTab(firstAvailable);
  }, [device.hostname]);

  if (availableTabs.length === 0) {
    return <div className="text-gray-500 text-sm p-4">No protocol configurations</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-gray-700 pb-1 mb-3">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1 text-xs rounded-t font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="text-sm">
        {availableTabs.some((t) => t.id === activeTab)
          ? renderTabContent(activeTab, device)
          : null}
      </div>
    </div>
  );
}

function renderTabContent(tab: TabId, device: Device) {
  switch (tab) {
    case "isis":
      return <ISISTab device={device} />;
    case "sr":
      return <SRTab device={device} />;
    case "bgp":
      return <BGPTab device={device} />;
    case "bfd":
      return <BFDTab device={device} />;
    case "qos":
      return <QoSTab device={device} />;
    case "tilfa":
      return <TILFATab device={device} />;
    case "sr-policy":
      return <SRPolicyTab device={device} />;
    case "security":
      return <SecurityTab device={device} />;
    case "services":
      return <ServicesTab device={device} />;
    case "dot1q":
      return <Dot1qTab device={device} />;
    case "l2qos":
      return <L2QoSTab device={device} />;
    case "ospf":
      return <OSPFTab device={device} />;
    default:
      return null;
  }
}

// Helper components
function Table({ headers, rows }: { headers: string[]; rows: (string | number | boolean)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700">
            {headers.map((h) => (
              <th key={h} className="text-left py-1.5 px-2 text-gray-400 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2 text-gray-300">
                  {typeof cell === "boolean" ? (cell ? "Yes" : "No") : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === undefined) return null;
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-gray-500 min-w-[120px]">{label}:</span>
      <span className="text-gray-200">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">{children}</h4>;
}

// Tab implementations
function ISISTab({ device }: { device: Device }) {
  const isis = device.isis_config!;
  return (
    <div>
      <KV label="Instance" value={isis.instance} />
      <KV label="NET" value={isis.net} />
      <KV label="Level" value={isis.level} />
      <KV label="LSP MTU" value={isis.lsp_mtu} />
      <KV label="Overload" value={isis.overload_bit} />
      <SectionTitle>Interfaces</SectionTitle>
      <Table
        headers={["Interface", "Level", "Metric", "Passive", "Type"]}
        rows={isis.interfaces.map((i) => [i.name, i.level, i.metric, i.passive, i.network_type])}
      />
    </div>
  );
}

function SRTab({ device }: { device: Device }) {
  const sr = device.sr_config!;
  return (
    <div>
      <KV label="SRGB" value={`${sr.srgb.start} – ${sr.srgb.end}`} />
      <KV label="SRLB" value={`${sr.srlb.start} – ${sr.srlb.end}`} />
      <KV label="Mapping Server" value={sr.mapping_server} />
      <SectionTitle>Node SIDs</SectionTitle>
      <Table
        headers={["Index", "Prefix", "PHP"]}
        rows={sr.node_sids.map((s) => [s.index, s.prefix, s.php])}
      />
      {sr.adj_sids.length > 0 && (
        <>
          <SectionTitle>Adjacency SIDs</SectionTitle>
          <Table
            headers={["Label", "Interface", "Neighbor", "Protected"]}
            rows={sr.adj_sids.map((s) => [s.label, s.interface, s.neighbor, s.protected])}
          />
        </>
      )}
    </div>
  );
}

function BGPTab({ device }: { device: Device }) {
  const bgp = device.bgp_config!;
  return (
    <div>
      <KV label="ASN" value={bgp.asn} />
      <KV label="Router ID" value={bgp.router_id} />
      <KV label="Route Reflector" value={bgp.is_route_reflector} />
      {bgp.graceful_restart && (
        <>
          <KV label="Graceful Restart" value={bgp.graceful_restart.enabled} />
          <KV label="Restart Time" value={`${bgp.graceful_restart.restart_time}s`} />
        </>
      )}
      <SectionTitle>Neighbors ({bgp.neighbors.length})</SectionTitle>
      <Table
        headers={["Address", "Remote AS", "Type", "AFIs", "Group", "BFD"]}
        rows={bgp.neighbors.map((n) => [
          n.address,
          n.remote_as,
          n.peer_type,
          n.address_families.join(", "),
          n.peer_group || "-",
          n.bfd ?? false,
        ])}
      />
      {bgp.l3vpns && bgp.l3vpns.length > 0 && (
        <>
          <SectionTitle>L3VPNs</SectionTitle>
          <Table
            headers={["Name", "RD", "RT Import", "RT Export", "Interfaces"]}
            rows={bgp.l3vpns.map((v) => [
              v.name,
              v.rd,
              v.rt_import.join(", "),
              v.rt_export.join(", "),
              v.interfaces.join(", "),
            ])}
          />
        </>
      )}
      {bgp.evpn_instances && bgp.evpn_instances.length > 0 && (
        <>
          <SectionTitle>EVPN Instances</SectionTitle>
          <Table
            headers={["Name", "EVI", "RD", "RT Import", "RT Export"]}
            rows={bgp.evpn_instances.map((e) => [
              e.name,
              e.evi,
              e.rd,
              e.rt_import.join(", "),
              e.rt_export.join(", "),
            ])}
          />
        </>
      )}
    </div>
  );
}

function BFDTab({ device }: { device: Device }) {
  const bfd = device.bfd_config!;
  return (
    <div>
      <SectionTitle>Profiles</SectionTitle>
      <Table
        headers={["Name", "Min TX", "Min RX", "Multiplier", "Echo"]}
        rows={bfd.profiles.map((p) => [p.name, `${p.min_tx}ms`, `${p.min_rx}ms`, p.detect_multiplier, p.echo_mode])}
      />
      <SectionTitle>Sessions</SectionTitle>
      <Table
        headers={["Interface", "Profile", "Mode", "Multihop"]}
        rows={bfd.sessions.map((s) => [s.interface, s.profile, s.mode, s.multihop])}
      />
      {bfd.sbfd_reflector && (
        <>
          <SectionTitle>SBFD Reflector</SectionTitle>
          <KV label="Discriminator" value={bfd.sbfd_reflector.discriminator} />
          <KV label="Description" value={bfd.sbfd_reflector.description} />
        </>
      )}
    </div>
  );
}

function QoSTab({ device }: { device: Device }) {
  const qos = device.qos_config!;
  return (
    <div>
      <SectionTitle>Forwarding Classes ({qos.forwarding_classes.length})</SectionTitle>
      <Table
        headers={["Name", "DSCP Match", "MPLS TC", "Queue"]}
        rows={qos.forwarding_classes.map((fc) => [fc.name, fc.dscp_match.join(", "), fc.mpls_tc, fc.queue_id])}
      />
      {qos.policies.length > 0 && (
        <>
          <SectionTitle>Policies</SectionTitle>
          {qos.policies.map((p) => (
            <div key={p.name} className="mb-2">
              <div className="text-gray-300 font-medium text-xs mb-1">
                {p.name} ({p.type})
              </div>
              <Table
                headers={["Class", "Scheduler", "Weight/Priority"]}
                rows={p.entries.map((e) => [
                  e.forwarding_class,
                  e.scheduler?.type || e.policer?.type || "-",
                  e.scheduler?.weight
                    ? `weight: ${e.scheduler.weight}`
                    : e.scheduler?.priority || "-",
                ])}
              />
            </div>
          ))}
        </>
      )}
      {qos.interface_bindings.length > 0 && (
        <>
          <SectionTitle>Interface Bindings</SectionTitle>
          <Table
            headers={["Interface", "Ingress", "Egress"]}
            rows={qos.interface_bindings.map((b) => [b.interface, b.ingress_policy || "-", b.egress_policy || "-"])}
          />
        </>
      )}
    </div>
  );
}

function TILFATab({ device }: { device: Device }) {
  const tilfa = device.tilfa_config!;
  return (
    <div>
      <KV label="Default Protection" value={tilfa.default_protection} />
      {tilfa.microloop_avoidance && (
        <>
          <KV label="Microloop Avoidance" value={tilfa.microloop_avoidance.enabled} />
          <KV label="RIB Update Delay" value={`${tilfa.microloop_avoidance.rib_update_delay}ms`} />
        </>
      )}
      <SectionTitle>Interfaces</SectionTitle>
      <Table
        headers={["Interface", "Protection", "Enabled", "Max SIDs", "SRLGs"]}
        rows={tilfa.interfaces.map((i) => [
          i.name,
          i.protection,
          i.enabled,
          i.max_repair_sids,
          i.srlg_groups.join(", ") || "-",
        ])}
      />
    </div>
  );
}

function SRPolicyTab({ device }: { device: Device }) {
  const srp = device.sr_policy_config!;
  return (
    <div>
      {srp.policies.map((p) => (
        <div key={p.name} className="mb-3">
          <div className="text-gray-200 font-medium text-xs mb-1">{p.name}</div>
          <KV label="Color" value={p.color} />
          <KV label="Endpoint" value={p.endpoint} />
          <KV label="Binding SID" value={p.binding_sid.label} />
          <SectionTitle>Candidate Paths</SectionTitle>
          {p.candidate_paths.map((cp) => (
            <div key={cp.name} className="ml-2 mb-2">
              <div className="text-gray-300 text-xs">
                {cp.name} (pref: {cp.preference}, origin: {cp.protocol_origin})
              </div>
              {cp.segment_lists.map((sl) => (
                <div key={sl.name} className="ml-2 text-gray-400 text-xs">
                  {sl.name}: [{sl.segments.map((s) => `${s.type}:${s.sid}`).join(" → ")}]
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SecurityTab({ device }: { device: Device }) {
  return (
    <div>
      {device.acl_config && (
        <>
          <SectionTitle>ACLs</SectionTitle>
          {device.acl_config.acls.map((acl) => (
            <div key={acl.name} className="mb-2">
              <div className="text-gray-300 font-medium text-xs mb-1">
                {acl.name} ({acl.type})
              </div>
              <Table
                headers={["Seq", "Action", "Description"]}
                rows={acl.entries.map((e) => [e.sequence, e.action, e.description])}
              />
            </div>
          ))}
          {device.acl_config.interface_bindings.length > 0 && (
            <Table
              headers={["Interface", "Ingress", "Egress"]}
              rows={device.acl_config.interface_bindings.map((b) => [
                b.interface,
                b.ingress || "-",
                b.egress || "-",
              ])}
            />
          )}
        </>
      )}
      {device.copp_config?.enabled && (
        <>
          <SectionTitle>CoPP: {device.copp_config.policy.name}</SectionTitle>
          <Table
            headers={["Protocol", "CIR (bps)", "CBS", "Exceed"]}
            rows={device.copp_config.policy.entries.map((e) => [
              e.protocol_class,
              e.policer.cir,
              e.policer.cbs,
              e.policer.exceed_action,
            ])}
          />
        </>
      )}
      {device.route_policy_config && (
        <>
          {device.route_policy_config.community_lists.length > 0 && (
            <>
              <SectionTitle>Community Lists</SectionTitle>
              {device.route_policy_config.community_lists.map((cl) => (
                <div key={cl.name} className="text-xs text-gray-400 ml-1">
                  {cl.name} ({cl.type}): {cl.entries.map((e) => e.community).join(", ")}
                </div>
              ))}
            </>
          )}
          {device.route_policy_config.route_maps.length > 0 && (
            <>
              <SectionTitle>Route Maps</SectionTitle>
              {device.route_policy_config.route_maps.map((rm) => (
                <div key={rm.name} className="mb-1">
                  <div className="text-gray-300 text-xs font-medium">{rm.name}</div>
                  {rm.entries.map((e) => (
                    <div key={e.sequence} className="text-xs text-gray-400 ml-2">
                      seq {e.sequence}: {e.action}
                      {e.set && ` → set: ${JSON.stringify(e.set)}`}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      )}
      {device.rpki_config?.enabled && (
        <>
          <SectionTitle>RPKI</SectionTitle>
          <Table
            headers={["Server", "Port", "Preference", "Transport"]}
            rows={device.rpki_config.servers.map((s) => [s.address, s.port, s.preference, s.transport])}
          />
        </>
      )}
      {device.macsec_config?.enabled && (
        <>
          <SectionTitle>MACsec Policies</SectionTitle>
          <Table
            headers={["Name", "Cipher", "Priority", "SCI"]}
            rows={device.macsec_config.mka_policies.map((p) => [
              p.name,
              p.cipher_suite,
              p.key_server_priority,
              p.include_sci,
            ])}
          />
        </>
      )}
      {device.flowspec_config?.enabled && (
        <>
          <SectionTitle>Flowspec</SectionTitle>
          <KV label="Families" value={device.flowspec_config.address_families.join(", ")} />
          <KV label="Accept iBGP" value={device.flowspec_config.validation.accept_ibgp} />
          <KV label="Accept eBGP" value={device.flowspec_config.validation.accept_ebgp} />
          <KV label="Max Rules" value={device.flowspec_config.validation.max_rules} />
        </>
      )}
    </div>
  );
}

function ServicesTab({ device }: { device: Device }) {
  return (
    <div>
      {device.l2vpn_config?.enabled && (
        <>
          {device.l2vpn_config.vpws.length > 0 && (
            <>
              <SectionTitle>VPWS</SectionTitle>
              <Table
                headers={["Name", "ID", "Interface", "PW Peer", "PW Type"]}
                rows={device.l2vpn_config.vpws.map((v) => [
                  v.name,
                  v.service_id,
                  v.interface,
                  v.pseudowire.peer,
                  v.pseudowire.pw_type,
                ])}
              />
            </>
          )}
          {device.l2vpn_config.vpls.length > 0 && (
            <>
              <SectionTitle>VPLS</SectionTitle>
              <Table
                headers={["Name", "ID", "RD", "Signaling", "Peers"]}
                rows={device.l2vpn_config.vpls.map((v) => [
                  v.name,
                  v.vpls_id,
                  v.rd,
                  v.signaling,
                  v.peers.join(", "),
                ])}
              />
            </>
          )}
        </>
      )}
      {device.vxlan_config?.enabled && (
        <>
          <SectionTitle>VXLAN VTEP</SectionTitle>
          <KV label="Source" value={`${device.vxlan_config.vtep.source.interface} (${device.vxlan_config.vtep.source.ipv4})`} />
          <KV label="Port" value={device.vxlan_config.vtep.udp_port} />
          <KV label="Learning" value={device.vxlan_config.vtep.learning} />
          {device.vxlan_config.l2_vnis.length > 0 && (
            <>
              <SectionTitle>L2 VNIs</SectionTitle>
              <Table
                headers={["VNI", "VLAN", "EVI", "ARP Supp"]}
                rows={device.vxlan_config.l2_vnis.map((v) => [v.vni, v.vlan_id, v.evi, v.arp_suppression])}
              />
            </>
          )}
          {device.vxlan_config.l3_vnis.length > 0 && (
            <>
              <SectionTitle>L3 VNIs</SectionTitle>
              <Table
                headers={["VNI", "VRF", "RT Import", "RT Export"]}
                rows={device.vxlan_config.l3_vnis.map((v) => [v.vni, v.vrf, v.rt_import.join(", "), v.rt_export.join(", ")])}
              />
            </>
          )}
          {device.vxlan_config.ethernet_segments && device.vxlan_config.ethernet_segments.length > 0 && (
            <>
              <SectionTitle>Ethernet Segments</SectionTitle>
              <Table
                headers={["ESI", "Interface", "DF Type", "Active-Active"]}
                rows={device.vxlan_config.ethernet_segments.map((es) => [
                  es.esi,
                  es.interface,
                  es.df_election.type,
                  es.active_active,
                ])}
              />
            </>
          )}
          {device.vxlan_config.anycast_gateway && (
            <>
              <SectionTitle>Anycast Gateway</SectionTitle>
              <KV label="Virtual MAC" value={device.vxlan_config.anycast_gateway.virtual_mac} />
              {device.vxlan_config.anycast_gateway.interfaces.map((i) => (
                <KV key={i.vlan_id} label={`VLAN ${i.vlan_id}`} value={i.ipv4} />
              ))}
            </>
          )}
        </>
      )}
      {device.vrrp_config?.enabled && (
        <>
          <SectionTitle>VRRP Groups</SectionTitle>
          <Table
            headers={["VRID", "Interface", "VIP", "Priority", "Preempt"]}
            rows={device.vrrp_config.groups.map((g) => [
              g.vrid,
              g.interface,
              g.virtual_addresses.join(", "),
              g.priority,
              g.preempt,
            ])}
          />
        </>
      )}
      {device.handoff_config && (
        <>
          <SectionTitle>CE Handoffs</SectionTitle>
          {device.handoff_config.handoffs.map((h) => (
            <div key={h.name} className="mb-2">
              <div className="text-gray-300 text-xs font-medium">{h.name}</div>
              <KV label="Side" value={h.side} />
              <KV label="Interface" value={h.interface} />
              <KV label="Service" value={h.service_type} />
              <KV label="Routing" value={h.routing_protocol} />
              <KV label="Encap" value={h.encapsulation} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Dot1qTab({ device }: { device: Device }) {
  return (
    <div>
      {device.dot1q_config?.enabled && (
        <>
          <SectionTitle>802.1Q VLANs</SectionTitle>
          <Table
            headers={["VLAN ID", "Name"]}
            rows={device.dot1q_config.vlans.map((v) => [v.vlan_id, v.name])}
          />
          <SectionTitle>Interfaces</SectionTitle>
          <Table
            headers={["Interface", "Mode", "Native", "Allowed VLANs"]}
            rows={device.dot1q_config.interfaces.map((i) => [
              i.interface,
              i.port_mode,
              i.native_vlan ?? "-",
              i.allowed_vlans?.join(", ") || "-",
            ])}
          />
        </>
      )}
      {device.dot1ad_config?.enabled && (
        <>
          <SectionTitle>802.1ad Interfaces</SectionTitle>
          <Table
            headers={["Interface", "Mode", "S-VLAN", "C-VLAN Range"]}
            rows={device.dot1ad_config.interfaces.map((i) => [
              i.interface,
              i.port_mode,
              i.svlan.svlan_id,
              i.cvlan_range.join(", ") || "-",
            ])}
          />
        </>
      )}
    </div>
  );
}

function L2QoSTab({ device }: { device: Device }) {
  const l2qos = device.l2qos_config!;
  return (
    <div>
      <SectionTitle>PCP Mapping Tables</SectionTitle>
      {l2qos.mapping_tables.map((mt) => (
        <div key={mt.name} className="mb-2">
          <div className="text-gray-300 text-xs font-medium mb-1">{mt.name}</div>
          <Table
            headers={["PCP", "DEI", "DSCP"]}
            rows={mt.pcp_to_dscp.map((m) => [m.pcp, m.dei, m.dscp])}
          />
        </div>
      ))}
    </div>
  );
}

function OSPFTab({ device }: { device: Device }) {
  const ospf = device.ospf_config!;
  return (
    <div>
      <KV label="Version" value={ospf.version} />
      <KV label="Router ID" value={ospf.router_id} />
      <SectionTitle>Areas</SectionTitle>
      <Table
        headers={["Area ID", "Type"]}
        rows={ospf.areas.map((a) => [a.area_id, a.area_type])}
      />
      <SectionTitle>Interfaces</SectionTitle>
      <Table
        headers={["Interface", "Area", "Type", "Metric", "Passive", "BFD"]}
        rows={ospf.interfaces.map((i) => [i.name, i.area_id, i.network_type, i.metric, i.passive, i.bfd])}
      />
    </div>
  );
}
