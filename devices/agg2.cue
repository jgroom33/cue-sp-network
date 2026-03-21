package devices

import "github.com/jgroom/sp-network-model/schema/device"

agg2: device.#Device & {
	hostname:  "agg2"
	role:      "AGG"
	router_id: "10.0.0.11"

	interfaces: [
		{name: "lo0", type: "loopback", ipv4: "10.0.0.11/32"},
		{name: "eth1", type: "physical", ipv4: "10.1.0.23/31", description: "to-pe2-nni"},
		{name: "eth2", type: "physical", ipv4: "10.2.2.0/31", description: "to-ce3"},
	]

	// IS-IS L1L2: L2 toward PE/core, L1L2 boundary for access aggregation
	isis_config: {
		net:   "49.0001.0000.0000.0011.00"
		level: "L1L2"
		interfaces: [
			{name: "lo0", passive: true},
			{name: "eth1", level: "L2", metric: 10},
			// eth2 not in IS-IS — customer-facing
		]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 11, prefix: "10.0.0.11/32"}]
		adj_sids: [
			{label: 15001, interface: "eth1", neighbor: "10.1.0.22"},
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
		sbfd_reflector: {discriminator: 100011}
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
					name: "ce3-policer", type: "single-rate"
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

	// 802.1ad: NNI toward PE2, S-UNI toward CE3
	dot1ad_config: {
		interfaces: [
			{interface: "eth1", port_mode: "NNI", svlan: {svlan_id: 400}},
			{interface: "eth2", port_mode: "S-UNI", svlan: {svlan_id: 400}, cvlan_range: [10, 20]},
		]
	}
}
