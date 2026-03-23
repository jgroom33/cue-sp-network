package devices

import "github.com/jgroom/sp-network-model/schema/device"

// NID2: Network Interface Device — MEF UNI demarcation at CE4 site
// Provider-owned CPE performing service handoff, bandwidth profiling, and OAM
nid2: device.#Device & {
	hostname:  "nid2"
	role:      "NID"
	router_id: "10.0.2.2"

	interfaces: [
		{name: "eth1", type: "physical", ipv4: "10.2.6.1/31", description: "uni-c-to-ce4"},
		{name: "eth2", type: "physical", ipv4: "10.2.8.0/31", description: "nni-to-pe2"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// --- MEF UNI configuration ---
	mef_config: {
		unis: [{
			uni_id:    "UNI-CE4"
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
				mep_id: 201
				ccm_interval: "1s"
				remote_mep_id: 101
				loopback: true
				linktrace: true
				performance_monitoring: true
			}
		}]
	}
}
