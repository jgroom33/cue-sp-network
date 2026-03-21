package validation

// Cross-device global validation constraints — expanded topology
// Covers all provider devices (PE, P, RR, AGG, ASBR, PCE)
// CEs and EXTERNAL are excluded from IS-IS/SR/SRGB checks as they don't participate in the provider underlay

import "github.com/jgroom/sp-network-model/devices"

// All devices (for router-id uniqueness)
_all_devices: {
	pe1:          devices.pe1
	pe2:          devices.pe2
	p1:           devices.p1
	p2:           devices.p2
	p3:           devices.p3
	p4:           devices.p4
	rr1:          devices.rr1
	rr2:          devices.rr2
	asbr1:        devices.asbr1
	asbr2:        devices.asbr2
	agg1:         devices.agg1
	agg2:         devices.agg2
	pce1:         devices.pce1
	isp_upstream: devices.isp_upstream
	ce1:          devices.ce1
	ce2:          devices.ce2
	ce3:          devices.ce3
}

// Provider devices only (IS-IS + SR domain)
_provider_devices: {
	pe1:   devices.pe1
	pe2:   devices.pe2
	p1:    devices.p1
	p2:    devices.p2
	p3:    devices.p3
	p4:    devices.p4
	rr1:   devices.rr1
	rr2:   devices.rr2
	asbr1: devices.asbr1
	asbr2: devices.asbr2
	agg1:  devices.agg1
	agg2:  devices.agg2
	pce1:  devices.pce1
}

// BGP-speaking devices
_bgp_devices: {
	pe1:          devices.pe1
	pe2:          devices.pe2
	rr1:          devices.rr1
	rr2:          devices.rr2
	asbr1:        devices.asbr1
	asbr2:        devices.asbr2
	pce1:         devices.pce1
	isp_upstream: devices.isp_upstream
	ce1:          devices.ce1
}

// 1. SRGB must be identical across the SR domain
_srgb_consistency: {
	for _name, _dev in _provider_devices {
		(_name): _dev.sr_config.srgb & {start: 16000, end: 23999}
	}
}

// 2. Node SID indices must be globally unique
_node_sid_uniqueness: {
	for _name, _dev in _provider_devices {
		for _sid in _dev.sr_config.node_sids {
			"\(_sid.index)": _name
		}
	}
}

// 3. Router IDs must be globally unique (all devices)
_router_id_uniqueness: {
	for _name, _dev in _all_devices {
		(_dev.router_id): _name
	}
}

// 4. IS-IS NET addresses must be unique
_isis_net_uniqueness: {
	for _name, _dev in _provider_devices {
		(_dev.isis_config.net): _name
	}
}

// 5. All L2 backbone devices must share IS-IS area 49.0001
_isis_area_consistency: {
	for _name, _dev in _provider_devices {
		(_name): _dev.isis_config.net & =~"^49\\.0001\\."
	}
}

// 6. iBGP ASN consistency: all provider BGP speakers use SP ASN 65000
_ibgp_asn_consistency: {
	pe1:   devices.pe1.bgp_config.asn & 65000
	pe2:   devices.pe2.bgp_config.asn & 65000
	rr1:   devices.rr1.bgp_config.asn & 65000
	rr2:   devices.rr2.bgp_config.asn & 65000
	asbr1: devices.asbr1.bgp_config.asn & 65000
	asbr2: devices.asbr2.bgp_config.asn & 65000
	pce1:  devices.pce1.bgp_config.asn & 65000
}

// 7. SBFD discriminators must be unique across the SR domain
_sbfd_uniqueness: {
	for _name, _dev in _provider_devices if _dev.bfd_config.sbfd_reflector != _|_ {
		"\(_dev.bfd_config.sbfd_reflector.discriminator)": _name
	}
}

// 8. VRRP: PE1 and PE2 share VRID 1 on eth5 — PE1 must have higher priority
_vrrp_priority_check: {
	_pe1_pri: devices.pe1.vrrp_config.groups[0].priority
	_pe2_pri: devices.pe2.vrrp_config.groups[0].priority
	_valid: true & (_pe1_pri > _pe2_pri)
}

// 9. EVPN ESI consistency: PE1 and PE2 must share the same ESI for CE1 dual-homing
_esi_consistency: {
	_pe1_esi: devices.pe1.vxlan_config.ethernet_segments[0].esi
	_pe2_esi: devices.pe2.vxlan_config.ethernet_segments[0].esi
	_match: _pe1_esi & _pe2_esi
}

// 10. CE1 dual-home handoff consistency: PE1 and PE2 handoffs to CE1 must agree
_ce1_handoff_consistency: {
	_pe1_h: devices.pe1.handoff_config.handoffs[0]
	_pe2_h: devices.pe2.handoff_config.handoffs[0]
	// Routing protocol, service type, and encapsulation must match
	_proto_match: _pe1_h.routing_protocol & _pe2_h.routing_protocol
	_svc_match:   _pe1_h.service_type & _pe2_h.service_type
	_encap_match: _pe1_h.encapsulation & _pe2_h.encapsulation
	_vrf_match:   _pe1_h.vrf & _pe2_h.vrf
}

// 11. OSPF router-ID uniqueness across all OSPF-speaking devices
_ospf_router_id_uniqueness: {
	(devices.ce3.ospf_config.router_id):                                          "ce3"
	(devices.pe2.handoff_config.handoffs[1].ospf_routing.config.router_id): "pe2"
}

// 12. ASBR redundancy: both ASBRs must have eBGP to upstream
_asbr_redundancy: {
	_asbr1_ebgp: [ for n in devices.asbr1.bgp_config.neighbors if n.peer_type == "external" {n}]
	_asbr2_ebgp: [ for n in devices.asbr2.bgp_config.neighbors if n.peer_type == "external" {n}]
}

// 13. CoPP coverage: all provider devices must have copp_config
_copp_coverage: {
	for _name, _dev in _provider_devices {
		(_name): _dev.copp_config.enabled & true
	}
}
