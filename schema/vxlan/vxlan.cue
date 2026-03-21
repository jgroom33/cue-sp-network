package vxlan

// VXLAN schema per RFC 7348 (VXLAN), RFC 8365 (EVPN overlay using VXLAN),
// RFC 9136 (IP Prefix Advertisement in EVPN)

import "github.com/jgroom/sp-network-model/schema/common"

// VNI — VXLAN Network Identifier (24-bit)
#VNI: int & >=1 & <=16777215

// VTEP source interface
#VTEPSource: {
	interface:   string                              // typically a loopback
	ipv4:        common.#IPv4
}

// VXLAN tunnel endpoint configuration
#VTEPConfig: {
	source:       #VTEPSource
	udp_port:     int & >=1 & <=65535 | *4789       // IANA assigned port
	// Learning mode
	learning:     "control-plane" | "data-plane" | *"control-plane"  // CP = EVPN
}

// L2 VNI — bridged domain mapped to EVPN
#L2VNI: {
	vni:          #VNI
	vlan_id?:     common.#VLANID                     // local VLAN binding
	rd?:          common.#RD
	rt_import:    [...common.#RT] & [_, ...]
	rt_export:    [...common.#RT] & [_, ...]
	// EVPN instance binding
	evi?:         int & >=1 & <=65535
	// BUM traffic handling
	ingress_replication: bool | *true                // vs multicast underlay
	multicast_group?:    common.#IPv4                // if not using ingress replication
	// ARP suppression
	arp_suppression: bool | *true
	// MAC/IP learning limits
	mac_limit?:  int & >=1 & <=1048576
}

// L3 VNI — routed VRF-to-VNI binding for inter-subnet routing (symmetric IRB)
#L3VNI: {
	vni:          #VNI
	vrf:          string                              // VRF name
	rd?:          common.#RD
	rt_import:    [...common.#RT] & [_, ...]
	rt_export:    [...common.#RT] & [_, ...]
	// Router MAC — used for inter-VTEP L3 forwarding
	router_mac?:  common.#MACAddress
}

// Anycast gateway — shared virtual gateway across VTEPs
#AnycastGateway: {
	virtual_mac:    common.#MACAddress                // identical across all VTEPs
	interfaces:     [...#AnycastGatewayInterface] & [_, ...]
}

#AnycastGatewayInterface: {
	vlan_id:     common.#VLANID
	ipv4?:       common.#IPv4Prefix
	ipv6?:       common.#IPv6Prefix
}

// Multihoming — EVPN ESI-based (RFC 7432 Section 8.4)
#EthernetSegment: {
	esi:           string & =~"^([0-9a-fA-F]{2}:){9}[0-9a-fA-F]{2}$"  // 10-byte ESI
	esi_type:      int & >=0 & <=5 | *0
	interface:     string
	// DF election per RFC 8584
	df_election:   "default" | "preference" | "modulo" | *"preference"
	df_preference?: int & >=0 & <=65535
	// Active-active vs active-standby
	redundancy_mode: "all-active" | "single-active" | *"all-active"
}

// Device-level VXLAN + EVPN-VXLAN configuration
#VXLANConfig: {
	enabled: bool | *true
	vtep:    #VTEPConfig
	l2_vnis: [...#L2VNI] | *[]
	l3_vnis: [...#L3VNI] | *[]
	anycast_gateway?: #AnycastGateway
	ethernet_segments: [...#EthernetSegment] | *[]
}
