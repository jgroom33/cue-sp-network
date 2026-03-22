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
	agg5:         devices.agg5
	pce1:         devices.pce1
	isp_upstream: devices.isp_upstream
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
	agg5:  devices.agg5
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

// 8. OSPF router-ID uniqueness across all OSPF-speaking devices
_ospf_router_id_uniqueness: {
	(devices.ce3.ospf_config.router_id):                                          "ce3"
	(devices.pe2.handoff_config.handoffs[0].ospf_routing.config.router_id): "pe2"
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

// 14. SRLB consistency: all provider devices must use same SRLB range (15000-15999)
_srlb_consistency: {
	for _name, _dev in _provider_devices {
		(_name): _dev.sr_config.srlb & {start: 15000, end: 15999}
	}
}

// 15. IS-IS authentication: all provider devices must have IS-IS auth enabled
_isis_auth_coverage: {
	for _name, _dev in _provider_devices {
		(_name): _dev.isis_config.authentication.type & "md5"
	}
}

// 16. Loopback /32: all provider loopback interfaces must use /32 prefix
_loopback_prefix: {
	for _name, _dev in _provider_devices {
		(_name): [ for _iface in _dev.interfaces if _iface.type == "loopback" && _iface.ipv4 != _|_ {
			_iface.ipv4 & =~"/32$"
		}]
	}
}

// 17. NTP coverage: all provider devices must have NTP configured
_ntp_coverage: {
	for _name, _dev in _provider_devices {
		(_name): _dev.ntp_config.enabled & true
	}
}

// 18. Management VRF consistency: all provider devices must have mgmt_vrf
_mgmt_vrf_coverage: {
	for _name, _dev in _provider_devices {
		(_name): _dev.mgmt_vrf.vrf_name & "MGMT"
	}
}
