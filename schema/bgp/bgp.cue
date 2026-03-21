package bgp

// BGP schema per RFC 4271 / RFC 4456 (RR) / RFC 4364 (L3VPN) / RFC 7432 (EVPN)
// RFC 1997 (communities), RFC 4360 (extended), RFC 8092 (large communities)
// RFC 2385 (TCP MD5), RFC 4724/8538 (Graceful Restart), RFC 7911 (ADD-PATH)
// RFC 8669 (BGP Prefix-SID)

import "github.com/jgroom/sp-network-model/schema/common"

// Address family identifiers
#AddressFamily: "ipv4-unicast" | "ipv6-unicast" | "l3vpn-ipv4" | "l3vpn-ipv6" | "evpn" | "link-state"

// Peer type
#PeerType: "internal" | "external"

// Community send mode
#SendCommunity: "standard" | "extended" | "both" | "large" | "all"

// BGP TCP MD5 authentication — RFC 2385
#BGPAuthentication: {
	key:    string
	key_id?: int & >=0 & <=255
}

// Graceful Restart — RFC 4724, RFC 8538
#GracefulRestart: {
	enabled:        bool | *true
	restart_time:   int & >=0 & <=4096 | *120     // seconds — RFC 4724 Section 3
	stalepath_time: int & >=0 & <=4096 | *360      // seconds — RFC 4724 Section 4.1
	// Per-AFI preservation — RFC 8538
	preserve_fw_state: bool | *true
	// Long-lived GR — RFC 9494
	llgr_stale_time?:  int & >=0 & <=16777215     // seconds
}

// ADD-PATH capability — RFC 7911
#AddPath: {
	mode:             "send" | "receive" | "both" | *"both"
	address_families: [...#AddressFamily] & [_, ...]
}

// BGP Prefix-SID — RFC 8669
#PrefixSID: {
	index: int & >=0 & <=65535
	label?: common.#MPLSLabel
}

// Peer group template
#PeerGroup: {
	name:                   string
	remote_as:              common.#ASN
	peer_type:              #PeerType
	update_source:          string
	address_families:       [...#AddressFamily]
	route_reflector_client: bool | *false
	send_community:         #SendCommunity | *"both"
	next_hop_self:          bool | *false
	authentication?:        #BGPAuthentication
	graceful_restart?:      #GracefulRestart
}

// BGP neighbor
#BGPNeighbor: {
	address:                common.#IPv4 | common.#IPv6
	remote_as:              common.#ASN
	description?:           string
	peer_type:              #PeerType
	update_source?:         string
	peer_group?:            string
	address_families:       [...#AddressFamily] & [_, ...]
	route_reflector_client: bool | *false
	send_community:         #SendCommunity | *"both"
	next_hop_self:          bool | *false
	bfd:                    bool | *true
	vrf?:                   string
	authentication?:        #BGPAuthentication       // RFC 2385
	graceful_restart?:      #GracefulRestart          // RFC 4724
	add_path?:              #AddPath                  // RFC 7911
	prefix_sid?:            #PrefixSID                // RFC 8669
	// Route policy references
	import_policy?:         string                    // route-map name
	export_policy?:         string                    // route-map name
}

// Community definitions — RFC 1997 / RFC 4360 / RFC 8092
#BGPCommunities: {
	standard?:  [...common.#BGPCommunity]
	extended?:  [...common.#ExtendedCommunity]
	large?:     [...common.#LargeCommunity]
}

// L3VPN instance per RFC 4364
#L3VPN: {
	name:       string
	rd:         common.#RD
	rt_import:  [...common.#RT] & [_, ...]
	rt_export:  [...common.#RT] & [_, ...]
	interfaces: [...string]
	ipv4:       bool | *true
	ipv6:       bool | *false
}

// EVPN instance per RFC 7432
#EVPNInstance: {
	name:      string
	evi:       int & >=1 & <=65535
	rd:        common.#RD
	rt_import: [...common.#RT] & [_, ...]
	rt_export: [...common.#RT] & [_, ...]
	vni?:      int & >=1 & <=16777215
}

// Device-level BGP configuration
#BGPConfig: {
	asn:                common.#ASN
	router_id:          common.#IPv4
	peer_groups:        [...#PeerGroup] | *[]
	neighbors:          [...#BGPNeighbor]
	is_route_reflector: bool | *false
	cluster_id?:        common.#IPv4
	l3vpns:             [...#L3VPN] | *[]
	evpn_instances:     [...#EVPNInstance] | *[]

	// Global graceful restart — RFC 4724
	graceful_restart?: #GracefulRestart

	// Global ADD-PATH — RFC 7911
	add_path?: #AddPath

	// Community definitions — RFC 1997/4360/8092
	communities?: #BGPCommunities

	// Route reflectors must have a cluster ID
	if is_route_reflector {
		cluster_id: common.#IPv4
	}
}
