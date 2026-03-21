package ospf

// OSPF schema per RFC 2328 (OSPFv2), RFC 5340 (OSPFv3),
// RFC 4577 (OSPF as PE-CE protocol), RFC 3101 (NSSA), RFC 1765 (stub areas)

import "github.com/jgroom/sp-network-model/schema/common"

// OSPF version — RFC 2328 (v2), RFC 5340 (v3)
#OSPFVersion: 2 | 3

// Area type — RFC 2328 Section 3 (backbone/normal),
// RFC 1765 (stub), RFC 3101 (NSSA)
#AreaType: "backbone" | "normal" | "stub" | "totally-stub" | "nssa" | "totally-nssa"

// Interface network type — RFC 2328 Section 4
#InterfaceNetworkType: "broadcast" | "point-to-point" | "nbma" | "point-to-multipoint"

// Authentication type — RFC 2328 Appendix D (Type 0=null, 1=simple, 2=md5)
#OSPFAuthType: "null" | "simple" | "md5"

#OSPFAuthentication: {
	type:    #OSPFAuthType
	key?:    string
	key_id?: int & >=1 & <=255
	if type != "null" {
		key: string
	}
	if type == "md5" {
		key_id: int & >=1 & <=255
	}
}

// OSPF area definition — RFC 2328 Section 6
#OSPFArea: {
	area_id:   common.#AreaID
	area_type: #AreaType | *"normal"
	// Stub/NSSA default route cost — RFC 2328 Section 12.4.3.1
	default_cost?: int & >=0 & <=16777215
	// NSSA translator role — RFC 3101 Section 3.1
	nssa_translator_role?: "always" | "candidate" | "never"
	// Backbone area must be 0.0.0.0
	if area_type == "backbone" {
		area_id: "0.0.0.0"
	}
}

// Per-interface OSPF configuration — RFC 2328 Section 9
#OSPFInterface: {
	name:           string
	area_id:        common.#AreaID
	network_type:   #InterfaceNetworkType | *"point-to-point"
	metric:         int & >=1 & <=65535 | *10              // RFC 2328 Section 12.4.1
	passive:        bool | *false
	hello_interval: int & >=1 & <=65535 | *10              // RFC 2328 Section 10.5
	dead_interval:  int & >=1 & <=65535 | *40              // RFC 2328 Section 10.2
	priority:       int & >=0 & <=255 | *1                 // RFC 2328 Section 9.1 (DR election)
	authentication?: #OSPFAuthentication
	bfd:            bool | *false
}

// Sham-link for PE-CE backdoor handling — RFC 4577 Section 4.2.7
#ShamLink: {
	source:      common.#IPv4
	destination: common.#IPv4
	area_id:     common.#AreaID
	metric:      int & >=1 & <=65535 | *1
	authentication?: #OSPFAuthentication
}

// Redistribution configuration — RFC 2328 Section 12.4.3
#OSPFRedistribution: {
	protocol:    "bgp" | "static" | "connected" | "isis"
	metric?:     int & >=0 & <=16777215
	metric_type: 1 | 2 | *2                               // RFC 2328 Section 12.4.3 (E1/E2)
	route_map?:  string
	tag?:        int & >=0 & <=4294967295                  // RFC 2328 Section A.4.5
}

// Device-level OSPF configuration
#OSPFConfig: {
	enabled:   bool | *true
	version:   #OSPFVersion | *2
	router_id: common.#IPv4                                // RFC 2328 Section 1.1
	areas:     [...#OSPFArea] & [_, ...]                   // at least one area
	interfaces: [...#OSPFInterface] & [_, ...]             // at least one interface
	authentication?: #OSPFAuthentication                   // global default auth
	redistribute:    [...#OSPFRedistribution] | *[]

	// PE-CE VRF context — RFC 4577 Section 4.2
	vrf?: string
	// Domain ID for inter-AS OSPF — RFC 4577 Section 5.3
	domain_id?: string & =~"^[0-9]+:[0-9]+$"
	// Sham-links — RFC 4577 Section 4.2.7
	sham_links: [...#ShamLink] | *[]

	// SPF timers (milliseconds)
	spf_delay?: int & >=0 & <=600000
	spf_hold?:  int & >=0 & <=600000
	// Maximum LSA limit
	max_lsa?: int & >=1 & <=4294967295
	// Reference bandwidth for auto-cost (kbps) — RFC 2328 Section 12.4.1
	reference_bandwidth?: int & >=1 & <=4294967295
}
