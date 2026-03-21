package qos

// QoS / DiffServ schema per RFC 2474 (DS field), RFC 2475 (DiffServ architecture),
// RFC 2597 (AF PHB), RFC 3246 (EF PHB), RFC 2698 (trTCM), RFC 2697 (srTCM)
// L2 QoS extensions: IEEE 802.1Q-2022 Section 6.9.3 (PCP/DEI)

import "github.com/jgroom/sp-network-model/schema/common"

// DSCP value (6-bit, 0-63)
#DSCP: int & >=0 & <=63

// Well-known DSCP values
#DSCPName: "ef" | "af11" | "af12" | "af13" | "af21" | "af22" | "af23" |
	"af31" | "af32" | "af33" | "af41" | "af42" | "af43" |
	"cs0" | "cs1" | "cs2" | "cs3" | "cs4" | "cs5" | "cs6" | "cs7" | "be"

// Map symbolic names to numeric DSCP values
#DSCPValues: {
	be:   0    // Best Effort (CS0)
	cs0:  0
	cs1:  8
	af11: 10
	af12: 12
	af13: 14
	cs2:  16
	af21: 18
	af22: 20
	af23: 22
	cs3:  24
	af31: 26
	af32: 28
	af33: 30
	cs4:  32
	af41: 34
	af42: 36
	af43: 38
	cs5:  40
	ef:   46   // Expedited Forwarding (RFC 3246)
	cs6:  48
	cs7:  56
}

// MPLS Traffic Class (TC) bits (3-bit, 0-7) — formerly EXP
#MPLSTrafficClass: int & >=0 & <=7

// Forwarding class — groups traffic with same treatment
#ForwardingClass: {
	name:         string
	dscp_match:   [...#DSCPName] & [_, ...]     // DSCP values mapped to this class
	mpls_tc?:     #MPLSTrafficClass             // MPLS TC marking for this class
	queue_id:     int & >=0 & <=7               // hardware queue assignment
	description?: string
}

// Policer — rate enforcement (ingress)
#Policer: {
	name: string
	type: "single-rate" | "dual-rate" | *"single-rate"  // srTCM (RFC 2697) vs trTCM (RFC 2698)

	// Single-rate (srTCM) parameters
	cir:  int & >=0       // Committed Information Rate (kbps)
	cbs:  int & >=0       // Committed Burst Size (bytes)
	ebs?: int & >=0       // Excess Burst Size (bytes, srTCM)

	// Dual-rate (trTCM) additional parameters
	pir?: int & >=0       // Peak Information Rate (kbps)
	pbs?: int & >=0       // Peak Burst Size (bytes)

	// Actions per color
	conform_action:  #PolicerAction | *{action: "transmit"}
	exceed_action:   #PolicerAction | *{action: "drop"}
	violate_action?: #PolicerAction

	if type == "dual-rate" {
		pir: int & >=0
		pbs: int & >=0
	}
}

// Policer action
#PolicerAction: {
	action:     "transmit" | "drop" | "remark"
	set_dscp?:  #DSCPName       // remark to this DSCP
	set_tc?:    #MPLSTrafficClass
	set_pcp?:   common.#PCP   // remark PCP — IEEE 802.1Q-2022 Section 6.9.3
	set_dei?:   common.#DEI   // remark DEI — IEEE 802.1Q-2022 Section 6.9.3
}

// Shaper — rate smoothing (egress)
#Shaper: {
	name: string
	rate: int & >=0   // kbps
	burst: int & >=0  // bytes
}

// Scheduler — per-queue scheduling discipline
#SchedulerType: "strict-priority" | "weighted-fair" | "deficit-round-robin"

#Scheduler: {
	queue_id:   int & >=0 & <=7
	type:       #SchedulerType
	weight?:    int & >=1 & <=100     // for WFQ/DRR
	priority?:  int & >=0 & <=7       // for strict priority (lower = higher priority)
	bandwidth_percent?: int & >=0 & <=100  // guaranteed minimum bandwidth
}

// WRED — congestion avoidance per RFC 2309 (active queue management)
#WREDProfile: {
	name:            string
	min_threshold:   int & >=0 & <=100   // % of queue depth
	max_threshold:   int & >=0 & <=100   // % of queue depth
	drop_probability: int & >=0 & <=100  // max drop % at max_threshold
	dscp_match?:     [...#DSCPName]      // apply WRED only to specific DSCP classes

	// max must be >= min
	max_threshold: >=min_threshold
}

// Classification rule — match traffic for policy application
#ClassificationRule: {
	name:      string
	match_dscp?: [...#DSCPName]
	match_mpls_tc?: [...#MPLSTrafficClass]
	match_pcp?:  [...common.#PCP]          // IEEE 802.1Q-2022 Section 6.9.3
	match_dei?:  common.#DEI              // IEEE 802.1Q-2022 Section 6.9.3
	match_acl?:  string                    // reference to an ACL name
	forwarding_class: string               // target forwarding class name
}

// QoS policy — composed of classification, policing, scheduling
#QoSPolicy: {
	name:            string
	type:            "ingress" | "egress"
	description?:    string
	classification:  [...#ClassificationRule] | *[]
	policers:        [...#Policer] | *[]
	shapers:         [...#Shaper] | *[]
	schedulers:      [...#Scheduler] | *[]
	wred_profiles:   [...#WREDProfile] | *[]
}

// Interface QoS binding
#InterfaceQoS: {
	interface:       string
	ingress_policy?: string    // reference to #QoSPolicy.name
	egress_policy?:  string    // reference to #QoSPolicy.name
}

// Device-level QoS configuration
#QoSConfig: {
	enabled:           bool | *true
	forwarding_classes: [...#ForwardingClass] & [_, ...]  // at least one class
	policies:          [...#QoSPolicy] | *[]
	interface_bindings: [...#InterfaceQoS] | *[]
}
