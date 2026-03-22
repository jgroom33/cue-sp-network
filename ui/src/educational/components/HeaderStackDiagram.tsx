import { useState, useEffect } from "react";
import type { PacketHeaders, MplsLabel } from "../types";

interface Props {
  headers: PacketHeaders;
  previousHeaders?: PacketHeaders;
}

export function HeaderStackDiagram({ headers, previousHeaders }: Props) {
  const [flashFields, setFlashFields] = useState<Set<string>>(new Set());

  // Detect changed fields and flash them
  useEffect(() => {
    if (!previousHeaders) return;
    const changed = new Set<string>();

    // Compare ethernet
    if (headers.ethernet && previousHeaders.ethernet) {
      if (headers.ethernet.srcMac !== previousHeaders.ethernet.srcMac)
        changed.add("eth-src");
      if (headers.ethernet.dstMac !== previousHeaders.ethernet.dstMac)
        changed.add("eth-dst");
      if (headers.ethernet.etherType !== previousHeaders.ethernet.etherType)
        changed.add("eth-type");
      if (headers.ethernet.sVlan !== previousHeaders.ethernet.sVlan)
        changed.add("eth-svlan");
    }

    // Compare MPLS
    const prevMpls = previousHeaders.mpls ?? [];
    const currMpls = headers.mpls ?? [];
    if (prevMpls.length !== currMpls.length) changed.add("mpls-stack");
    currMpls.forEach((l, i) => {
      if (!prevMpls[i] || l.value !== prevMpls[i].value)
        changed.add(`mpls-${i}`);
      if (prevMpls[i] && l.ttl !== prevMpls[i].ttl)
        changed.add(`mpls-ttl-${i}`);
    });

    // Compare IP
    if (headers.ip && previousHeaders.ip) {
      if (headers.ip.ttl !== previousHeaders.ip.ttl) changed.add("ip-ttl");
      if (headers.ip.dscp !== previousHeaders.ip.dscp) changed.add("ip-dscp");
    }

    // Compare VXLAN
    if (headers.vxlan && !previousHeaders.vxlan) changed.add("vxlan-new");
    if (!headers.vxlan && previousHeaders.vxlan) changed.add("vxlan-removed");

    setFlashFields(changed);
    const timer = setTimeout(() => setFlashFields(new Set()), 1200);
    return () => clearTimeout(timer);
  }, [headers, previousHeaders]);

  const flash = (field: string) =>
    flashFields.has(field) ? "animate-pulse ring-2 ring-yellow-400 bg-yellow-400/10" : "";

  return (
    <div className="space-y-1 text-xs font-mono">
      {/* Ethernet */}
      {headers.ethernet && (
        <div className={`rounded p-2 bg-gray-600/40 border border-gray-600 ${flash("eth-type")}`}>
          <div className="text-[10px] text-gray-400 mb-1 font-sans font-semibold">
            Ethernet
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Field
              label="Src"
              value={truncMac(headers.ethernet.srcMac)}
              flash={flash("eth-src")}
            />
            <Field
              label="Dst"
              value={truncMac(headers.ethernet.dstMac)}
              flash={flash("eth-dst")}
            />
            <Field
              label="Type"
              value={headers.ethernet.etherType}
              flash={flash("eth-type")}
            />
            {headers.ethernet.sVlan !== undefined && (
              <Field
                label="S-VLAN"
                value={String(headers.ethernet.sVlan)}
                flash={flash("eth-svlan")}
              />
            )}
          </div>
        </div>
      )}

      {/* MPLS Stack */}
      {headers.mpls && headers.mpls.length > 0 && (
        <div className={`rounded p-2 bg-purple-900/30 border border-purple-700 ${flash("mpls-stack")}`}>
          <div className="text-[10px] text-purple-300 mb-1 font-sans font-semibold">
            MPLS Label Stack ({headers.mpls.length} label{headers.mpls.length > 1 ? "s" : ""})
          </div>
          {headers.mpls.map((label, i) => (
            <MplsLabelRow
              key={i}
              label={label}
              index={i}
              flash={(f) => flash(`mpls-${f}-${i}`) || flash(`mpls-${i}`)}
            />
          ))}
        </div>
      )}

      {/* VXLAN Outer */}
      {headers.vxlan && (
        <div className={`rounded p-2 bg-indigo-900/30 border border-indigo-700 ${flash("vxlan-new")}`}>
          <div className="text-[10px] text-indigo-300 mb-1 font-sans font-semibold">
            VXLAN Encapsulation
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Field label="Outer Src" value={headers.vxlan.outerSrcIp} />
            <Field label="Outer Dst" value={headers.vxlan.outerDstIp} />
            <Field label="UDP Dst" value={String(headers.vxlan.outerDstPort)} />
            <Field
              label="VNI"
              value={String(headers.vxlan.vni)}
              highlight
            />
          </div>
        </div>
      )}

      {/* Pseudowire */}
      {headers.pseudowire && (
        <div className="rounded p-2 bg-teal-900/30 border border-teal-700">
          <div className="text-[10px] text-teal-300 mb-1 font-sans font-semibold">
            Pseudowire
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Field label="PW Label" value={String(headers.pseudowire.pwLabel)} />
            <Field label="CW" value={headers.pseudowire.controlWord ? "Yes" : "No"} />
          </div>
        </div>
      )}

      {/* IP */}
      {headers.ip && (
        <div className="rounded p-2 bg-blue-900/30 border border-blue-700">
          <div className="text-[10px] text-blue-300 mb-1 font-sans font-semibold">
            IP Header
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Field label="Src" value={headers.ip.src} />
            <Field label="Dst" value={headers.ip.dst} />
            <Field
              label="TTL"
              value={String(headers.ip.ttl)}
              flash={flash("ip-ttl")}
            />
            <Field
              label="DSCP"
              value={headers.ip.dscp}
              flash={flash("ip-dscp")}
            />
            <Field label="Proto" value={headers.ip.protocol} />
          </div>
        </div>
      )}

      {/* Payload */}
      <div className="rounded p-2 bg-gray-700/30 border border-gray-700">
        <div className="text-[10px] text-gray-400 font-sans font-semibold">
          Payload
        </div>
        <span className="text-gray-500 text-[10px]">Customer data</span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  flash = "",
  highlight = false,
}: {
  label: string;
  value: string;
  flash?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${flash} rounded px-0.5 transition-all`}>
      <span className="text-gray-500">{label}: </span>
      <span className={highlight ? "text-yellow-300 font-semibold" : "text-gray-200"}>
        {value}
      </span>
    </div>
  );
}

function MplsLabelRow({
  label,
  index,
  flash,
}: {
  label: MplsLabel;
  index: number;
  flash: (field: string) => string;
}) {
  return (
    <div
      className={`flex items-center gap-2 py-0.5 px-1 rounded ${
        flash("") ? "animate-pulse ring-1 ring-yellow-400" : ""
      } ${index === 0 ? "bg-purple-800/30" : "bg-purple-900/20"}`}
    >
      <span className="text-purple-200 font-bold min-w-[45px]">
        {label.value}
      </span>
      <span className={`text-gray-400 ${flash("ttl")}`}>
        TTL:{label.ttl}
      </span>
      <span className="text-gray-400">TC:{label.tc}</span>
      <span className="text-gray-500">
        {label.bottom ? "S:1" : "S:0"}
      </span>
      {index === 0 && (
        <span className="text-[9px] text-purple-400 ml-auto">TOP</span>
      )}
    </div>
  );
}

function truncMac(mac: string): string {
  // Show last 4 chars for brevity
  if (mac.length > 8) return "..." + mac.slice(-8);
  return mac;
}
