package devices

import "github.com/jgroom/sp-network-model/schema/device"

asbr2: device.#Device & {
	hostname:  "asbr2"
	role:      "ASBR"
	router_id: "10.0.0.12"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.12/32"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.25/31", description: "to-p3"},
		{name: "eth2", type: "physical", ipv4: "10.1.0.27/31", description: "to-p4"},
		{name: "eth3", type: "physical", ipv4: "203.0.113.2/31", description: "to-upstream-isp"},
	]

	isis_config: {
		net:   "49.0001.0000.0000.0012.00"
		level: "L2"
		authentication: {type: "md5", key: "ISIS-KEY-1", key_id: 1}
		interfaces: [
			{name: "lo0", passive: true},
			{name: "eth1", metric: 20},
			{name: "eth2", metric: 20},
			// eth3 not in IS-IS — eBGP peering link
		]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 12, prefix: "10.0.0.12/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.24"},
			{label: 15002, interface: "eth2", neighbor: "10.1.0.26"},
		]
	}

	tilfa_config: {
		default_protection: "node-link"
		interfaces: [
			{name: "eth1", protection: "node-link"},
			{name: "eth2", protection: "node-link"},
		]
		microloop_avoidance: {enabled: true, rib_update_delay: 5000}
	}

	bfd_config: {
		profiles: [
			{name: "isis-fast", min_tx: 100, min_rx: 100, detect_multiplier: 3},
			{name: "ebgp-direct", min_tx: 300, min_rx: 300, detect_multiplier: 3},
			{name: "bgp-multihop", min_tx: 300, min_rx: 300, detect_multiplier: 3},
		]
		sessions: [
			{interface: "eth1", profile: "isis-fast"},
			{interface: "eth2", profile: "isis-fast"},
			{interface: "eth3", profile: "ebgp-direct"},
			{remote: "10.0.0.5", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.6", multihop: true, profile: "bgp-multihop"},
		]
		sbfd_reflector: {discriminator: 100012}
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
				name: "EDGE-INGRESS", type: "ingress"
				classification: [
					{name: "match-voice", match_dscp: ["ef"], forwarding_class: "voice"},
					{name: "match-video", match_dscp: ["af41", "af42", "af43"], forwarding_class: "video"},
					{name: "match-critical", match_dscp: ["af21", "af22", "af23"], forwarding_class: "critical-data"},
					{name: "match-nc", match_dscp: ["cs6", "cs7"], forwarding_class: "network-control"},
				]
				policers: [{
					name: "upstream-policer", type: "single-rate"
					cir: 10000000, cbs: 1048576
					conform_action: {action: "transmit"}
					exceed_action: {action: "remark", set_dscp: "be"}
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
			{interface: "eth2", egress_policy: "CORE-EGRESS"},
			{interface: "eth3", ingress_policy: "EDGE-INGRESS"},
		]
	}

	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [
			{name: "eth1"},
			{name: "eth2"},
			{name: "eth3"},
		]
	}

	bgp_config: {
		asn:       65000
		router_id: "10.0.0.12"
		graceful_restart: {restart_time: 120, stalepath_time: 360}
		peer_groups: [
			{
				name: "IBGP-RR", remote_as: 65000, peer_type: "internal"
				update_source: "lo0"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				next_hop_self: true
			},
			{
				name: "EBGP-UPSTREAM", remote_as: 64999, peer_type: "external"
				update_source: "eth3"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
			},
		]
		neighbors: [
			{
				address: "10.0.0.5", remote_as: 65000, peer_type: "internal"
				peer_group: "IBGP-RR", update_source: "lo0"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description: "to-rr1"
			},
			{
				address: "10.0.0.6", remote_as: 65000, peer_type: "internal"
				peer_group: "IBGP-RR", update_source: "lo0"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description: "to-rr2"
			},
			{
				address: "203.0.113.3", remote_as: 64999, peer_type: "external"
				peer_group: "EBGP-UPSTREAM"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description:      "upstream-isp"
				bfd:              true
				authentication: {key: "UPSTREAM-SECRET-KEY"}
				import_policy: "EBGP-INGRESS"
				export_policy: "EBGP-EGRESS"
				maximum_prefix: 500000
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

	// --- Route Policy ---
	route_policy_config: {
		prefix_lists: [
			{
				name: "BOGON-PREFIXES"
				entries: [
					{sequence: 10, action: "deny", prefix: "0.0.0.0/8", le: 32},
					{sequence: 20, action: "deny", prefix: "10.0.0.0/8", le: 32},
					{sequence: 30, action: "deny", prefix: "127.0.0.0/8", le: 32},
					{sequence: 40, action: "deny", prefix: "169.254.0.0/16", le: 32},
					{sequence: 50, action: "deny", prefix: "172.16.0.0/12", le: 32},
					{sequence: 60, action: "deny", prefix: "192.0.2.0/24", le: 32},
					{sequence: 70, action: "deny", prefix: "192.168.0.0/16", le: 32},
					{sequence: 80, action: "deny", prefix: "198.51.100.0/24", le: 32},
					{sequence: 90, action: "deny", prefix: "203.0.113.0/24", le: 32},
					{sequence: 1000, action: "permit", prefix: "0.0.0.0/0", le: 24},
				]
			},
		]
		as_path_lists: [{
			name: "UPSTREAM-AS-ONLY"
			entries: [{action: "permit", regex: "^64999_"}]
		}]
		community_lists: [{
			name: "UPSTREAM-LEARNED", type: "standard"
			entries: [{action: "permit", community: "65000:999"}]
		}]
		route_maps: [
			{
				name: "EBGP-INGRESS"
				entries: [
					{sequence: 10, action: "deny", match: {prefix_list: "BOGON-PREFIXES"}},
					{sequence: 20, action: "permit", set: {local_pref: 100, community: ["65000:999"], community_mode: "add"}},
				]
			},
			{
				name: "EBGP-EGRESS"
				entries: [
					{sequence: 10, action: "deny", match: {prefix_list: "BOGON-PREFIXES"}},
					{sequence: 20, action: "permit"},
				]
			},
		]
	}

	// --- RPKI ---
	rpki_config: {
		servers: [{
			address: "10.100.0.100", port: 323, preference: 1
			refresh_interval: 3600, retry_interval: 600, expire_interval: 7200
		}]
		validation_policy: {
			entries: [
				{state: "valid", action: "accept"},
				{state: "invalid", action: "reject"},
				{state: "not-found", action: "accept"},
			]
		}
	}

	// --- Flowspec ---
	flowspec_config: {
		validation: {accept_ibgp: true, accept_ebgp: false, max_rules: 1000}
	}

	// --- MACsec ---
	macsec_config: {
		mka_policies: [{name: "PEERING-MACSEC", cipher_suite: "gcm-aes-256", key_server_priority: 16}]
		key_chains: [{name: "UPSTREAM-KEYS", keys: [{id: 1, key_string: "0x4153425232"}]}]
		interfaces: [{interface: "eth3", mka_policy: "PEERING-MACSEC", key_chain: "UPSTREAM-KEYS"}]
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
	mgmt_vrf: {interface: "mgmt0", ipv4: "10.100.0.12/24", gateway: "10.100.0.254"}
}
