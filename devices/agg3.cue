package devices

import "github.com/jgroom/sp-network-model/schema/device"

agg3: device.#Device & {
	hostname:  "agg3"
	role:      "AGG"
	router_id: "10.0.0.14"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.14/32"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.29/31", description: "to-pe1-nni"},
		{name: "eth2", type: "physical", ipv4: "10.2.3.0/31", description: "to-ce1"},
	]

	// IS-IS L1L2: L2 toward PE/core, L1L2 boundary for access aggregation
	isis_config: {
		net:   "49.0001.0000.0000.0014.00"
		level: "L1L2"
		authentication: {type: "md5", key: "ISIS-KEY-1", key_id: 1}
		interfaces: [
			{name: "lo0", passive: true},
			{name: "eth1", level: "L2", metric: 10},
			// eth2 not in IS-IS — customer-facing
		]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 14, prefix: "10.0.0.14/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.28"},
		]
	}

	tilfa_config: {
		default_protection: "link"
		interfaces: [{name: "eth1", protection: "link"}]
		microloop_avoidance: {enabled: true, rib_update_delay: 5000}
	}

	bfd_config: {
		profiles: [{name: "isis-fast", min_tx: 100, min_rx: 100, detect_multiplier: 3}]
		sessions: [{interface: "eth1", profile: "isis-fast"}]
		sbfd_reflector: {discriminator: 100014}
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
		policies: [
			{
				name: "ACCESS-INGRESS", type: "ingress"
				classification: [
					{name: "match-voice", match_dscp: ["ef"], forwarding_class: "voice"},
					{name: "match-video", match_dscp: ["af41", "af42", "af43"], forwarding_class: "video"},
					{name: "match-critical", match_dscp: ["af21", "af22", "af23"], forwarding_class: "critical-data"},
				]
				policers: [{
					name: "ce1-policer", type: "single-rate"
					cir: 100000, cbs: 32768
					conform_action: {action: "transmit"}
					exceed_action: {action: "drop"}
				}]
			},
			{
				name: "CORE-EGRESS", type: "egress"
				schedulers: [
					{queue_id: 7, type: "strict-priority", priority: 0},
					{queue_id: 5, type: "strict-priority", priority: 1},
					{queue_id: 4, type: "weighted-fair", weight: 30, bandwidth_percent: 30},
					{queue_id: 3, type: "weighted-fair", weight: 25, bandwidth_percent: 25},
					{queue_id: 2, type: "weighted-fair", weight: 15, bandwidth_percent: 10},
					{queue_id: 0, type: "weighted-fair", weight: 10, bandwidth_percent: 5},
				]
			},
		]
		interface_bindings: [
			{interface: "eth1", egress_policy: "CORE-EGRESS"},
			{interface: "eth2", ingress_policy: "ACCESS-INGRESS"},
		]
	}

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [{name: "eth1"}, {name: "eth2"}]
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

	// --- NTP ---
	ntp_config: {
		servers: [
			{address: "10.100.0.200", prefer: true, iburst: true, key_id: 1, vrf: "MGMT"},
			{address: "10.100.0.201", iburst: true, key_id: 1, vrf: "MGMT"},
		]
		authentication: [{key_id: 1, type: "sha256", key: "NTP-AUTH-KEY-1"}]
		source_interface: "lo0"
	}

	// --- Management VRF ---
	mgmt_vrf: {interface: "mgmt0", ipv4: "10.100.0.14/24", gateway: "10.100.0.254"}
}
