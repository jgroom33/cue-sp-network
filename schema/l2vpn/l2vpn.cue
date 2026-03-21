package l2vpn

// L2VPN / Pseudowire schema per RFC 4447 (PW Setup & Maintenance using LDP),
// RFC 8077 (updated PW Setup), RFC 4448 (Ethernet over MPLS), RFC 6624 (PW redundancy),
// RFC 4761 (VPLS using BGP), RFC 4762 (VPLS using LDP)

import "github.com/jgroom/sp-network-model/schema/common"

// Pseudowire type (encapsulation)
#PWType: "ethernet" | "vlan" | "ethernet-tagged" | "satop-e1" | "cesopsn"

// Pseudowire signaling protocol
#PWSignaling: "ldp" | "bgp" | "static"

// Pseudowire redundancy mode
#PWRedundancyMode: "independent" | "master-slave"

// Single pseudowire endpoint
#PseudowireEndpoint: {
	pw_id:        int & >=1 & <=4294967295          // PW ID (FEC 129) or VC ID (FEC 128)
	peer:         common.#IPv4                       // remote PE loopback
	pw_type:      #PWType | *"ethernet"
	signaling:    #PWSignaling | *"ldp"
	mtu:          int & >=64 & <=9216 | *9000
	control_word: bool | *true                       // RFC 4385

	// Static label configuration (when signaling == "static")
	local_label?:  common.#MPLSLabel
	remote_label?: common.#MPLSLabel

	// PW status signaling (RFC 6478)
	status_signaling: bool | *true
}

// Pseudowire redundancy group — primary + backup PW
#PWRedundancyGroup: {
	name:     string
	mode:     #PWRedundancyMode | *"independent"
	primary:  #PseudowireEndpoint
	backup?:  #PseudowireEndpoint
	// Revert delay after primary recovers (seconds)
	revert_delay: int & >=0 & <=600 | *30
}

// Point-to-point L2VPN (VPWS — Virtual Private Wire Service)
#VPWS: {
	name:        string
	service_id:  int & >=1 & <=4294967295
	interface:   string                              // local attachment circuit
	pseudowire:  #PseudowireEndpoint | #PWRedundancyGroup
	// Split-horizon for multi-homing
	split_horizon: bool | *false
}

// VPLS instance (Virtual Private LAN Service)
#VPLS: {
	name:        string
	vpls_id:     int & >=1 & <=4294967295
	rd?:         common.#RD
	rt_import?:  [...common.#RT]
	rt_export?:  [...common.#RT]
	signaling:   #PWSignaling | *"bgp"              // BGP (4761) or LDP (4762)

	// MAC learning
	mac_table_size:   int & >=1 & <=1048576 | *65536
	mac_aging_time:   int & >=60 & <=86400 | *300    // seconds
	mac_withdraw:     bool | *true                    // RFC 7361

	// Attachment circuits
	interfaces:  [...string] & [_, ...]

	// PW mesh to remote PEs (for LDP signaling)
	pseudowires: [...#PseudowireEndpoint] | *[]

	// Split-horizon group
	split_horizon: bool | *true
}

// Device-level L2VPN configuration
#L2VPNConfig: {
	enabled: bool | *true
	vpws:    [...#VPWS] | *[]
	vpls:    [...#VPLS] | *[]
}
