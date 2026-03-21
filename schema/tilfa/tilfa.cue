package tilfa

// TI-LFA schema per RFC 8400 (Shortest Path First Based IP Fast Reroute Using
// Segment Routing), RFC 7490 (Remote LFA FRR), RFC 8402 (SR Architecture)

// Protection type
#ProtectionType: "link" | "node" | "srlg" | "node-link"

// SRLG (Shared Risk Link Group) — links sharing a common failure domain
#SRLG: {
	id:          int & >=0 & <=4294967295
	name?:       string
	interfaces:  [...string] & [_, ...]   // interfaces in this group
}

// Per-interface TI-LFA configuration
#TILFAInterface: {
	name:             string
	protection:       #ProtectionType | *"node-link"
	enabled:          bool | *true
	// Max number of SIDs in repair path (limits label stack depth)
	max_repair_sids:  int & >=1 & <=16 | *3
	// SRLG groups this interface belongs to
	srlg_groups:      [...int] | *[]
}

// TI-LFA policy — controls backup path computation behavior
#TILFAPolicy: {
	name:        string
	// Tiebreaker for multiple equal backup paths
	tiebreaker:  "node-protecting" | "srlg-disjoint" | "lowest-metric" | *"node-protecting"
	// Delay before activating backup (ms) — useful to avoid micro-loop during convergence
	hold_down:   int & >=0 & <=60000 | *0
}

// Microloop avoidance per RFC 8333
#MicroloopAvoidance: {
	enabled:    bool | *true
	// Delay timer: ordered FIB updates to prevent transient loops
	rib_update_delay: int & >=1 & <=60000 | *5000   // ms
	type:       "local" | "remote" | *"local"
}

// Device-level TI-LFA configuration
#TILFAConfig: {
	enabled:    bool | *true
	// Default protection for all IS-IS interfaces
	default_protection: #ProtectionType | *"node-link"
	// Per-interface overrides
	interfaces:  [...#TILFAInterface] | *[]
	// SRLG definitions (shared risk link groups)
	srlgs:       [...#SRLG] | *[]
	// Backup path computation policy
	policy:      #TILFAPolicy | *{name: "default"}
	// Microloop avoidance
	microloop_avoidance: #MicroloopAvoidance | *{enabled: true}
	// Preprogrammed backup paths in FIB (hardware-dependent)
	preprogrammed: bool | *true
}
