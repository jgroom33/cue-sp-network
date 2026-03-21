package copp

// Control-Plane Policing schema — rate-limits protocol traffic destined to CPU
// Vendor-neutral modeling; conceptually aligned with RFC 6192 (protecting the router
// control plane) and NIST SP 800-189 guidelines

// Protocol class — what type of control-plane traffic to police
#CoPPProtocolClass: "bgp" | "ospf" | "isis" | "bfd" | "ldp" |
	"icmp" | "icmpv6" | "ssh" | "snmp" | "ntp" | "tacacs" | "radius" |
	"lldp" | "lacp" | "arp" | "dhcp" | "pim" | "igmp" | "vrrp" |
	"netconf" | "gnmi" | "traceroute" | "dns" | "all-other" | "default"

// Policer action
#CoPPAction: "transmit" | "drop" | "count"

// Per-class policer
#CoPPPolicer: {
	cir:             int & >=0              // Committed Information Rate (kbps)
	cbs:             int & >=0              // Committed Burst Size (bytes)
	conform_action:  #CoPPAction | *"transmit"
	exceed_action:   #CoPPAction | *"drop"
}

// Class-policer binding
#CoPPClassEntry: {
	protocol_class: #CoPPProtocolClass
	policer:        #CoPPPolicer
	description?:   string
	// Optional ACL reference for fine-grained matching
	acl_name?:      string
}

// CoPP policy — ordered list of class entries
#CoPPPolicy: {
	name:    string
	entries: [...#CoPPClassEntry] & [_, ...]
}

// Device-level CoPP configuration
#CoPPConfig: {
	enabled: bool | *true
	policy:  #CoPPPolicy
}
