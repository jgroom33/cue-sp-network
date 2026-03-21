import type { ValidationRule, ISISConfig } from "../types";
import type { Topology, Device } from "../types";
import { toConfigKey } from "../utils/graph";

interface Props {
  topo: Topology;
  configs: Record<string, Device>;
  onHighlightDevices: (devices: Set<string> | null) => void;
  onSelectDevice: (id: string | null) => void;
}

// Derive validation results from the actual data
function computeValidations(
  topo: Topology,
  configs: Record<string, Device>
): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const providerDevices = topo.devices.filter((d) => {
    const role = topo.device_roles[d];
    return role && !["CE", "EXTERNAL"].includes(role);
  });

  // 1. SRGB consistency
  {
    const inconsistent: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.sr_config?.enabled) {
        if (cfg.sr_config.srgb.start !== 16000 || cfg.sr_config.srgb.end !== 23999) {
          inconsistent.push(dev);
        }
      }
    }
    rules.push({
      name: "SRGB Consistency",
      description: "All SR devices use SRGB 16000-23999",
      status: inconsistent.length === 0 ? "pass" : "fail",
      affectedDevices: inconsistent,
    });
  }

  // 2. Node SID uniqueness
  {
    const sidMap: Record<number, string[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      cfg?.sr_config?.node_sids?.forEach((s) => {
        if (!sidMap[s.index]) sidMap[s.index] = [];
        sidMap[s.index].push(dev);
      });
    }
    const dupes = Object.entries(sidMap)
      .filter(([, devs]) => devs.length > 1)
      .flatMap(([, devs]) => devs);
    rules.push({
      name: "Node SID Uniqueness",
      description: "All node SID indices are globally unique",
      status: dupes.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(dupes)],
    });
  }

  // 3. Router ID uniqueness
  {
    const ridMap: Record<string, string[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.router_id) {
        if (!ridMap[cfg.router_id]) ridMap[cfg.router_id] = [];
        ridMap[cfg.router_id].push(dev);
      }
    }
    const dupes = Object.entries(ridMap)
      .filter(([, devs]) => devs.length > 1)
      .flatMap(([, devs]) => devs);
    rules.push({
      name: "Router ID Uniqueness",
      description: "All router IDs are unique across the network",
      status: dupes.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(dupes)],
    });
  }

  // 4. IS-IS NET uniqueness
  {
    const netMap: Record<string, string[]> = {};
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.isis_config?.net) {
        if (!netMap[cfg.isis_config.net]) netMap[cfg.isis_config.net] = [];
        netMap[cfg.isis_config.net].push(dev);
      }
    }
    const dupes = Object.entries(netMap)
      .filter(([, devs]) => devs.length > 1)
      .flatMap(([, devs]) => devs);
    rules.push({
      name: "IS-IS NET Uniqueness",
      description: "All IS-IS NET addresses are unique",
      status: dupes.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(dupes)],
    });
  }

  // 5. IS-IS area consistency (49.0001)
  {
    const wrong: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.isis_config?.net && !cfg.isis_config.net.startsWith("49.0001")) {
        wrong.push(dev);
      }
    }
    rules.push({
      name: "IS-IS Area Consistency",
      description: "All IS-IS devices use area 49.0001",
      status: wrong.length === 0 ? "pass" : "fail",
      affectedDevices: wrong,
    });
  }

  // 6. iBGP ASN consistency
  {
    const wrong: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.bgp_config && cfg.bgp_config.asn !== topo.sp_asn) {
        wrong.push(dev);
      }
    }
    rules.push({
      name: "iBGP ASN Consistency",
      description: `All provider BGP speakers use ASN ${topo.sp_asn}`,
      status: wrong.length === 0 ? "pass" : "fail",
      affectedDevices: wrong,
    });
  }

  // 7. SBFD discriminator uniqueness
  {
    const discMap: Record<number, string[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.bfd_config?.sbfd_reflector) {
        const disc = cfg.bfd_config.sbfd_reflector.discriminator;
        if (!discMap[disc]) discMap[disc] = [];
        discMap[disc].push(dev);
      }
    }
    const dupes = Object.entries(discMap)
      .filter(([, devs]) => devs.length > 1)
      .flatMap(([, devs]) => devs);
    rules.push({
      name: "SBFD Discriminator Uniqueness",
      description: "All SBFD discriminators are unique",
      status: dupes.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(dupes)],
    });
  }

  // 8. VRRP priority checks
  {
    const vrids: Record<number, { dev: string; priority: number }[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      cfg?.vrrp_config?.groups?.forEach((g) => {
        if (!vrids[g.vrid]) vrids[g.vrid] = [];
        vrids[g.vrid].push({ dev, priority: g.priority });
      });
    }
    const issues: string[] = [];
    for (const [, members] of Object.entries(vrids)) {
      const prios = members.map((m) => m.priority);
      if (new Set(prios).size !== prios.length) {
        issues.push(...members.map((m) => m.dev));
      }
    }
    rules.push({
      name: "VRRP Priority",
      description: "VRRP groups have unique priorities per VRID",
      status: issues.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(issues)],
    });
  }

  // 9. ESI consistency
  {
    const esiMap: Record<string, string[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      cfg?.vxlan_config?.ethernet_segments?.forEach((es) => {
        if (!esiMap[es.esi]) esiMap[es.esi] = [];
        esiMap[es.esi].push(dev);
      });
    }
    // ESI should be shared by exactly 2 PEs for dual-homing
    const issues: string[] = [];
    for (const [, devs] of Object.entries(esiMap)) {
      if (devs.length !== 2) {
        issues.push(...devs);
      }
    }
    rules.push({
      name: "EVPN ESI Consistency",
      description: "Ethernet Segments are shared by exactly 2 PEs",
      status: issues.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(issues)],
    });
  }

  // 10. CE1 handoff consistency
  {
    const handoffDevs: string[] = [];
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.handoff_config?.handoffs?.some((h) => h.name.includes("ce1"))) {
        handoffDevs.push(dev);
      }
    }
    rules.push({
      name: "CE1 Handoff Consistency",
      description: "CE1 dual-home handoff configured on both PEs",
      status: handoffDevs.length >= 2 ? "pass" : "fail",
      affectedDevices: handoffDevs,
    });
  }

  // 11. OSPF router-ID uniqueness
  {
    const ridMap: Record<string, string[]> = {};
    for (const dev of topo.devices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.ospf_config?.router_id) {
        if (!ridMap[cfg.ospf_config.router_id]) ridMap[cfg.ospf_config.router_id] = [];
        ridMap[cfg.ospf_config.router_id].push(dev);
      }
    }
    const dupes = Object.entries(ridMap)
      .filter(([, devs]) => devs.length > 1)
      .flatMap(([, devs]) => devs);
    rules.push({
      name: "OSPF Router-ID Uniqueness",
      description: "All OSPF router-IDs are unique",
      status: dupes.length === 0 ? "pass" : "fail",
      affectedDevices: [...new Set(dupes)],
    });
  }

  // 12. ASBR redundancy
  {
    const asbrs = topo.devices.filter((d) => topo.device_roles[d] === "ASBR");
    rules.push({
      name: "ASBR Redundancy",
      description: "At least 2 ASBRs for redundancy",
      status: asbrs.length >= 2 ? "pass" : "fail",
      affectedDevices: asbrs,
    });
  }

  // 13. CoPP coverage
  {
    const missing: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (!cfg?.copp_config?.enabled) {
        missing.push(dev);
      }
    }
    rules.push({
      name: "CoPP Coverage",
      description: "All provider devices have CoPP enabled",
      status: missing.length === 0 ? "pass" : "fail",
      affectedDevices: missing,
    });
  }

  // 14. SRLB consistency
  {
    const wrong: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.sr_config?.enabled) {
        if (cfg.sr_config.srlb.start !== 15000 || cfg.sr_config.srlb.end !== 15999) {
          wrong.push(dev);
        }
      }
    }
    rules.push({
      name: "SRLB Consistency",
      description: "All SR devices use SRLB 15000-15999",
      status: wrong.length === 0 ? "pass" : "fail",
      affectedDevices: wrong,
    });
  }

  // 15. IS-IS authentication coverage
  {
    const missing: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg?.isis_config && !(cfg.isis_config as ISISConfig).authentication) {
        missing.push(dev);
      }
    }
    rules.push({
      name: "IS-IS Authentication",
      description: "All provider devices have IS-IS MD5 auth",
      status: missing.length === 0 ? "pass" : "fail",
      affectedDevices: missing,
    });
  }

  // 16. NTP coverage
  {
    const missing: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (!cfg?.ntp_config) {
        missing.push(dev);
      }
    }
    rules.push({
      name: "NTP Coverage",
      description: "All provider devices have NTP configured",
      status: missing.length === 0 ? "pass" : "fail",
      affectedDevices: missing,
    });
  }

  // 17. Management VRF consistency
  {
    const missing: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (!cfg?.mgmt_vrf) {
        missing.push(dev);
      }
    }
    rules.push({
      name: "Management VRF",
      description: "All provider devices have MGMT VRF configured",
      status: missing.length === 0 ? "pass" : "fail",
      affectedDevices: missing,
    });
  }

  // 18. Loopback /32 prefix
  {
    const wrong: string[] = [];
    for (const dev of providerDevices) {
      const cfg = configs[toConfigKey(dev)];
      if (cfg) {
        for (const iface of cfg.interfaces) {
          if (iface.type === "loopback" && iface.ipv4 && !iface.ipv4.endsWith("/32")) {
            wrong.push(dev);
            break;
          }
        }
      }
    }
    rules.push({
      name: "Loopback /32 Prefix",
      description: "All provider loopbacks use /32 prefix length",
      status: wrong.length === 0 ? "pass" : "fail",
      affectedDevices: wrong,
    });
  }

  return rules;
}

export default function ValidationDashboard({
  topo,
  configs,
  onHighlightDevices,
  onSelectDevice,
}: Props) {
  const rules = computeValidations(topo, configs);
  const passCount = rules.filter((r) => r.status === "pass").length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-200">Validation Health</h2>
        <span className="text-xs text-gray-400">
          {passCount}/{rules.length} passing
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {rules.map((rule) => (
          <button
            key={rule.name}
            className={`text-left p-2.5 rounded-lg border transition-colors ${
              rule.status === "pass"
                ? "border-green-900 bg-green-950/50 hover:bg-green-950"
                : "border-red-900 bg-red-950/50 hover:bg-red-950"
            }`}
            onClick={() => {
              if (rule.affectedDevices && rule.affectedDevices.length > 0) {
                onHighlightDevices(new Set(rule.affectedDevices));
                if (rule.affectedDevices.length === 1) {
                  onSelectDevice(rule.affectedDevices[0]);
                }
              } else {
                onHighlightDevices(null);
              }
            }}
            onMouseLeave={() => onHighlightDevices(null)}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  rule.status === "pass" ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-xs font-medium text-gray-200">{rule.name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 ml-4">{rule.description}</div>
            {rule.status === "fail" && rule.affectedDevices && rule.affectedDevices.length > 0 && (
              <div className="text-xs text-red-400 mt-1 ml-4">
                Affected: {rule.affectedDevices.join(", ")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
