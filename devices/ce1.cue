package devices

import "github.com/jgroom/sp-network-model/schema/device"

// CE1: dual-homed customer edge — connected to PE1 + PE2 on a shared LAN
// Handoff: eBGP routing + untagged encapsulation + L3 QoS
ce1: device.#Device & {
	hostname:  "ce1"
	role:      "CE"
	router_id: "192.168.1.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "192.168.1.1/32"},
		{name: "eth1", type: "physical", ipv4: "10.2.0.10/24", description: "dual-home-to-pe1-pe2"},
		{name: "eth2", type: "physical", description: "internal-lan"},
	]

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
	}

	// eBGP to both PEs for L3VPN PE-CE routing
	bgp_config: {
		asn:       65001
		router_id: "192.168.1.1"
		peer_groups: [{
			name: "PE-UPLINKS", remote_as: 65000, peer_type: "external"
			update_source: "eth1"
			address_families: ["ipv4-unicast"]
		}]
		neighbors: [
			{address: "10.2.0.1", remote_as: 65000, peer_type: "external", peer_group: "PE-UPLINKS", address_families: ["ipv4-unicast"], description: "to-pe1", bfd: true},
			{address: "10.2.0.2", remote_as: 65000, peer_type: "external", peer_group: "PE-UPLINKS", address_families: ["ipv4-unicast"], description: "to-pe2", bfd: true},
		]
	}

	// 802.1ad C-UNI port — customer VLAN tagging
	dot1ad_config: {
		interfaces: [{
			interface: "eth1", port_mode: "C-UNI"
			svlan: {svlan_id: 100, tpid: 0x8100}
			cvlan_range: [10, 20, 30]
		}]
	}

	// Default route to VRRP virtual IP
	static_routes: [
		{prefix: "0.0.0.0/0", next_hop: "10.2.0.254", description: "default-via-vrrp-vip"},
	]

	// --- CE Handoff: eBGP + untagged + L3 QoS ---
	handoff_config: {
		handoffs: [{
			name:             "ce1-to-pe1-pe2"
			side:             "ce"
			interface:        "eth1"
			service_type:     "l3vpn"
			routing_protocol: "bgp"
			bgp_routing: {
				asn: 65001
				neighbors: [
					{address: "10.2.0.1", remote_as: 65000, peer_type: "external", address_families: ["ipv4-unicast"], description: "to-pe1", bfd: true},
					{address: "10.2.0.2", remote_as: 65000, peer_type: "external", address_families: ["ipv4-unicast"], description: "to-pe2", bfd: true},
				]
				peer_groups: [{
					name: "PE-UPLINKS", remote_as: 65000, peer_type: "external"
					update_source: "eth1", address_families: ["ipv4-unicast"]
				}]
			}
			encapsulation: "untagged"
			untagged_encap: {}
			vrf: "CUSTOMER-A"
		}]
	}
}
