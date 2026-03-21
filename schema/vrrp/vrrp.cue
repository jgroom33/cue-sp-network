package vrrp

// VRRP schema per RFC 5798 (VRRPv3) and RFC 3768 (VRRPv2)

import "github.com/jgroom/sp-network-model/schema/common"

// VRRP version
#VRRPVersion: 2 | 3

// VRRP authentication (v2 only, deprecated in v3)
#VRRPAuth: {
	type: "simple" | "ah"
	key:  string
}

// VRRP group instance on an interface
#VRRPGroup: {
	vrid:           int & >=1 & <=255               // Virtual Router ID
	interface:      string
	version:        #VRRPVersion | *3
	address_family: "ipv4" | "ipv6" | *"ipv4"

	// Virtual IP(s) — the gateway address clients point to
	virtual_addresses: [...common.#IPv4 | common.#IPv6] & [_, ...]

	// Priority: 255 = address owner, 1-254 = configurable, higher wins
	priority:       int & >=1 & <=255 | *100

	// Advertisement interval
	advert_interval: int & >=1 & <=255 | *1          // seconds (v3 supports centiseconds)

	// Preemption: higher-priority router reclaims master role
	preempt:         bool | *true
	preempt_delay?:  int & >=0 & <=3600              // seconds before preemption activates

	// Accept mode: master accepts packets addressed to virtual IP (v3)
	accept_mode:     bool | *false

	// Track interface — decrement priority when tracked object goes down
	track_interfaces?: [...#VRRPTrack]

	// BFD integration for fast failover
	bfd_peer?:       common.#IPv4 | common.#IPv6

	// Authentication (v2 only)
	authentication?: #VRRPAuth
	if version == 3 {
		// v3 does not support authentication
	}
}

// Track object for dynamic priority adjustment
#VRRPTrack: {
	interface:        string
	priority_decrement: int & >=1 & <=254 | *10
}

// Device-level VRRP configuration
#VRRPConfig: {
	enabled:  bool | *true
	groups:   [...#VRRPGroup] & [_, ...]  // at least one group
}
