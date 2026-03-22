import { useState } from "react";
import type { Topology, Device, DeviceRole, LinkType, OverlayType } from "../types";
import { roleColors, linkColors, overlayColors, overlayLabels } from "../utils/colors";
import { toConfigKey, getDeviceProtocols, ALL_PROTOCOLS } from "../utils/graph";

interface Props {
  topo: Topology;
  configs: Record<string, Device>;
  selectedDevice: string | null;
  onSelectDevice: (id: string | null) => void;
  visibleRoles: Set<DeviceRole>;
  onToggleRole: (role: DeviceRole) => void;
  visibleLinkTypes: Set<LinkType>;
  onToggleLinkType: (lt: LinkType) => void;
  activeOverlays: Set<OverlayType>;
  onToggleOverlay: (o: OverlayType) => void;
}

const ALL_ROLES: DeviceRole[] = ["PE", "P", "RR", "ASBR", "AGG", "CE", "PCE", "EXTERNAL"];
const ALL_LINK_TYPES: LinkType[] = ["core", "edge", "customer", "peering"];
const ALL_OVERLAYS: OverlayType[] = ["ibgp", "ebgp", "sr-sids", "link-ips", "loopbacks"];

export default function Sidebar({
  topo,
  configs,
  selectedDevice,
  onSelectDevice,
  visibleRoles,
  onToggleRole,
  visibleLinkTypes,
  onToggleLinkType,
  activeOverlays,
  onToggleOverlay,
}: Props) {
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string | null>(null);

  // Group devices by role
  const byRole: Record<string, string[]> = {};
  for (const dev of topo.devices) {
    const role = topo.device_roles[dev] || "EXTERNAL";
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(dev);
  }

  // Filter devices
  const matchesSearch = (dev: string) => {
    if (!search) return true;
    const cfg = configs[toConfigKey(dev)];
    const q = search.toLowerCase();
    return (
      dev.toLowerCase().includes(q) ||
      cfg?.hostname.toLowerCase().includes(q) ||
      cfg?.router_id.includes(q) ||
      (topo.loopbacks[dev] || "").includes(q)
    );
  };

  const matchesProtocol = (dev: string) => {
    if (!protocolFilter) return true;
    const cfg = configs[toConfigKey(dev)];
    if (!cfg) return false;
    return getDeviceProtocols(cfg).includes(protocolFilter);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h1 className="text-base font-bold text-white">SP Network Model</h1>
        <div className="text-xs text-gray-500 mt-0.5">
          {topo.devices.length} devices &middot; {topo.links.length} links &middot; AS{topo.sp_asn}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Role filters */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Roles
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => onToggleRole(role)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  visibleRoles.has(role)
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-800/50 text-gray-500"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: roleColors[role],
                    opacity: visibleRoles.has(role) ? 1 : 0.3,
                  }}
                />
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Link type filters */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Link Types
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_LINK_TYPES.map((lt) => (
              <button
                key={lt}
                onClick={() => onToggleLinkType(lt)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  visibleLinkTypes.has(lt)
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-800/50 text-gray-500"
                }`}
              >
                <div
                  className="w-3 h-0.5"
                  style={{
                    backgroundColor: linkColors[lt],
                    opacity: visibleLinkTypes.has(lt) ? 1 : 0.3,
                  }}
                />
                {lt}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay toggles */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Overlays
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_OVERLAYS.map((o) => (
              <button
                key={o}
                onClick={() => onToggleOverlay(o)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  activeOverlays.has(o)
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-800/50 text-gray-500"
                }`}
              >
                <div
                  className={`w-3 h-0.5 ${o === "ibgp" || o === "ebgp" ? "border-t border-dashed" : ""}`}
                  style={{
                    backgroundColor: overlayColors[o],
                    opacity: activeOverlays.has(o) ? 1 : 0.3,
                  }}
                />
                {overlayLabels[o]}
              </button>
            ))}
          </div>
        </div>

        {/* Protocol filter */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Protocol Filter
          </div>
          <select
            value={protocolFilter || ""}
            onChange={(e) => setProtocolFilter(e.target.value || null)}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none"
          >
            <option value="">All protocols</option>
            {ALL_PROTOCOLS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Device list */}
        <div className="px-3 py-2">
          {ALL_ROLES.filter((role) => byRole[role]?.length).map((role) => (
            <div key={role} className="mb-2">
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5"
                style={{ color: roleColors[role] }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: roleColors[role] }}
                />
                {role} ({byRole[role].length})
              </div>
              {byRole[role]
                .filter((dev) => matchesSearch(dev) && matchesProtocol(dev))
                .map((dev) => {
                  const cfg = configs[toConfigKey(dev)];
                  return (
                    <button
                      key={dev}
                      onClick={() => onSelectDevice(dev === selectedDevice ? null : dev)}
                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors mb-0.5 ${
                        dev === selectedDevice
                          ? "bg-blue-900/50 text-blue-200 border border-blue-700"
                          : "text-gray-300 hover:bg-gray-800 border border-transparent"
                      }`}
                    >
                      <div className="font-medium">{cfg?.hostname || dev}</div>
                      <div className="text-gray-500 font-mono text-[10px]">
                        {topo.loopbacks[dev] || cfg?.router_id || ""}
                      </div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
