package topology

// Service provider backbone topology — expanded
// 2x PE, 4x P, 2x RR, 2x ASBR, 4x AGG, 3x CE, 1x PCE, 1x EXTERNAL = 19 devices

#Link: {
	a_end: {device: string, interface: string}
	z_end: {device: string, interface: string}
	type:  "core" | "edge" | "customer" | "peering"
	metric?: int
}

devices: ["pe1", "pe2", "p1", "p2", "p3", "p4", "rr1", "rr2", "asbr1", "asbr2", "agg1", "agg2", "agg3", "agg4", "ce1", "ce2", "ce3", "pce1", "isp-upstream"]

device_roles: {
	pe1:            "PE"
	pe2:            "PE"
	p1:             "P"
	p2:             "P"
	p3:             "P"
	p4:             "P"
	rr1:            "RR"
	rr2:            "RR"
	asbr1:          "ASBR"
	asbr2:          "ASBR"
	agg1:           "AGG"
	agg2:           "AGG"
	agg3:           "AGG"
	agg4:           "AGG"
	ce1:            "CE"
	ce2:            "CE"
	ce3:            "CE"
	pce1:           "PCE"
	"isp-upstream": "EXTERNAL"
}

links: [...#Link]
links: [
	// === PE <-> P core (diagonal attachment for 3-P-hop path) ===
	{a_end: {device: "pe1", interface: "eth1"}, z_end: {device: "p1", interface: "eth1"}, type: "core"},
	{a_end: {device: "pe1", interface: "eth2"}, z_end: {device: "p2", interface: "eth1"}, type: "core", metric: 50},
	{a_end: {device: "pe2", interface: "eth1"}, z_end: {device: "p4", interface: "eth5"}, type: "core"},
	{a_end: {device: "pe2", interface: "eth2"}, z_end: {device: "p2", interface: "eth2"}, type: "core", metric: 50},
	// P1 <-> P2 inter-core
	{a_end: {device: "p1", interface: "eth3"}, z_end: {device: "p2", interface: "eth3"}, type: "core"},

	// === Upper Core: P1/P2 <-> P3/P4 ===
	{a_end: {device: "p1", interface: "eth4"}, z_end: {device: "p3", interface: "eth1"}, type: "core"},
	{a_end: {device: "p2", interface: "eth4"}, z_end: {device: "p4", interface: "eth1"}, type: "core"},
	// P3 <-> P4 inter-core
	{a_end: {device: "p3", interface: "eth2"}, z_end: {device: "p4", interface: "eth2"}, type: "core"},

	// === ASBR1 connections to upper core ===
	{a_end: {device: "p3", interface: "eth3"}, z_end: {device: "asbr1", interface: "eth1"}, type: "core"},
	{a_end: {device: "p4", interface: "eth3"}, z_end: {device: "asbr1", interface: "eth2"}, type: "core"},

	// === ASBR2 connections to upper core ===
	{a_end: {device: "p3", interface: "eth4"}, z_end: {device: "asbr2", interface: "eth1"}, type: "core"},
	{a_end: {device: "p4", interface: "eth4"}, z_end: {device: "asbr2", interface: "eth2"}, type: "core"},

	// === ASBR peering to upstream ISP ===
	{a_end: {device: "asbr1", interface: "eth3"}, z_end: {device: "isp-upstream", interface: "eth1"}, type: "peering"},
	{a_end: {device: "asbr2", interface: "eth3"}, z_end: {device: "isp-upstream", interface: "eth2"}, type: "peering"},

	// === PE to AGG (aggregation layer) ===
	{a_end: {device: "pe1", interface: "eth6"}, z_end: {device: "agg1", interface: "eth1"}, type: "edge"},
	{a_end: {device: "pe2", interface: "eth6"}, z_end: {device: "agg2", interface: "eth1"}, type: "edge"},
	{a_end: {device: "pe1", interface: "eth5"}, z_end: {device: "agg3", interface: "eth1"}, type: "edge"},
	{a_end: {device: "pe2", interface: "eth5"}, z_end: {device: "agg4", interface: "eth1"}, type: "edge"},

	// === Customer-facing: CE1 dual-homed via AGG3/AGG4 ===
	{a_end: {device: "agg3", interface: "eth2"}, z_end: {device: "ce1", interface: "eth1"}, type: "customer"},
	{a_end: {device: "agg4", interface: "eth2"}, z_end: {device: "ce1", interface: "eth2"}, type: "customer"},

	// === Customer-facing: single-homed via AGG ===
	{a_end: {device: "agg1", interface: "eth2"}, z_end: {device: "ce2", interface: "eth1"}, type: "customer"},
	{a_end: {device: "agg2", interface: "eth2"}, z_end: {device: "ce3", interface: "eth1"}, type: "customer"},

	// === PE customer services (802.1ad, L2VPN) ===
	{a_end: {device: "pe1", interface: "eth3"}, z_end: {device: "customer-a", interface: "eth0"}, type: "customer"},
	{a_end: {device: "pe2", interface: "eth3"}, z_end: {device: "customer-b", interface: "eth0"}, type: "customer"},
]
