package ldp

// LDP schema per RFC 5036 (LDP Specification), RFC 5561 (LDP Capabilities),
// RFC 5918 (Label Distribution Protocol Typed Wildcard FEC)

import "github.com/jgroom/sp-network-model/schema/common"

// Session transport preference
#TransportPreference: "ipv4" | "ipv6" | *"ipv4"

// Label allocation mode
#LabelAllocationMode: "per-prefix" | "per-platform" | *"per-platform"

// LDP interface configuration
#LDPInterface: {
	name:          string
	hello_interval?: int & >=1 & <=65535 | *5     // seconds — RFC 5036 Section 3.5.2
	hold_time?:    int & >=1 & <=65535 | *15       // seconds — RFC 5036 Section 3.5.2
}

// Targeted LDP session — RFC 5036 Section 2.5.2
#TargetedNeighbor: {
	address:       common.#IPv4
	hello_interval?: int & >=1 & <=65535 | *10
	hold_time?:    int & >=1 & <=90 | *30
}

// LDP session parameters — RFC 5036 Section 3.5
#LDPSession: {
	keepalive_interval: int & >=1 & <=65535 | *60    // seconds
	keepalive_timeout:  int & >=1 & <=65535 | *180   // seconds
}

// Graceful Restart — RFC 3478
#LDPGracefulRestart: {
	enabled:           bool | *true
	reconnect_timeout: int & >=1 & <=600 | *120     // seconds
	recovery_time:     int & >=1 & <=600 | *120     // seconds
	forwarding_hold:   bool | *true
}

// Device-level LDP configuration
#LDPConfig: {
	enabled:              bool | *true
	router_id:            common.#IPv4
	transport_preference: #TransportPreference
	label_allocation:     #LabelAllocationMode
	interfaces:           [...#LDPInterface]
	targeted_neighbors:   [...#TargetedNeighbor] | *[]
	session:              #LDPSession | *{}
	graceful_restart?:    #LDPGracefulRestart
	// IGP synchronization — RFC 5443
	igp_sync:             bool | *true
	igp_sync_delay?:      int & >=0 & <=300 | *10   // seconds
	// Entropy label — RFC 6790
	entropy_label:        bool | *false
	// Session protection — targeted hellos as backup
	session_protection?:  int & >=30 & <=86400       // hold time in seconds
}
