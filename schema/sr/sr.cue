package sr

// MPLS Segment Routing schema per RFC 8402 / RFC 8660

import "github.com/jgroom/sp-network-model/schema/common"

// Label range definition
#LabelRange: {
	start: common.#MPLSLabel
	end:   common.#MPLSLabel
	_valid: true & (end > start)
}

// Node SID: index into SRGB, globally unique across the SR domain
#NodeSID: {
	index:      int & >=0 & <=65535
	prefix:     common.#IPv4Prefix
	algorithm?: int & >=0 & <=255 | *0 // 0 = SPF (RFC 8665)
	php:        bool | *true            // penultimate hop popping
}

// Adjacency SID: locally significant label for a specific adjacency
#AdjSID: {
	label:     common.#MPLSLabel
	interface: string
	neighbor:  common.#IPv4
	protected: bool | *false
}

// Device-level SR-MPLS configuration
#SRConfig: {
	enabled: bool | *true
	// SRGB: Segment Routing Global Block - must be consistent across domain
	srgb: #LabelRange | *{start: 16000, end: 23999}
	// SRLB: Segment Routing Local Block - for adjacency SIDs
	srlb: #LabelRange | *{start: 15000, end: 15999}
	// At least one node SID required
	node_sids: [...#NodeSID] & [_, ...]
	adj_sids:  [...#AdjSID] | *[]
	// Mapping server for LDP interop (RFC 8661)
	mapping_server: bool | *false
}
