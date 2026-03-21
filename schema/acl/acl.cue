package acl

// Access Control List schema — vendor-neutral modeling
// Based on RFC 8519 (YANG ACL model) for structural guidance

import "github.com/jgroom/sp-network-model/schema/common"

// ACL type
#ACLType: "ipv4-standard" | "ipv4-extended" | "ipv6" | "mac"

// ACL action
#ACLAction: "permit" | "deny"

// IP protocol number (0-255) — IANA protocol numbers
#IPProtocol: int & >=0 & <=255

// Well-known protocol names
#ProtocolName: "tcp" | "udp" | "icmp" | "icmpv6" | "gre" | "ospf" | "pim" | "igmp" | "any"

// TCP flags for stateful matching — RFC 793
#TCPFlag: "syn" | "ack" | "fin" | "rst" | "psh" | "urg"

// Port range
#PortRange: {
	start: int & >=0 & <=65535
	end:   int & >=0 & <=65535
	_valid: true & (end >= start)
}

// ACL match criteria
#ACLMatch: {
	// L3 match fields
	src_prefix?:  common.#IPv4Prefix | common.#IPv6Prefix
	dst_prefix?:  common.#IPv4Prefix | common.#IPv6Prefix
	protocol?:    #IPProtocol | #ProtocolName

	// L4 match fields (TCP/UDP)
	src_port?:       int & >=0 & <=65535
	src_port_range?: #PortRange
	dst_port?:       int & >=0 & <=65535
	dst_port_range?: #PortRange
	tcp_flags?:      [...#TCPFlag]
	tcp_established?: bool

	// ICMP match fields — RFC 792
	icmp_type?: int & >=0 & <=255
	icmp_code?: int & >=0 & <=255

	// QoS match
	dscp?: int & >=0 & <=63

	// Fragment matching
	fragment?: bool

	// L2 match fields (MAC ACL)
	src_mac?: common.#MACAddress
	dst_mac?: common.#MACAddress
	ethertype?: int & >=0 & <=65535
}

// Single ACL entry (ACE)
#ACLEntry: {
	sequence:    int & >=1 & <=4294967295
	action:      #ACLAction
	match:       #ACLMatch
	log?:        bool | *false
	description?: string
}

// Named ACL
#ACL: {
	name:    string
	type:    #ACLType
	entries: [...#ACLEntry] & [_, ...]
	description?: string
}

// Interface ACL binding
#ACLInterfaceBinding: {
	interface:      string
	ingress_acl?:   string     // ACL name reference
	egress_acl?:    string     // ACL name reference
}

// Device-level ACL configuration
#ACLConfig: {
	acls:               [...#ACL] | *[]
	interface_bindings:  [...#ACLInterfaceBinding] | *[]
}
