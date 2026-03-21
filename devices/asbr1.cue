package devices

import "github.com/jgroom/sp-network-model/schema/device"

asbr1: device.#Device & {
	hostname:  "asbr1"
	role:      "ASBR"
	router_id: "10.0.0.9"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.9/32"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.17/31", description: "to-p3"},
		{name: "eth2", type: "physical", ipv4: "10.1.0.19/31", description: "to-p4"},
		{name: "eth3", type: "physical", ipv4: "203.0.113.0/31", description: "to-upstream-isp"},
	]

	isis_config: {
		net:   "49.0001.0000.0000.0009.00"
		level: "L2"
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
		node_sids: [{index: 9, prefix: "10.0.0.9/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.16"},
			{label: 15002, interface: "eth2", neighbor: "10.1.0.18"},
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
		sbfd_reflector: {discriminator: 100009}
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
		router_id: "10.0.0.9"
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
				address: "203.0.113.1", remote_as: 64999, peer_type: "external"
				peer_group: "EBGP-UPSTREAM"
				address_families: ["ipv4-unicast", "ipv6-unicast"]
				description: "upstream-isp"
				bfd: true
			},
		]
	}
}
