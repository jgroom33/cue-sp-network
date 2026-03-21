package devices

import "github.com/jgroom/sp-network-model/schema/device"

rr2: device.#Device & {
	hostname:  "rr2"
	role:      "RR"
	router_id: "10.0.0.6"

	interfaces: [{name: "lo0", type: "loopback", ipv4: "10.0.0.6/32"}]

	isis_config: {
		net:   "49.0001.0000.0000.0006.00"
		level: "L2"
		interfaces: [{name: "lo0", passive: true}]
	}

	sr_config: {
		srgb: {start: 16000, end: 23999}
		srlb: {start: 15000, end: 15999}
		node_sids: [{index: 6, prefix: "10.0.0.6/32"}]
	}

	tilfa_config: {
		default_protection: "node-link"
		microloop_avoidance: {enabled: true, rib_update_delay: 5000}
	}

	bfd_config: {
		profiles: [{name: "bgp-multihop", min_tx: 300, min_rx: 300, detect_multiplier: 3}]
		sessions: [
			{remote: "10.0.0.1", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.2", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.5", multihop: true, profile: "bgp-multihop"},
			{remote: "10.0.0.9", multihop: true, profile: "bgp-multihop"},
		]
		sbfd_reflector: {discriminator: 100006}
	}

	qos_config: {
		forwarding_classes: [
			{name: "network-control", dscp_match: ["cs6", "cs7"], mpls_tc: 7, queue_id: 7},
			{name: "best-effort",     dscp_match: ["be", "cs0"],  mpls_tc: 0, queue_id: 0},
		]
	}

	lldp_config: {tx_interval: 30, hold_multiplier: 4}

	bgp_config: {
		asn: 65000, router_id: "10.0.0.6"
		is_route_reflector: true, cluster_id: "10.0.0.6"
		peer_groups: [{
			name: "RR-CLIENTS", remote_as: 65000, peer_type: "internal"
			update_source: "lo0"
			address_families: ["ipv4-unicast", "ipv6-unicast", "l3vpn-ipv4", "evpn"]
			route_reflector_client: true
		}]
		neighbors: [
			{address: "10.0.0.1", remote_as: 65000, peer_type: "internal", peer_group: "RR-CLIENTS", update_source: "lo0", address_families: ["ipv4-unicast", "l3vpn-ipv4", "evpn"], route_reflector_client: true, description: "to-pe1"},
			{address: "10.0.0.2", remote_as: 65000, peer_type: "internal", peer_group: "RR-CLIENTS", update_source: "lo0", address_families: ["ipv4-unicast", "l3vpn-ipv4", "evpn"], route_reflector_client: true, description: "to-pe2"},
			{address: "10.0.0.9", remote_as: 65000, peer_type: "internal", peer_group: "RR-CLIENTS", update_source: "lo0", address_families: ["ipv4-unicast", "ipv6-unicast"], route_reflector_client: true, description: "to-asbr1"},
			{address: "10.0.0.5", remote_as: 65000, peer_type: "internal", update_source: "lo0", address_families: ["ipv4-unicast", "l3vpn-ipv4", "evpn"], description: "to-rr1-peer"},
		]
	}
}
