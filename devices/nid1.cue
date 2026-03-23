package devices

import "github.com/jgroom/sp-network-model/schema/device"

// NID1: Network Interface Device — MEF UNI demarcation at CE1 site
// Provider-owned CPE performing service handoff, bandwidth profiling, and OAM
nid1: device.#Device & {
	hostname:  "nid1"
	role:      "NID"
	router_id: "10.0.2.1"

	interfaces: [
		{name: "eth1", type: "physical", ipv4: "10.2.5.1/31", description: "uni-c-to-ce1"},
		{name: "eth2", type: "physical", ipv4: "10.2.7.0/31", description: "nni-to-pe1"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// --- MEF UNI configuration ---
	mef_config: {
		unis: [{
			uni_id:    "UNI-CE1"
			uni_type:  "UNI-N"  // Network-side UNI (provider-owned)
			interface: "eth1"
			evc_id:    "EVC-L2VPN-1001"
			evc_type:  "point-to-point"
			bandwidth_profile: {
				cir: 100000    // 100 Mbps committed
				cbs: 65536
				eir: 200000    // 200 Mbps excess
				ebs: 131072
				color_mode: "color-aware"
			}
			cos_mapping: {
				type: "pcp"
				pcp_entries: [
					{pcp: 5, cos_name: "voice", color: "green"},
					{pcp: 4, cos_name: "video", color: "green"},
					{pcp: 3, cos_name: "critical-data", color: "green"},
					{pcp: 2, cos_name: "bulk-data", color: "yellow"},
					{pcp: 0, cos_name: "best-effort", color: "green"},
				]
			}
			service_oam: {
				md_level: 4
				mep_id: 101
				ccm_interval: "1s"
				remote_mep_id: 201
				loopback: true
				linktrace: true
				performance_monitoring: true
			}
		}]
	}
}
