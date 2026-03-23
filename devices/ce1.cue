package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE1: L2VPN customer edge — connected to PE1 via pseudowire attachment circuit
ce1: device.#Device & {
	hostname:  "ce1"
	role:      "CE"
	router_id: "192.168.1.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.1.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.5.1/31", description: "to-pe1-l2vpn"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}]
	}
}
