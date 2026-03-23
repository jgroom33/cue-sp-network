package devices

import "github.com/jgroom/sp-network-model/schema/device"

pe1: device.#Device & {
	hostname:  "pe1"
	role:      "PE"
	router_id: "10.0.0.1"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.1/32"},
		{name: "lo1", type: "loopback", ipv4: "10.0.1.1/32", description: "vtep-source"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.0/31", description: "to-p1"},
		{name: "eth2", type: "physical", ipv4: "10.1.0.2/31", description: "to-p3"},
		{name: "eth3", type: "physical", description: "customer-a-facing"},
		{name: "eth3.100", type: "subinterface", description: "customer-a-l3vpn"},
		{name: "eth4", type: "physical", ipv4: "10.2.7.1/31", description: "to-nid1-nni-l2vpn"},
		{name: "eth5", type: "physical", ipv4: "10.1.0.34/31", description: "to-agg5-ring-west"},
		{name: "eth6", type: "physical", ipv4: "10.1.0.20/31", description: "to-agg1-ring-east"},
	]

	// --- IS-IS ---
	isis_config: {
		net:   "49.0001.0000.0000.0001.00"
		level: "L2"
		authentication: {type: "md5", key: "ISIS-KEY-1", key_id: 1}
		interfaces: [
			{name: "lo0", passive: true},
			{name: "eth1", metric: 10},
			{name: "eth2", metric: 50},  // backup path to p3
			{name: "eth5", metric: 15},  // ring west to agg5
			{name: "eth6", metric: 15},  // ring east to agg1
		]
	}

	// --- SR-MPLS ---
	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 1, prefix: "10.0.0.1/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.1"},
			{label: 15002, interface: "eth2", neighbor: "10.1.0.3"},  // p3:eth5
			{label: 15003, interface: "eth5", neighbor: "10.1.0.35"},
			{label: 15004, interface: "eth6", neighbor: "10.1.0.21"},
		]
	}

	// --- TI-LFA ---
	tilfa_config: {
		default_protection: "node-link"
		interfaces: [
			{name: "eth1", protection: "node-link"},
			{name: "eth2", protection: "node-link"},
			{name: "eth5", protection: "link"},
			{name: "eth6", protection: "link"},
		]
		srlgs: [
			{id: 1, name: "fiber-bundle-east", interfaces: ["eth1"]},
		]
		microloop_avoidance: {enabled: true, rib_update_delay: 5000}
	}

	// --- BFD ---
	bfd_config: {
		profiles: [
			{name: "isis-fast", min_tx: 100, min_rx: 100, detect_multiplier: 3},
			{name: "bgp-multihop", min_tx: 300, min_rx: 300, detect_multiplier: 3},
			{name: "ebgp-direct", min_tx: 300, min_rx: 300, detect_multiplier: 3},
		]
		sessions: [
			{interface: "eth1", profile: "isis-fast"},
			{interface: "eth2", profile: "isis-fast"},
			{interface: "eth5", profile: "isis-fast"},
			{interface: "eth6", profile: "isis-fast"},
			{remote: "10.0.0.5", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.6", multihop: true, profile: "bgp-multihop"},
		]
		sbfd_reflector: {discriminator: 100001}
	}

	// --- SR-TE / SR Policy ---
	sr_policy_config: {
		max_sid_depth: 6
		policies: [
			{
				name: "to-pe2-low-latency", color: 100, endpoint: "10.0.0.2"
				binding_sid: {label: 24001}
				candidate_paths: [
					{
						name: "via-p1-p2", preference: 200
						segment_lists: [{name: "p1-direct", segments: [{type: "node-sid", sid: 3}, {type: "node-sid", sid: 2}]}]
					},
					{
						name: "via-p2-direct", preference: 150
						segment_lists: [{name: "p2-direct", segments: [{type: "node-sid", sid: 4}, {type: "node-sid", sid: 2}]}]
					},
					{
						name: "via-p3-p4", preference: 100
						segment_lists: [{name: "upper-path", segments: [{type: "node-sid", sid: 7}, {type: "node-sid", sid: 8}, {type: "node-sid", sid: 2}]}]
						constraints: {max_segments: 4}
					},
				]
			},
			{
				name: "to-asbr1-transit", color: 200, endpoint: "10.0.0.9"
				binding_sid: {label: 24002}
				candidate_paths: [{
					name: "via-p1-p3", preference: 200
					segment_lists: [{name: "north-path", segments: [{type: "node-sid", sid: 3}, {type: "node-sid", sid: 7}, {type: "node-sid", sid: 9}]}]
				}]
			},
		]
		odn_templates: [{
			color: 100
			candidate_paths: [{
				name: "odn-low-latency", preference: 100
				segment_lists: [{name: "dynamic", segments: [{type: "node-sid", sid: 0}]}]
				constraints: {max_segments: 4}
			}]
		}]
	}

	// --- QoS ---
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
				name: "SP-INGRESS", type: "ingress"
				classification: [
					{name: "match-voice", match_dscp: ["ef"], forwarding_class: "voice"},
					{name: "match-video", match_dscp: ["af41", "af42", "af43"], forwarding_class: "video"},
					{name: "match-critical", match_dscp: ["af21", "af22", "af23"], forwarding_class: "critical-data"},
					{name: "match-bulk", match_dscp: ["af11", "af12", "af13"], forwarding_class: "bulk-data"},
					{name: "match-nc", match_dscp: ["cs6", "cs7"], forwarding_class: "network-control"},
				]
				policers: [{
					name: "customer-a-policer", type: "dual-rate"
					cir: 500000, cbs: 65536, pir: 1000000, pbs: 131072
					conform_action: {action: "transmit"}
					exceed_action: {action: "remark", set_dscp: "af13"}
					violate_action: {action: "drop"}
				}]
			},
			{
				name: "SP-EGRESS", type: "egress"
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
			},
		]
		interface_bindings: [
			{interface: "eth1", ingress_policy: "SP-INGRESS", egress_policy: "SP-EGRESS"},
			{interface: "eth2", ingress_policy: "SP-INGRESS", egress_policy: "SP-EGRESS"},
			{interface: "eth3", ingress_policy: "SP-INGRESS", egress_policy: "SP-EGRESS"},
			{interface: "eth5", ingress_policy: "SP-INGRESS", egress_policy: "SP-EGRESS"},
			{interface: "eth6", ingress_policy: "SP-INGRESS", egress_policy: "SP-EGRESS"},
		]
	}

	// --- LLDP ---
	lldp_config: {
		tx_interval: 30, hold_multiplier: 4
		interfaces: [
			{name: "eth1"}, {name: "eth2"}, {name: "eth3"},
			{name: "eth4"}, {name: "eth5"}, {name: "eth6"},
		]
	}

	// --- BGP ---
	bgp_config: {
		asn:       65000
		router_id: "10.0.0.1"
		graceful_restart: {restart_time: 120, stalepath_time: 360}
		peer_groups: [
			{
				name: "IBGP-RR", remote_as: 65000, peer_type: "internal"
				update_source: "lo0"
				address_families: ["ipv4-unicast", "ipv6-unicast", "l3vpn-ipv4", "evpn"]
			},
		]
		neighbors: [
			{address: "10.0.0.5", remote_as: 65000, peer_type: "internal", peer_group: "IBGP-RR", update_source: "lo0", address_families: ["ipv4-unicast", "l3vpn-ipv4", "evpn"], description: "to-rr1"},
			{address: "10.0.0.6", remote_as: 65000, peer_type: "internal", peer_group: "IBGP-RR", update_source: "lo0", address_families: ["ipv4-unicast", "l3vpn-ipv4", "evpn"], description: "to-rr2"},
		]
		l3vpns: [{
			name: "CUSTOMER-A", rd: "65000:100"
			rt_import: ["65000:100"], rt_export: ["65000:100"]
			interfaces: ["eth3.100"]
		}]
		evpn_instances: [{
			name: "ELAN-A", evi: 100, rd: "65000:10100"
			rt_import: ["65000:10100"], rt_export: ["65000:10100"]
		}]
	}

	// --- G.8032 ERPS ring: RPL owner — PE1 is the ring interconnection node ---
	erps_config: {
		rings: [{
			ring_id: 1, ring_name: "ACCESS-RING-1"
			control_vlan: 4090
			data_vlans: [100, 200, 300]
			ring_ports: [
				{interface: "eth6", port_role: "east"},    // toward agg1
				{interface: "eth5", port_role: "west", admin_state: "blocked"},  // toward agg5 (RPL)
			]
			node_role: "rpl-owner"
			rpl_port: {port: "west", role: "owner"}
			wait_to_restore: 5
			guard_timer: 500
			revertive: true
		}]
	}

	// --- 802.1ad ---
	dot1ad_config: {
		interfaces: [
			{interface: "eth3", port_mode: "S-UNI", svlan: {svlan_id: 100}, cvlan_range: [10, 20, 30]},
			{interface: "eth5", port_mode: "NNI", svlan: {svlan_id: 300}},
			{interface: "eth6", port_mode: "NNI", svlan: {svlan_id: 300}},
		]
	}

	// --- L2VPN / Pseudowires ---
	l2vpn_config: {
		vpws: [{
			name: "CUST-A-P2P", service_id: 1001, interface: "eth4"
			pseudowire: {pw_id: 1001, peer: "10.0.0.2", pw_type: "ethernet", control_word: true}
		}]
		vpls: [{
			name: "CUST-A-VPLS", vpls_id: 2001, rd: "65000:2001"
			rt_import: ["65000:2001"], rt_export: ["65000:2001"]
			signaling: "bgp", interfaces: ["eth3.100"]
			mac_table_size: 32768, mac_aging_time: 300
		}]
	}

	// --- VXLAN + EVPN-VXLAN ---
	vxlan_config: {
		vtep: {source: {interface: "lo1", ipv4: "10.0.1.1"}, learning: "control-plane"}
		l2_vnis: [{
			vni: 10100, vlan_id: 100
			rt_import: ["65000:10100"], rt_export: ["65000:10100"]
			evi: 100, arp_suppression: true, ingress_replication: true
		}]
		l3_vnis: [{
			vni: 10999, vrf: "CUSTOMER-A"
			rt_import: ["65000:10999"], rt_export: ["65000:10999"]
		}]
		anycast_gateway: {
			virtual_mac: "00:00:5e:00:01:01"
			interfaces: [{vlan_id: 100, ipv4: "10.2.0.1/24"}]
		}
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
		community_lists: [{
			name: "CUSTOMER-ROUTES", type: "standard"
			entries: [{action: "permit", community: "65000:100"}]
		}]
		route_maps: [{
			name: "PE-CE-IMPORT"
			entries: [
				{sequence: 10, action: "permit", set: {local_pref: 200, community: ["65000:100"], community_mode: "add"}},
			]
		}, {
			name: "PE-CE-EXPORT"
			entries: [
				{sequence: 10, action: "permit", match: {community_list: "CUSTOMER-ROUTES"}},
				{sequence: 999, action: "deny"},
			]
		}]
	}

	// --- Management VRF ---
	mgmt_vrf: {interface: "mgmt0", ipv4: "10.100.0.1/24", gateway: "10.100.0.254"}

	// --- NTP ---
	ntp_config: {
		servers: [
			{address: "10.100.0.200", prefer: true, iburst: true, key_id: 1, vrf: "MGMT"},
			{address: "10.100.0.201", iburst: true, key_id: 1, vrf: "MGMT"},
		]
		authentication: [{key_id: 1, type: "sha256", key: "NTP-AUTH-KEY-1"}]
		source_interface: "lo0"
	}

	// --- CE Handoff --- (PE side, via aggregation layer)
	handoff_config: {
		handoffs: [
			{
				name: "pe1-to-ce2-via-agg1", side: "pe", interface: "eth6"
				service_type: "l3vpn", routing_protocol: "static", encapsulation: "dot1q"
				static_routing: {
					routes: [{prefix: "10.2.1.0/31", next_hop: "10.1.0.21", description: "ce2-via-agg1"}]
				}
				dot1q_encap: {
					config: {
						interfaces: [{interface: "eth6", port_mode: "trunk", allowed_vlans: [10, 20]}]
					}
				}
				qos: {
					l2_qos: {
						mapping_tables: [{
							name: "ce2-pcp-ingress"
							pcp_to_dscp: [
								{pcp: 5, dscp: "ef"}, {pcp: 4, dscp: "af41"},
								{pcp: 3, dscp: "af21"}, {pcp: 0, dscp: "be"},
							]
						}]
					}
				}
				vrf: "CUSTOMER-CE2"
			},
		]
	}
}
