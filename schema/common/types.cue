package common

// IPv4 address
#IPv4: string & =~"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"

// IPv4 prefix (address/mask)
#IPv4Prefix: string & =~"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/([0-9]|[12][0-9]|3[0-2])$"

// IPv6 address (simplified)
#IPv6: string & =~"^[0-9a-fA-F:]+$"

// IPv6 prefix
#IPv6Prefix: string & =~"^[0-9a-fA-F:]+/[0-9]{1,3}$"

// MAC address
#MACAddress: string & =~"^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$"

// VLAN ID per IEEE 802.1Q (1-4094)
#VLANID: int & >=1 & <=4094

// MPLS label range (0-1048575, 20-bit)
#MPLSLabel: int & >=0 & <=1048575

// BGP ASN: supports 4-byte (RFC 6793)
#ASN: int & >=1 & <=4294967295

// Route Distinguisher (RFC 4364)
#RD: string & =~"^[0-9]+:[0-9]+$"

// Route Target (RFC 4364)
#RT: string & =~"^[0-9]+:[0-9]+$"

// IEEE 802.1Q-2022 Section 6.9.3 — Priority Code Point (3-bit)
#PCP: int & >=0 & <=7

// IEEE 802.1Q-2022 Section 6.9.3 — Drop Eligible Indicator (1-bit)
#DEI: int & >=0 & <=1

// OSPF Area ID in dotted notation — RFC 2328 Section A.2
#AreaID: string & =~"^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$"

// BGP standard community — RFC 1997
#BGPCommunity: string & =~"^[0-9]+:[0-9]+$"

// BGP extended community — RFC 4360
#ExtendedCommunity: string & =~"^[a-z-]+:[0-9]+:[0-9]+$"

// BGP large community — RFC 8092
#LargeCommunity: string & =~"^[0-9]+:[0-9]+:[0-9]+$"

// Management VRF definition
#ManagementVRF: {
	vrf_name:    string | *"MGMT"
	interface:   string
	ipv4:        #IPv4Prefix
	gateway:     #IPv4
	dns_servers?: [...#IPv4]
}

// Device role in the SP network
#DeviceRole: "PE" | "P" | "RR" | "AGG" | "ASBR" | "CE" | "NID" | "PCE" | "EXTERNAL"

// Static route (for CE devices and simple routing)
#StaticRoute: {
	prefix:       #IPv4Prefix | #IPv6Prefix
	next_hop:     #IPv4 | #IPv6
	metric?:      int & >=1 & <=255
	description?: string
}
