import { useState, useCallback, useMemo } from "react";
import { useNetworkData } from "./hooks/useNetworkData";
import type { DeviceRole, LinkType, OverlayType } from "./types";
import { toConfigKey } from "./utils/graph";
import { buildOverlayData } from "./utils/overlays";
import TopologyGraph from "./components/TopologyGraph";
import DevicePanel from "./components/DevicePanel";
import Sidebar from "./components/Sidebar";
import ValidationDashboard from "./components/ValidationDashboard";

const ALL_ROLES = new Set<DeviceRole>(["PE", "P", "RR", "ASBR", "AGG", "CE", "PCE", "EXTERNAL"]);
const ALL_LINK_TYPES = new Set<LinkType>(["core", "edge", "customer", "peering"]);

export default function App() {
  const { data, error, loading } = useNetworkData();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [visibleRoles, setVisibleRoles] = useState<Set<DeviceRole>>(new Set(ALL_ROLES));
  const [visibleLinkTypes, setVisibleLinkTypes] = useState<Set<LinkType>>(new Set(ALL_LINK_TYPES));
  const [highlightedDevices, setHighlightedDevices] = useState<Set<string> | null>(null);
  const [activeView, setActiveView] = useState<"devices" | "validation">("devices");
  const [activeOverlays, setActiveOverlays] = useState<Set<OverlayType>>(new Set());

  const toggleRole = useCallback((role: DeviceRole) => {
    setVisibleRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  const toggleLinkType = useCallback((lt: LinkType) => {
    setVisibleLinkTypes((prev) => {
      const next = new Set(prev);
      if (next.has(lt)) next.delete(lt);
      else next.add(lt);
      return next;
    });
  }, []);

  const toggleOverlay = useCallback((o: OverlayType) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  }, []);

  const overlayData = useMemo(
    () =>
      data ? buildOverlayData(data.network.topo, data.network.device_configs) : null,
    [data]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading network data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-red-400">
        <div className="text-center">
          <div className="text-lg font-bold mb-2">Failed to load network data</div>
          <div className="text-sm">{error || "Unknown error"}</div>
          <div className="text-xs text-gray-500 mt-2">
            Run: <code className="bg-gray-800 px-2 py-1 rounded">./scripts/export-data.sh</code>
          </div>
        </div>
      </div>
    );
  }

  const { topo, device_configs } = data.network;
  const selectedConfig =
    selectedDevice ? device_configs[toConfigKey(selectedDevice)] : null;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col">
        <Sidebar
          topo={topo}
          configs={device_configs}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          visibleRoles={visibleRoles}
          onToggleRole={toggleRole}
          visibleLinkTypes={visibleLinkTypes}
          onToggleLinkType={toggleLinkType}
          onHighlightDevices={setHighlightedDevices}
          activeView={activeView}
          onSetView={setActiveView}
          activeOverlays={activeOverlays}
          onToggleOverlay={toggleOverlay}
        />
        {/* Validation dashboard below sidebar when in validation view */}
        {activeView === "validation" && (
          <div className="border-t border-gray-700 overflow-y-auto flex-1 bg-gray-900">
            <ValidationDashboard
              topo={topo}
              configs={device_configs}
              onHighlightDevices={setHighlightedDevices}
              onSelectDevice={setSelectedDevice}
            />
          </div>
        )}
      </div>

      {/* Main graph area */}
      <div className="flex-1 relative">
        <TopologyGraph
          topo={topo}
          configs={device_configs}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          visibleRoles={visibleRoles}
          visibleLinkTypes={visibleLinkTypes}
          highlightedDevices={highlightedDevices}
          overlayData={overlayData!}
          activeOverlays={activeOverlays}
        />
      </div>

      {/* Device detail panel */}
      {selectedConfig && (
        <div className="w-96 flex-shrink-0">
          <DevicePanel
            device={selectedConfig}
            onClose={() => setSelectedDevice(null)}
          />
        </div>
      )}
    </div>
  );
}
