package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE2: single-homed customer edge — connected to AGG1
// Handoff: static routing + single-tagged 802.1Q + L2 QoS (PCP classification)
ce2: device.#Device & {
	hostname:  "ce2"
	role:      "CE"
	router_id: "192.168.2.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.2.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.1.1/31", description: "to-agg1"},
		{name: "eth2", type: "physical", description: "internal-lan"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// 802.1Q: single-tagged trunk — IEEE 802.1Q-2022
	dot1q_config: {
		vlans: [
			{vlan_id: 10, name: "voice"},
			{vlan_id: 20, name: "data"},
		]
		interfaces: [{
			interface: "eth1", port_mode: "trunk"
			allowed_vlans: [10, 20]
			native_vlan: 1
		}]
	}

	// L2 QoS: PCP classification and mapping — IEEE 802.1Q-2022 Section 6.9.3
	l2qos_config: {
		mapping_tables: [{
			name: "ce2-pcp-map"
			pcp_to_dscp: [
				{pcp: 5, dscp: "ef"},      // voice
				{pcp: 4, dscp: "af41"},    // video
				{pcp: 3, dscp: "af21"},    // critical data
				{pcp: 2, dscp: "af11"},    // bulk data
				{pcp: 0, dscp: "be"},      // best effort
			]
		}]
		classification: [
			{name: "voice-pcp", match_pcp: [5], forwarding_class: "voice"},
			{name: "video-pcp", match_pcp: [4], forwarding_class: "video"},
			{name: "critical-data-pcp", match_pcp: [3], forwarding_class: "critical-data"},
			{name: "bulk-data-pcp", match_pcp: [2], forwarding_class: "bulk-data"},
			{name: "best-effort-pcp", match_pcp: [0, 1], forwarding_class: "best-effort"},
		]
	}

	// Static routes to provider
	static_routes: [
		{prefix: "0.0.0.0/0", next_hop: "10.2.1.0", description: "default-via-agg1"},
	]

	// --- CE Handoff: static + single-tagged 802.1Q + L2 QoS ---
	handoff_config: {
		handoffs: [{
			name:             "ce2-to-agg1"
			side:             "ce"
			interface:        "eth1"
			service_type:     "l3vpn"
			routing_protocol: "static"
			static_routing: {
				routes: [{prefix: "0.0.0.0/0", next_hop: "10.2.1.0", description: "default-via-agg1"}]
			}
			encapsulation: "dot1q"
			dot1q_encap: {
				config: {
					interfaces: [{
						interface: "eth1", port_mode: "trunk"
						allowed_vlans: [10, 20]
						native_vlan: 1
					}]
				}
			}
			qos: {
				l2_qos: {
					mapping_tables: [{
						name: "ce2-pcp-map"
						pcp_to_dscp: [
							{pcp: 5, dscp: "ef"},
							{pcp: 4, dscp: "af41"},
							{pcp: 3, dscp: "af21"},
							{pcp: 2, dscp: "af11"},
							{pcp: 0, dscp: "be"},
						]
					}]
					classification: [
						{name: "voice-pcp", match_pcp: [5], forwarding_class: "voice"},
						{name: "video-pcp", match_pcp: [4], forwarding_class: "video"},
						{name: "data-pcp", match_pcp: [3], forwarding_class: "critical-data"},
					]
				}
			}
			vrf: "CUSTOMER-CE2"
		}]
	}
}
