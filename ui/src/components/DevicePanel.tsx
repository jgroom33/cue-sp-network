import type { Device, DeviceRole } from "../types";
import { roleBgColors } from "../utils/colors";
import { getDeviceProtocols } from "../utils/graph";
import ProtocolTabs from "./ProtocolTabs";

interface Props {
  device: Device;
  onClose: () => void;
}

export default function DevicePanel({ device, onClose }: Props) {
  const protocols = getDeviceProtocols(device);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/80">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">{device.hostname}</h2>
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${
              roleBgColors[device.role as DeviceRole]
            }`}
          >
            {device.role}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Key info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-gray-500">Router ID</div>
          <div className="text-gray-200 font-mono text-xs">{device.router_id}</div>
          {device.mgmt_vrf && (
            <>
              <div className="text-gray-500">Management</div>
              <div className="text-gray-200 font-mono text-xs">{device.mgmt_vrf.ipv4}</div>
            </>
          )}
        </div>

        {/* Protocol badges */}
        <div className="flex flex-wrap gap-1">
          {protocols.map((p) => (
            <span
              key={p}
              className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"
            >
              {p}
            </span>
          ))}
        </div>

        {/* Interfaces */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Interfaces ({device.interfaces.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">IPv4</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Description</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">MTU</th>
                </tr>
              </thead>
              <tbody>
                {device.interfaces.map((iface) => (
                  <tr key={iface.name} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-1.5 px-2 text-gray-200 font-mono">{iface.name}</td>
                    <td className="py-1.5 px-2 text-gray-400">{iface.type}</td>
                    <td className="py-1.5 px-2 text-gray-300 font-mono">{iface.ipv4 || "-"}</td>
                    <td className="py-1.5 px-2 text-gray-400">{iface.description || "-"}</td>
                    <td className="py-1.5 px-2 text-gray-400">{iface.mtu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Protocol tabs */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Protocol Configuration
          </h3>
          <ProtocolTabs device={device} />
        </div>
      </div>
    </div>
  );
}
