package handoff

// CE Handoff composite schema — ties routing protocol + encapsulation + QoS
// at the service demarcation point.
//
// Per RFC 4364 Section 10 (PE-CE routing protocol options),
// RFC 4577 (OSPF PE-CE specifics),
// MEF 6.3 / MEF 10.4 (UNI service definitions)

import (
	"github.com/jgroom/sp-network-model/schema/common"
	"github.com/jgroom/sp-network-model/schema/ospf"
	"github.com/jgroom/sp-network-model/schema/isis"
	"github.com/jgroom/sp-network-model/schema/bgp"
	"github.com/jgroom/sp-network-model/schema/qos"
	"github.com/jgroom/sp-network-model/schema/l2qos"
	"github.com/jgroom/sp-network-model/schema/dot1q"
	"github.com/jgroom/sp-network-model/schema/dot1ad"
)

// Service type — RFC 4364 (L3VPN), RFC 4447/4761/4762 (L2VPN)
#ServiceType: "l3vpn" | "l2vpn" | "internet"

// Which side of the demarcation this config represents
#HandoffSide: "ce" | "pe"

// Routing protocol choice — RFC 4364 Section 10
#RoutingProtocol: "static" | "ospf" | "isis" | "bgp"

// --- Routing protocol config blocks ---

#StaticRoutingBlock: {
	routes: [...common.#StaticRoute] & [_, ...]
}

#OSPFRoutingBlock: {
	config: ospf.#OSPFConfig
}

#ISISRoutingBlock: {
	config: isis.#ISISConfig
}

#BGPRoutingBlock: {
	asn:         common.#ASN
	neighbors:   [...bgp.#BGPNeighbor] & [_, ...]
	peer_groups: [...bgp.#PeerGroup] | *[]
	vrf?:        string                                    // RFC 4364 Section 4
}

// --- Encapsulation choice ---

#EncapType: "untagged" | "dot1q" | "dot1ad"

#UntaggedEncap: {
	// No VLAN tags — raw Ethernet handoff
}

#Dot1qEncap: {
	config: dot1q.#Dot1qConfig
}

#Dot1adEncap: {
	config: dot1ad.#Dot1adConfig
}

// --- QoS at the handoff ---

#HandoffQoS: {
	// L3 QoS (DiffServ) — RFC 2474, RFC 2475
	l3_qos?: qos.#InterfaceQoS
	// L2 QoS (PCP/DEI) — IEEE 802.1Q-2022 Section 6.9.3
	l2_qos?: l2qos.#L2QoSConfig
}

// --- The composite CE handoff ---

#CEHandoff: {
	name:        string
	description?: string
	side:        #HandoffSide

	// Physical demarcation — MEF 10.4 Section 8 (UNI)
	interface:   string
	service_type: #ServiceType

	// Routing protocol selection — RFC 4364 Section 10
	routing_protocol: #RoutingProtocol

	// Protocol-specific config blocks
	static_routing?: #StaticRoutingBlock
	ospf_routing?:   #OSPFRoutingBlock
	isis_routing?:   #ISISRoutingBlock
	bgp_routing?:    #BGPRoutingBlock

	// Encapsulation selection
	encapsulation: #EncapType

	// Encap-specific config blocks
	untagged_encap?: #UntaggedEncap
	dot1q_encap?:    #Dot1qEncap
	dot1ad_encap?:   #Dot1adEncap

	// QoS treatment at the handoff
	qos?: #HandoffQoS

	// VRF binding for L3VPN service — RFC 4364 Section 4
	vrf?: string

	// --- Conditional constraints ---
	// Enforce routing_protocol → config block consistency
	if routing_protocol == "static" { static_routing: #StaticRoutingBlock }
	if routing_protocol == "ospf"   { ospf_routing:   #OSPFRoutingBlock }
	if routing_protocol == "isis"   { isis_routing:    #ISISRoutingBlock }
	if routing_protocol == "bgp"    { bgp_routing:    #BGPRoutingBlock }

	// Enforce encapsulation → config block consistency
	if encapsulation == "untagged" { untagged_encap: #UntaggedEncap }
	if encapsulation == "dot1q"    { dot1q_encap:    #Dot1qEncap }
	if encapsulation == "dot1ad"   { dot1ad_encap:   #Dot1adEncap }

	// L3VPN service must have VRF
	if service_type == "l3vpn" { vrf: string }
}

// Device-level handoff configuration
#HandoffConfig: {
	handoffs: [...#CEHandoff] & [_, ...]
}
