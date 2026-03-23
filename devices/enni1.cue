package devices

import "github.com/jgroom/sp-network-model/schema/device"

// ENNI1: External Network-Network Interface — Carrier A boundary device
// MEF ENNI demarcation for inter-carrier E-Line services
enni1: device.#Device & {
	hostname:  "enni1"
	role:      "NID"
	router_id: "10.0.2.3"

	interfaces: [
		{name: "eth1", type: "physical", ipv4: "10.2.9.0/31", description: "enni-to-enni2"},
		{name: "eth2", type: "physical", ipv4: "10.2.10.0/31", description: "nni-to-pe1"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	mef_config: {
		unis: [{
			uni_id:    "ENNI-CARRIER-A"
			uni_type:  "ENNI"
			interface: "eth1"
			evc_id:    "EVC-INTERCARRIER-2001"
			evc_type:  "point-to-point"
			bandwidth_profile: {
				cir: 1000000   // 1 Gbps committed
				cbs: 131072
				eir: 2000000   // 2 Gbps excess
				ebs: 262144
				color_mode: "color-aware"
			}
			cos_mapping: {
				type: "pcp"
				pcp_entries: [
					{pcp: 5, cos_name: "voice", color: "green"},
					{pcp: 4, cos_name: "video", color: "green"},
					{pcp: 3, cos_name: "critical-data", color: "green"},
					{pcp: 0, cos_name: "best-effort", color: "green"},
				]
			}
			service_oam: {
				md_level: 2    // Lower MD level for ENNI (operator boundary)
				mep_id: 301
				ccm_interval: "100ms"
				remote_mep_id: 302
				loopback: true
				linktrace: true
				performance_monitoring: true
			}
		}]
	}
}
