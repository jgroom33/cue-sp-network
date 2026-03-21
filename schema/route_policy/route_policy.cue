package route_policy

// Route Policy schema — prefix lists, community lists, AS-path lists, route maps
// Modeled after RFC 4012 (RPSL), RFC 1997/4360/8092 (communities),
// RFC 4271 (AS-path), vendor-neutral route-map semantics

import "github.com/jgroom/sp-network-model/schema/common"

// --- Prefix Lists ---
// Used for BGP neighbor filtering and route redistribution

#PrefixListAction: "permit" | "deny"

#PrefixListEntry: {
	sequence: int & >=1 & <=65535
	action:   #PrefixListAction
	prefix:   common.#IPv4Prefix | common.#IPv6Prefix
	ge?:      int & >=0 & <=128           // minimum prefix length
	le?:      int & >=0 & <=128           // maximum prefix length
}

#PrefixList: {
	name:    string
	entries: [...#PrefixListEntry] & [_, ...]
	description?: string
}

// --- Community Lists --- RFC 1997 / RFC 4360 / RFC 8092

#CommunityMatchType: "exact" | "regex"

#CommunityListEntry: {
	action:     #PrefixListAction
	match_type: #CommunityMatchType | *"exact"
	community:  string                     // exact value or regex pattern
}

#CommunityListType: "standard" | "extended" | "large"

#CommunityList: {
	name:    string
	type:    #CommunityListType | *"standard"
	entries: [...#CommunityListEntry] & [_, ...]
}

// --- AS-Path Lists --- RFC 4271

#ASPathListEntry: {
	action:  #PrefixListAction
	regex:   string                        // AS-path regex pattern
}

#ASPathList: {
	name:    string
	entries: [...#ASPathListEntry] & [_, ...]
}

// --- Route Map ---

// Match clauses
#RouteMapMatch: {
	prefix_list?:    string               // reference to #PrefixList.name
	community_list?: string               // reference to #CommunityList.name
	as_path_list?:   string               // reference to #ASPathList.name
	origin?:         "igp" | "egp" | "incomplete"
	next_hop?:       common.#IPv4 | common.#IPv6
	tag?:            int & >=0 & <=4294967295
	metric?:         int & >=0 & <=4294967295
	local_pref?:     int & >=0 & <=4294967295
}

// Community set operation
#CommunitySetMode: "add" | "delete" | "replace"

// Set clauses
#RouteMapSet: {
	local_pref?:     int & >=0 & <=4294967295
	med?:            int & >=0 & <=4294967295
	community?:      [...common.#BGPCommunity]
	community_mode?: #CommunitySetMode | *"add"
	ext_community?:  [...common.#ExtendedCommunity]
	large_community?: [...common.#LargeCommunity]
	next_hop?:       common.#IPv4 | common.#IPv6 | "self"
	origin?:         "igp" | "egp" | "incomplete"
	weight?:         int & >=0 & <=65535
	tag?:            int & >=0 & <=4294967295
	as_path_prepend?: {
		asn:   common.#ASN
		count: int & >=1 & <=25
	}
}

#RouteMapAction: "permit" | "deny"

#RouteMapEntry: {
	sequence: int & >=1 & <=65535
	action:   #RouteMapAction
	match?:   #RouteMapMatch
	set?:     #RouteMapSet
	description?: string
}

#RouteMap: {
	name:    string
	entries: [...#RouteMapEntry] & [_, ...]
}

// --- Device-level route policy configuration ---

#RoutePolicyConfig: {
	prefix_lists:    [...#PrefixList] | *[]
	community_lists: [...#CommunityList] | *[]
	as_path_lists:   [...#ASPathList] | *[]
	route_maps:      [...#RouteMap] | *[]
}
