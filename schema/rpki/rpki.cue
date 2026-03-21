package rpki

// RPKI / ROA schema for BGP origin validation
// RFC 6480 (RPKI architecture), RFC 6811 (origin validation),
// RFC 8210 (RTR protocol v1), RFC 8893 (RTR protocol v2)

import "github.com/jgroom/sp-network-model/schema/common"

// RPKI validation state — RFC 6811 Section 2
#ValidationState: "valid" | "invalid" | "not-found"

// Action to take per validation state
#ValidationAction: "accept" | "reject" | "set-local-pref"

// RPKI cache server (validator) — RFC 8210
#RPKIServer: {
	address:          common.#IPv4 | common.#IPv6
	port:             int & >=1 & <=65535 | *323         // IANA RTR port
	preference:       int & >=1 & <=255 | *1
	// RTR protocol timers — RFC 8210 Section 6
	refresh_interval: int & >=1 & <=86400 | *3600        // seconds
	retry_interval:   int & >=1 & <=7200 | *600          // seconds
	expire_interval:  int & >=1 & <=172800 | *7200       // seconds
	// Transport security
	transport:        "tcp" | "ssh" | "tls" | *"tcp"     // RFC 8210 Section 7
	description?:     string
}

// Per-state validation policy
#ValidationPolicyEntry: {
	state:       #ValidationState
	action:      #ValidationAction
	local_pref?: int & >=0 & <=4294967295                // only for set-local-pref action
	if action == "set-local-pref" {
		local_pref: int & >=0 & <=4294967295
	}
}

// Validation policy
#RPKIValidationPolicy: {
	entries: [...#ValidationPolicyEntry] & [_, ...]
}

// Device-level RPKI configuration
#RPKIConfig: {
	enabled:           bool | *true
	servers:           [...#RPKIServer] & [_, ...]       // at least one validator
	validation_policy: #RPKIValidationPolicy
	// Apply to BGP address families
	address_families:  [...string] | *["ipv4-unicast", "ipv6-unicast"]
}
