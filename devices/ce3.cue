package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE3: single-homed customer edge — connected to AGG2
// Handoff: OSPF routing + double-tagged 802.1ad + L2+L3 QoS
ce3: device.#Device & {
	hostname:  "ce3"
	role:      "CE"
	router_id: "192.168.3.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.3.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.2.1/31", description: "to-agg2"},
		{name: "eth2", type: "physical", description: "internal-lan"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// OSPF PE-CE routing — RFC 2328 (OSPFv2), RFC 4577 (PE-CE)
	ospf_config: {
		version:   2
		router_id: "192.168.3.1"
		areas: [{area_id: "0.0.0.0", area_type: "backbone"}]
		interfaces: [{
			name: "eth1", area_id: "0.0.0.0"
			network_type: "point-to-point", metric: 10
			hello_interval: 10, dead_interval: 40
		}]
	}

	// 802.1ad: C-UNI — double-tagged Q-in-Q
	dot1ad_config: {
		interfaces: [{
			interface: "eth1", port_mode: "C-UNI"
			svlan: {svlan_id: 400, tpid: 0x8100}
			cvlan_range: [10, 20]
		}]
	}

	// L2 QoS: bidirectional PCP↔DSCP mapping — RFC 8325
	l2qos_config: {
		mapping_tables: [{
			name: "ce3-pcp-map"
			pcp_to_dscp: [
				{pcp: 5, dscp: "ef"},
				{pcp: 4, dscp: "af41"},
				{pcp: 3, dscp: "af21"},
				{pcp: 0, dscp: "be"},
			]
			dscp_to_pcp: [
				{dscp: "ef", pcp: 5},
				{dscp: "af41", pcp: 4},
				{dscp: "af21", pcp: 3},
				{dscp: "be", pcp: 0},
			]
		}]
		classification: [
			{name: "voice-pcp", match_pcp: [5], forwarding_class: "voice"},
			{name: "video-pcp", match_pcp: [4], forwarding_class: "video"},
			{name: "data-pcp", match_pcp: [3], forwarding_class: "critical-data"},
		]
	}

	// --- CE Handoff: OSPF + double-tagged 802.1ad + L2+L3 QoS ---
	handoff_config: {
		handoffs: [{
			name:             "ce3-to-agg2"
			side:             "ce"
			interface:        "eth1"
			service_type:     "l3vpn"
			routing_protocol: "ospf"
			ospf_routing: {
				config: {
					version: 2, router_id: "192.168.3.1"
					areas: [{area_id: "0.0.0.0", area_type: "backbone"}]
					interfaces: [{
						name: "eth1", area_id: "0.0.0.0"
						network_type: "point-to-point", metric: 10
					}]
				}
			}
			encapsulation: "dot1ad"
			dot1ad_encap: {
				config: {
					interfaces: [{
						interface: "eth1", port_mode: "C-UNI"
						svlan: {svlan_id: 400, tpid: 0x8100}
						cvlan_range: [10, 20]
					}]
				}
			}
			qos: {
				l2_qos: {
					mapping_tables: [{
						name: "ce3-pcp-map"
						pcp_to_dscp: [
							{pcp: 5, dscp: "ef"},
							{pcp: 4, dscp: "af41"},
							{pcp: 3, dscp: "af21"},
							{pcp: 0, dscp: "be"},
						]
						dscp_to_pcp: [
							{dscp: "ef", pcp: 5},
							{dscp: "af41", pcp: 4},
							{dscp: "af21", pcp: 3},
							{dscp: "be", pcp: 0},
						]
					}]
				}
			}
			vrf: "CUSTOMER-C"
		}]
	}
}
