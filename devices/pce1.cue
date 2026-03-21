package devices

import "github.com/jgroom/sp-network-model/schema/device"

pce1: device.#Device & {
	hostname:  "pce1"
	role:      "PCE"
	router_id: "10.0.0.13"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.13/32"},
	]

	isis_config: {
		net:   "49.0001.0000.0000.0013.00"
		level: "L2"
		interfaces: [{name: "lo0", passive: true}]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 13, prefix: "10.0.0.13/32"}]
	}

	bfd_config: {
		profiles: [{name: "bgp-multihop", min_tx: 300, min_rx: 300, detect_multiplier: 3}]
		sessions: [
			{remote: "10.0.0.5", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.6", multihop: true, profile: "bgp-multihop"},
		]
		sbfd_reflector: {discriminator: 100013}
	}

	qos_config: {
		forwarding_classes: [
			{name: "network-control", dscp_match: ["cs6", "cs7"], mpls_tc: 7, queue_id: 7},
			{name: "best-effort",     dscp_match: ["be", "cs0"],  mpls_tc: 0, queue_id: 0},
		]
	}

	lldp_config: {tx_interval: 30, hold_multiplier: 4}

	bgp_config: {
		asn:       65000
		router_id: "10.0.0.13"
		peer_groups: [{
			name: "IBGP-RR", remote_as: 65000, peer_type: "internal"
			update_source: "lo0"
			address_families: ["ipv4-unicast", "link-state"]
		}]
		neighbors: [
			{
				address: "10.0.0.5", remote_as: 65000, peer_type: "internal"
				peer_group: "IBGP-RR", update_source: "lo0"
				address_families: ["ipv4-unicast", "link-state"]
				description: "to-rr1"
			},
			{
				address: "10.0.0.6", remote_as: 65000, peer_type: "internal"
				peer_group: "IBGP-RR", update_source: "lo0"
				address_families: ["ipv4-unicast", "link-state"]
				description: "to-rr2"
			},
		]
	}

	// --- ACL ---
	acl_config: {
		acls: [
			{
				name: "INFRASTRUCTURE-PROTECT", type: "ipv4-extended"
				entries: [
					{sequence: 10, action: "permit", match: {protocol: "tcp", dst_port: 179}, description: "allow-bgp"},
					{sequence: 20, action: "permit", match: {protocol: "ospf"}, description: "allow-ospf"},
					{sequence: 30, action: "permit", match: {protocol: 89}, description: "allow-ospf-proto"},
					{sequence: 40, action: "permit", match: {protocol: "udp", dst_port: 3784}, description: "allow-bfd-single"},
					{sequence: 50, action: "permit", match: {protocol: "udp", dst_port: 4784}, description: "allow-bfd-multi"},
					{sequence: 60, action: "permit", match: {protocol: "icmp"}, description: "allow-icmp"},
					{sequence: 70, action: "permit", match: {protocol: "udp", dst_port: 646}, description: "allow-ldp"},
					{sequence: 100, action: "deny", match: {}, description: "deny-all-else", log: true},
				]
			},
		]
	}

	// --- CoPP ---
	copp_config: {
		policy: {
			name: "COPP-STANDARD"
			entries: [
				{protocol_class: "bgp", policer: {cir: 10000, cbs: 8192}},
				{protocol_class: "ospf", policer: {cir: 10000, cbs: 8192}},
				{protocol_class: "isis", policer: {cir: 10000, cbs: 8192}},
				{protocol_class: "bfd", policer: {cir: 5000, cbs: 4096}},
				{protocol_class: "icmp", policer: {cir: 2000, cbs: 4096}},
				{protocol_class: "ssh", policer: {cir: 1000, cbs: 2048}},
				{protocol_class: "snmp", policer: {cir: 2000, cbs: 4096}},
				{protocol_class: "ntp", policer: {cir: 1000, cbs: 2048}},
				{protocol_class: "lldp", policer: {cir: 1000, cbs: 2048}},
				{protocol_class: "arp", policer: {cir: 2000, cbs: 4096}},
				{protocol_class: "default", policer: {cir: 500, cbs: 2048, exceed_action: "drop"}},
			]
		}
	}

	// --- Management VRF ---
	mgmt_vrf: {interface: "mgmt0", ipv4: "10.100.0.13/24", gateway: "10.100.0.254"}
}
