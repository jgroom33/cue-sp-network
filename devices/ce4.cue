package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE4: L2VPN customer edge — connected to PE2 via pseudowire attachment circuit
ce4: device.#Device & {
	hostname:  "ce4"
	role:      "CE"
	router_id: "192.168.4.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.4.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.6.0/31", description: "to-nid2-uni"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}]
	}
}
