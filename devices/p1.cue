package devices

import "github.com/jgroom/sp-network-model/schema/device"

p1: device.#Device & {
	hostname:  "p1"
	role:      "P"
	router_id: "10.0.0.3"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.3/32"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.1/31", description: "to-pe1"},
		{name: "eth2", type: "physical", ipv4: "10.1.0.5/31", description: "to-pe2"},
		{name: "eth3", type: "physical", ipv4: "10.1.0.8/31", description: "to-p2"},
		{name: "eth4", type: "physical", ipv4: "10.1.0.10/31", description: "to-p3"},
	]

	isis_config: {
		net:   "49.0001.0000.0000.0003.00"
		level: "L2"
		interfaces: [
			{name: "lo0", passive: true},
			{name: "eth1", metric: 10},
			{name: "eth2", metric: 10},
			{name: "eth3", metric: 10},
			{name: "eth4", metric: 15},
		]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 3, prefix: "10.0.0.3/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.0"},
			{label: 15002, interface: "eth2", neighbor: "10.1.0.4"},
			{label: 15003, interface: "eth3", neighbor: "10.1.0.9"},
			{label: 15004, interface: "eth4", neighbor: "10.1.0.11"},
		]
	}

	tilfa_config: {
		default_protection: "node-link"
		interfaces: [
			{name: "eth1", protection: "node-link"},
			{name: "eth2", protection: "node-link"},
			{name: "eth3", protection: "node-link"},
			{name: "eth4", protection: "node-link"},
		]
		srlgs: [
			{id: 1, name: "fiber-bundle-east", interfaces: ["eth1"]},
			{id: 3, name: "inter-core-lower", interfaces: ["eth3"]},
			{id: 6, name: "inter-core-diagonal", interfaces: ["eth4"]},
		]
		microloop_avoidance: {enabled: true, rib_update_delay: 5000}
	}

	bfd_config: {
		profiles: [{name: "isis-fast", min_tx: 100, min_rx: 100, detect_multiplier: 3}]
		sessions: [
			{interface: "eth1", profile: "isis-fast"},
			{interface: "eth2", profile: "isis-fast"},
			{interface: "eth3", profile: "isis-fast"},
			{interface: "eth4", profile: "isis-fast"},
		]
		sbfd_reflector: {discriminator: 100003}
	}

	qos_config: {
		forwarding_classes: [
			{name: "network-control", dscp_match: ["cs6", "cs7"], mpls_tc: 7, queue_id: 7},
			{name: "voice",           dscp_match: ["ef"],         mpls_tc: 5, queue_id: 5},
			{name: "video",           dscp_match: ["af41", "af42", "af43", "cs4"], mpls_tc: 4, queue_id: 4},
			{name: "critical-data",   dscp_match: ["af21", "af22", "af23", "cs2"], mpls_tc: 3, queue_id: 3},
			{name: "bulk-data",       dscp_match: ["af11", "af12", "af13", "cs1"], mpls_tc: 2, queue_id: 2},
			{name: "best-effort",     dscp_match: ["be", "cs0"],  mpls_tc: 0, queue_id: 0},
		]
		policies: [{
			name: "CORE-EGRESS", type: "egress"
			schedulers: [
				{queue_id: 7, type: "strict-priority", priority: 0},
				{queue_id: 5, type: "strict-priority", priority: 1},
				{queue_id: 4, type: "weighted-fair", weight: 30, bandwidth_percent: 30},
				{queue_id: 3, type: "weighted-fair", weight: 25, bandwidth_percent: 25},
				{queue_id: 2, type: "weighted-fair", weight: 15, bandwidth_percent: 10},
				{queue_id: 0, type: "weighted-fair", weight: 10, bandwidth_percent: 5},
			]
			wred_profiles: [
				{name: "bulk-wred", min_threshold: 50, max_threshold: 90, drop_probability: 80, dscp_match: ["af11", "af12", "af13"]},
				{name: "be-wred", min_threshold: 30, max_threshold: 70, drop_probability: 100, dscp_match: ["be"]},
			]
		}]
		interface_bindings: [
			{interface: "eth1", egress_policy: "CORE-EGRESS"},
			{interface: "eth2", egress_policy: "CORE-EGRESS"},
			{interface: "eth3", egress_policy: "CORE-EGRESS"},
			{interface: "eth4", egress_policy: "CORE-EGRESS"},
		]
	}

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}, {name: "eth3"}, {name: "eth4"}]
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
	mgmt_vrf: {interface: "mgmt0", ipv4: "10.100.0.3/24", gateway: "10.100.0.254"}
}
