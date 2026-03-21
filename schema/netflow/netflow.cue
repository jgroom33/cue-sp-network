package netflow

// Netflow/IPFIX schema per RFC 7011 (IPFIX Protocol), RFC 5101 (IPFIX)

import "github.com/jgroom/sp-network-model/schema/common"

// Export protocol version
#ExportVersion: "v5" | "v9" | "ipfix" | *"ipfix"

// Sampler mode
#SamplerMode: "deterministic" | "random" | *"random"

// Sampler configuration
#FlowSampler: {
	name:         string
	mode:         #SamplerMode
	interval:     int & >=1 & <=65535 | *1000        // 1-in-N sampling
	description?: string
}

// Flow record template fields
#RecordField: "src-ip" | "dst-ip" | "src-port" | "dst-port" | "protocol" |
	"tos" | "input-interface" | "output-interface" | "src-as" | "dst-as" |
	"bgp-nexthop" | "mpls-label" | "vlan-id" | "direction" | "bytes" |
	"packets" | "timestamp" | "tcp-flags" | "src-mac" | "dst-mac"

// Flow record template
#FlowRecord: {
	name:    string
	fields:  [...#RecordField] & [_, ...]
}

// Flow exporter — RFC 7011 Section 10
#FlowExporter: {
	name:              string
	destination:       common.#IPv4 | common.#IPv6
	port:              int & >=1 & <=65535 | *4739          // IPFIX default port
	source_interface?: string
	transport:         "udp" | "tcp" | "sctp" | *"udp"
	version:           #ExportVersion
	template_refresh?: int & >=1 & <=86400 | *600           // seconds
	dscp?:             int & >=0 & <=63
	vrf?:              string
}

// Flow monitor binds record + exporter + sampler
#FlowMonitor: {
	name:      string
	record:    string              // reference to FlowRecord name
	exporters: [...string] & [_, ...]  // references to FlowExporter names
	sampler?:  string              // reference to FlowSampler name
	cache?: {
		type:       "normal" | "immediate" | "permanent" | *"normal"
		timeout_active:   int & >=1 & <=604800 | *60       // seconds
		timeout_inactive: int & >=1 & <=604800 | *15       // seconds
		entries?:         int & >=1 & <=4294967295
	}
}

// Interface flow monitoring binding
#FlowInterfaceBinding: {
	interface: string
	monitor:   string             // reference to FlowMonitor name
	direction: "ingress" | "egress" | "both" | *"ingress"
}

// Device-level Netflow/IPFIX configuration
#NetflowConfig: {
	enabled:     bool | *true
	samplers:    [...#FlowSampler] | *[]
	records:     [...#FlowRecord] | *[]
	exporters:   [...#FlowExporter] & [_, ...]    // at least one exporter
	monitors:    [...#FlowMonitor] & [_, ...]     // at least one monitor
	interface_bindings: [...#FlowInterfaceBinding] | *[]
}
