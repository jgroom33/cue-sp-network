package devices

import "github.com/jgroom/sp-network-model/schema/device"

isp_upstream: device.#Device & {
	hostname:  "isp-upstream"
	role:      "EXTERNAL"
	router_id: "203.0.113.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "203.0.113.1/32"},
		{name: "eth1", type: "physical", ipv4: "203.0.113.1/31", description: "to-asbr1"},
		{name: "eth2", type: "physical", ipv4: "203.0.113.3/31", description: "to-asbr2"},
	]

	bgp_config: {
		asn:       64999
		router_id: "203.0.113.1"
		peer_groups: [{
			name: "EBGP-SP", remote_as: 65000, peer_type: "external"
			update_source: "lo0"
			address_families: ["ipv4-unicast", "ipv6-unicast"]
		}]
		neighbors: [
			{
				address: "203.0.113.0", remote_as: 65000, peer_type: "external"
				peer_group: "EBGP-SP"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description: "to-asbr1"
			},
			{
				address: "203.0.113.2", remote_as: 65000, peer_type: "external"
				peer_group: "EBGP-SP"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description: "to-asbr2"
			},
		]
	}

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}
}
