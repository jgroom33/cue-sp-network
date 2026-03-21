package bfd

// BFD schema per RFC 5880 (base), RFC 5881 (IPv4/IPv6), RFC 5883 (multihop), RFC 5884 (MPLS)

import "github.com/jgroom/sp-network-model/schema/common"

// BFD session mode
#SessionMode: "async" | "demand"

// BFD authentication
#BFDAuthType: "simple" | "keyed-md5" | "keyed-sha1" | "meticulous-keyed-md5" | "meticulous-keyed-sha1"

#BFDAuthentication: {
	type:   #BFDAuthType
	key_id: int & >=0 & <=255
	key:    string
}

// BFD timer profile — reusable across interfaces
#BFDProfile: {
	name:               string
	min_tx:             int & >=1 & <=600000 | *300    // ms, desired min TX interval
	min_rx:             int & >=1 & <=600000 | *300    // ms, required min RX interval
	detect_multiplier:  int & >=1 & <=255 | *3         // detection time = min_rx * multiplier
	echo_mode:          bool | *false                   // RFC 5880 Section 6.4
	authentication?:    #BFDAuthentication
}

// Per-interface/session BFD configuration
#BFDSession: {
	interface?:  string                                 // for single-hop (RFC 5881)
	remote?:     common.#IPv4 | common.#IPv6            // for multihop (RFC 5883)
	multihop:    bool | *false
	profile?:    string                                 // reference to a #BFDProfile.name
	mode:        #SessionMode | *"async"

	// Inline timers (override profile if set)
	min_tx?:            int & >=1 & <=600000
	min_rx?:            int & >=1 & <=600000
	detect_multiplier?: int & >=1 & <=255

	// MPLS BFD (RFC 5884) — for SR-MPLS LSP monitoring
	mpls_lsp?:   bool

	// Single-hop requires interface, multihop requires remote
	if !multihop {
		interface: string
	}
	if multihop {
		remote: common.#IPv4 | common.#IPv6
	}
}

// SBFD — Seamless BFD for SR (RFC 7880/7881)
#SBFDReflector: {
	discriminator: int & >=1 & <=4294967295
}

#SBFDInitiator: {
	target:        common.#IPv4
	discriminator: int & >=1 & <=4294967295
}

// Device-level BFD configuration
#BFDConfig: {
	enabled:     bool | *true
	profiles:    [...#BFDProfile] | *[]
	sessions:    [...#BFDSession] | *[]

	// Seamless BFD for segment routing path validation
	sbfd_reflector?:   #SBFDReflector
	sbfd_initiators?:  [...#SBFDInitiator]

	// Default profile applied when no explicit profile is referenced
	default_profile: #BFDProfile | *{
		name:              "default"
		min_tx:            300
		min_rx:            300
		detect_multiplier: 3
	}
}
