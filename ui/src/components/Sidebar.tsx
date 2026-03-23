import type { Topology, Device, DeviceRole, LinkType, OverlayType } from "../types";
import { roleColors, linkColors, overlayColors, overlayLabels } from "../utils/colors";

interface Props {
  topo: Topology;
  configs: Record<string, Device>;
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
const CLOUD_OVERLAYS: OverlayType[] = ["cloud-isis", "cloud-bgp", "cloud-vxlan", "cloud-erps", "cloud-l2vpn"];

export default function Sidebar({
  topo,
  visibleRoles,
  onToggleRole,
  visibleLinkTypes,
  onToggleLinkType,
  activeOverlays,
  onToggleOverlay,
}: Props) {
  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h1 className="text-base font-bold text-white">SP Network Model</h1>
        <div className="text-xs text-gray-500 mt-0.5">
          {topo.devices.length} devices &middot; {topo.links.length} links &middot; AS{topo.sp_asn}
        </div>
      </div>

      {/* Controls */}
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

        {/* Domain clouds */}
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Domains
          </div>
          <div className="flex flex-wrap gap-1">
            {CLOUD_OVERLAYS.map((o) => (
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
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    backgroundColor: overlayColors[o],
                    opacity: activeOverlays.has(o) ? 0.5 : 0.2,
                  }}
                />
                {overlayLabels[o]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
