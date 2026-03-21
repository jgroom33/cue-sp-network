package sr_policy

// SR Policy / SR-TE schema per RFC 9256 (SR Policy Architecture)
// Also covers: RFC 9252 (BGP SR Policy), RFC 8402 (SR Architecture)

import "github.com/jgroom/sp-network-model/schema/common"

// Segment types per RFC 9256 Section 2.1
#SegmentType: "node-sid" | "adj-sid" | "binding-sid" | "prefix-sid"

// A single segment in a segment list (label stack entry)
#Segment: {
	type:   #SegmentType
	label?: common.#MPLSLabel  // MPLS label for SR-MPLS
	sid?:   int                // SID index (resolved against SRGB)
	// At least one of label or sid must be specified
}

// Segment list — an ordered path through the network
#SegmentList: {
	name:     string
	weight:   int & >=1 | *1                  // ECMP/WCMP weight
	segments: [...#Segment] & [_, ...]        // at least one segment
}

// Candidate path — one possible path for a policy
#CandidatePath: {
	name:           string
	preference:     int & >=1 & <=65535       // higher = preferred (RFC 9256 Section 2.7)
	protocol_origin: "local" | "bgp" | "pcep" | *"local"
	segment_lists:  [...#SegmentList] & [_, ...]
	constraints?:   #PathConstraints
}

// Path constraints for candidate path selection
#PathConstraints: {
	// Affinity constraints (admin-group / link-color)
	exclude_any?: int   // bitmask of admin-groups to avoid
	include_any?: int   // bitmask: path must traverse at least one
	include_all?: int   // bitmask: path must traverse all

	// Bandwidth constraint
	bandwidth?:   int & >=0   // kbps

	// Segment limits
	max_segments?: int & >=1 & <=16

	// Disjointness
	disjoint_group?: int
	disjoint_type?:  "node" | "link" | "srlg"
}

// Binding SID — a local label that steers into the SR policy
#BindingSID: {
	label:    common.#MPLSLabel
	explicit: bool | *true    // explicitly allocated vs dynamic
}

// SR Policy definition
#SRPolicy: {
	name:        string
	color:       int & >=1 & <=4294967295     // policy color (RFC 9256 Section 2.1)
	endpoint:    common.#IPv4 | common.#IPv6  // policy endpoint (tail-end)
	binding_sid?: #BindingSID
	candidate_paths: [...#CandidatePath] & [_, ...]

	// Admin state
	enabled: bool | *true
	description?: string
}

// On-Demand Nexthop (ODN) — auto-instantiate SR policies from BGP color communities
#ODNTemplate: {
	color:           int & >=1 & <=4294967295
	source_protocol: "bgp" | *"bgp"
	candidate_paths: [...#CandidatePath]    // template candidate paths
	constraints?:    #PathConstraints       // default constraints for auto-policies
}

// Per-device SR-TE / SR Policy configuration
#SRPolicyConfig: {
	enabled:    bool | *true
	policies:   [...#SRPolicy] | *[]
	odn_templates: [...#ODNTemplate] | *[]

	// Maximum SID depth (MSD) advertised via IS-IS or BGP
	max_sid_depth: int & >=1 & <=16 | *6

	// Explicit null imposition
	explicit_null: bool | *false
}
