package flowspec

// BGP Flowspec schema per RFC 8955 (Dissemination of Flow Specification Rules),
// RFC 8956 (Flowspec Redirect IP), RFC 5575 (original Flowspec — obsoleted by 8955)

import "github.com/jgroom/sp-network-model/schema/common"

// Flowspec match criteria — RFC 8955 Section 4
#FlowspecMatch: {
	dst_prefix?:    common.#IPv4Prefix | common.#IPv6Prefix   // Type 1
	src_prefix?:    common.#IPv4Prefix | common.#IPv6Prefix   // Type 2
	protocol?:      int & >=0 & <=255                          // Type 3 (IP protocol)
	src_port?:      int & >=0 & <=65535                        // Type 5
	dst_port?:      int & >=0 & <=65535                        // Type 6
	src_port_range?: {start: int, end: int}
	dst_port_range?: {start: int, end: int}
	icmp_type?:     int & >=0 & <=255                          // Type 7
	icmp_code?:     int & >=0 & <=255                          // Type 8
	tcp_flags?:     [...string]                                 // Type 9 (syn/ack/fin/rst)
	packet_length?: {min: int, max: int}                       // Type 10
	dscp?:          int & >=0 & <=63                            // Type 11
	fragment?:      "dont-fragment" | "is-fragment" | "first-fragment" | "last-fragment"  // Type 12
}

// Flowspec action — RFC 8955 Section 5 (extended communities)
#FlowspecActionType: "drop" | "rate-limit" | "redirect-vrf" | "remark" | "accept"

// Rate limit parameters
#FlowspecRateLimit: {
	rate: int & >=0     // bits per second (0 = drop)
}

// VRF redirect — RFC 8956
#FlowspecRedirect: {
	rt: common.#RT     // redirect to this VRF RT
}

// Flowspec rule
#FlowspecRule: {
	name:        string
	match:       #FlowspecMatch
	action:      #FlowspecActionType
	rate_limit?: #FlowspecRateLimit
	redirect?:   #FlowspecRedirect
	remark_dscp?: int & >=0 & <=63
	description?: string

	// Action-specific constraints
	if action == "rate-limit" { rate_limit: #FlowspecRateLimit }
	if action == "redirect-vrf" { redirect: #FlowspecRedirect }
}

// Flowspec validation mode — which sources to accept rules from
#FlowspecValidation: {
	accept_ibgp: bool | *true
	accept_ebgp: bool | *false       // eBGP Flowspec requires careful policy
	max_rules?:  int & >=1 & <=100000
}

// Device-level Flowspec configuration
#FlowspecConfig: {
	enabled:    bool | *true
	rules:      [...#FlowspecRule] | *[]                   // locally defined rules
	validation: #FlowspecValidation | *{accept_ibgp: true} // BGP-received rules
	// Address families to apply
	address_families: [...string] | *["ipv4-unicast"]
}
