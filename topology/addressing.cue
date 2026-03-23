package topology

// IP addressing plan — expanded topology

// Loopback addresses (router-id and BGP update-source)
loopbacks: {
	pe1:   "10.0.0.1"
	pe2:   "10.0.0.2"
	p1:    "10.0.0.3"
	p2:    "10.0.0.4"
	rr1:   "10.0.0.5"
	rr2:   "10.0.0.6"
	p3:    "10.0.0.7"
	p4:    "10.0.0.8"
	asbr1: "10.0.0.9"
	agg1:  "10.0.0.10"
	agg2:  "10.0.0.11"
	asbr2: "10.0.0.12"
	pce1:  "10.0.0.13"
	agg5:  "10.0.0.16"
	nid1:  "10.0.2.1"
	nid2:  "10.0.2.2"
	enni1: "10.0.2.3"
	enni2: "10.0.2.4"
	ce1:   "192.168.1.1"
	ce2:   "192.168.2.1"
	ce3:   "192.168.3.1"
	ce4:   "192.168.4.1"
}

// VTEP loopbacks (PE only)
vtep_loopbacks: {
	pe1: "10.0.1.1"
	pe2: "10.0.1.2"
}

// IS-IS area: single L2 backbone
isis_area: "49.0001"

// Point-to-point /31 subnets — lower core
p2p_subnets: {
	"pe1-p1":    "10.1.0.0/31"
	"pe1-p3":    "10.1.0.2/31"
	"pe2-p4":    "10.1.0.4/31"
	"pe2-p2":    "10.1.0.6/31"
	"p1-p2":     "10.1.0.8/31"
	// Upper core
	"p1-p3":     "10.1.0.10/31"
	"p2-p4":     "10.1.0.12/31"
	"p3-p4":     "10.1.0.14/31"
	// ASBR1
	"p3-asbr1":  "10.1.0.16/31"
	"p4-asbr1":  "10.1.0.18/31"
	// Aggregation
	"pe1-agg1":  "10.1.0.20/31"
	"pe2-agg2":  "10.1.0.22/31"
	// G.8032 ring segments
	"agg1-agg5": "10.1.0.32/31"
	"agg5-pe1":  "10.1.0.34/31"
	// ASBR2
	"p3-asbr2":  "10.1.0.24/31"
	"p4-asbr2":  "10.1.0.26/31"
	// Peering
	"asbr1-upstream": "203.0.113.0/31"
	"asbr2-upstream": "203.0.113.2/31"
}

// Customer/access subnets
customer_subnets: {
	"agg1-ce2":       "10.2.1.0/31"
	"agg2-ce3":       "10.2.2.0/31"
	"ce1-nid1":       "10.2.5.0/31"
	"nid1-pe1":       "10.2.7.0/31"
	"ce4-nid2":       "10.2.6.0/31"
	"nid2-pe2":       "10.2.8.0/31"
	// ENNI inter-carrier
	"enni1-enni2":    "10.2.9.0/31"
	"pe1-enni1":      "10.2.10.0/31"
	"enni2-pe2":      "10.2.11.0/31"
}

// Management subnet
management_subnet: "10.100.0.0/24"

// Autonomous system numbers
sp_asn:       65000
ce1_asn:      65001
upstream_asn: 64999
