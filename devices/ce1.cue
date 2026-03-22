package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE1: dual-homed customer edge — connected via AGG3 (to PE1) + AGG4 (to PE2)
// Handoff: static routing + untagged encapsulation + L3 QoS
ce1: device.#Device & {
	hostname:  "ce1"
	role:      "CE"
	router_id: "192.168.1.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.1.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.3.1/31", description: "to-agg3"},
		{name: "eth2", type: "physical", ipv4: "10.2.4.1/31", description: "to-agg4"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// Static default routes via both AGG uplinks (ECMP)
	static_routes: [
		{prefix: "0.0.0.0/0", next_hop: "10.2.3.0", description: "default-via-agg3"},
		{prefix: "0.0.0.0/0", next_hop: "10.2.4.0", description: "default-via-agg4"},
	]

	// --- CE Handoff: static + untagged ---
	handoff_config: {
		handoffs: [
			{
				name:             "ce1-to-pe1-via-agg3"
				side:             "ce"
				interface:        "eth1"
				service_type:     "l3vpn"
				routing_protocol: "static"
				static_routing: {
					routes: [{prefix: "0.0.0.0/0", next_hop: "10.2.3.0", description: "default-via-agg3"}]
				}
				encapsulation: "untagged"
				untagged_encap: {}
				vrf: "CUSTOMER-A"
			},
			{
				name:             "ce1-to-pe2-via-agg4"
				side:             "ce"
				interface:        "eth2"
				service_type:     "l3vpn"
				routing_protocol: "static"
				static_routing: {
					routes: [{prefix: "0.0.0.0/0", next_hop: "10.2.4.0", description: "default-via-agg4"}]
				}
				encapsulation: "untagged"
				untagged_encap: {}
				vrf: "CUSTOMER-A"
			},
		]
	}
}
