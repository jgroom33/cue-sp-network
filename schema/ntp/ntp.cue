package ntp

// NTP schema per RFC 5905 (NTPv4 Specification)

import "github.com/jgroom/sp-network-model/schema/common"

// NTP authentication type
#NTPAuthType: "md5" | "sha1" | "sha256"

// NTP authentication key
#NTPAuthKey: {
	key_id:   int & >=1 & <=65535
	type:     #NTPAuthType | *"sha256"
	key:      string
	trusted:  bool | *true
}

// NTP server/peer
#NTPServer: {
	address:     common.#IPv4 | common.#IPv6
	prefer?:     bool | *false               // preferred source
	version:     int & >=3 & <=4 | *4        // NTP version
	key_id?:     int & >=1 & <=65535         // authentication key reference
	minpoll?:    int & >=4 & <=17 | *6       // log2 minimum poll interval (2^6 = 64s)
	maxpoll?:    int & >=4 & <=17 | *10      // log2 maximum poll interval (2^10 = 1024s)
	burst?:      bool | *false
	iburst?:     bool | *true                // initial burst for fast sync
	vrf?:        string                      // VRF context
}

// NTP peer (symmetric active mode)
#NTPPeer: {
	address:     common.#IPv4 | common.#IPv6
	key_id?:     int & >=1 & <=65535
	version:     int & >=3 & <=4 | *4
	prefer?:     bool | *false
}

// NTP access control
#NTPAccessGroup: {
	type:      "peer" | "serve" | "serve-only" | "query-only"
	acl_name:  string
}

// Device-level NTP configuration
#NTPConfig: {
	enabled:        bool | *true
	servers:        [...#NTPServer] & [_, ...]       // at least one server
	peers:          [...#NTPPeer] | *[]
	authentication: [...#NTPAuthKey] | *[]
	// Source interface for NTP packets
	source_interface?: string
	// Access restrictions
	access_groups:     [...#NTPAccessGroup] | *[]
	// Stratum for local clock (when no server reachable)
	local_stratum?:    int & >=1 & <=15
	// Logging
	logging:           bool | *true
}
