package device

// Composite device schema unifying all protocol configurations

import (
	"github.com/jgroom/sp-network-model/schema/common"
	"github.com/jgroom/sp-network-model/schema/dot1ad"
	"github.com/jgroom/sp-network-model/schema/dot1q"
	"github.com/jgroom/sp-network-model/schema/isis"
	"github.com/jgroom/sp-network-model/schema/ospf"
	"github.com/jgroom/sp-network-model/schema/sr"
	"github.com/jgroom/sp-network-model/schema/sr_policy"
	"github.com/jgroom/sp-network-model/schema/bgp"
	"github.com/jgroom/sp-network-model/schema/bfd"
	"github.com/jgroom/sp-network-model/schema/qos"
	"github.com/jgroom/sp-network-model/schema/l2qos"
	"github.com/jgroom/sp-network-model/schema/tilfa"
	"github.com/jgroom/sp-network-model/schema/vrrp"
	"github.com/jgroom/sp-network-model/schema/l2vpn"
	"github.com/jgroom/sp-network-model/schema/lldp"
	"github.com/jgroom/sp-network-model/schema/vxlan"
	"github.com/jgroom/sp-network-model/schema/handoff"
	"github.com/jgroom/sp-network-model/schema/acl"
	"github.com/jgroom/sp-network-model/schema/copp"
	"github.com/jgroom/sp-network-model/schema/route_policy"
	"github.com/jgroom/sp-network-model/schema/rpki"
	"github.com/jgroom/sp-network-model/schema/macsec"
	"github.com/jgroom/sp-network-model/schema/flowspec"
	"github.com/jgroom/sp-network-model/schema/ldp"
	"github.com/jgroom/sp-network-model/schema/ntp"
	"github.com/jgroom/sp-network-model/schema/netflow"
	"github.com/jgroom/sp-network-model/schema/erps"
)

#Device: {
	hostname:   string
	role:       common.#DeviceRole
	router_id:  common.#IPv4
	interfaces: [...common.#Interface]

	// All protocol configs optional by default
	isis_config?:         isis.#ISISConfig
	sr_config?:           sr.#SRConfig
	bfd_config?:          bfd.#BFDConfig
	qos_config?:          qos.#QoSConfig
	tilfa_config?:        tilfa.#TILFAConfig
	lldp_config?:         lldp.#LLDPConfig
	sr_policy_config?:    sr_policy.#SRPolicyConfig
	bgp_config?:          bgp.#BGPConfig
	dot1ad_config?:       dot1ad.#Dot1adConfig
	dot1q_config?:        dot1q.#Dot1qConfig
	ospf_config?:         ospf.#OSPFConfig
	l2vpn_config?:        l2vpn.#L2VPNConfig
	vxlan_config?:        vxlan.#VXLANConfig
	vrrp_config?:         vrrp.#VRRPConfig
	l2qos_config?:        l2qos.#L2QoSConfig
	handoff_config?:      handoff.#HandoffConfig
	acl_config?:          acl.#ACLConfig
	copp_config?:         copp.#CoPPConfig
	route_policy_config?: route_policy.#RoutePolicyConfig
	rpki_config?:         rpki.#RPKIConfig
	macsec_config?:       macsec.#MACsecConfig
	flowspec_config?:     flowspec.#FlowspecConfig
	ldp_config?:          ldp.#LDPConfig
	ntp_config?:          ntp.#NTPConfig
	netflow_config?:      netflow.#NetflowConfig
	erps_config?:         erps.#ERPSConfig
	static_routes?:       [...common.#StaticRoute]
	mgmt_vrf?:            common.#ManagementVRF

	// --- PE: full stack ---
	if role == "PE" {
		isis_config:         isis.#ISISConfig
		sr_config:           sr.#SRConfig
		bfd_config:          bfd.#BFDConfig
		qos_config:          qos.#QoSConfig
		tilfa_config:        tilfa.#TILFAConfig
		lldp_config:         lldp.#LLDPConfig
		bgp_config:          bgp.#BGPConfig
		dot1ad_config:       dot1ad.#Dot1adConfig
		sr_policy_config:    sr_policy.#SRPolicyConfig
		acl_config:          acl.#ACLConfig
		copp_config:         copp.#CoPPConfig
		route_policy_config: route_policy.#RoutePolicyConfig
		ntp_config:          ntp.#NTPConfig
	}

	// --- P: underlay + security ---
	if role == "P" {
		isis_config:  isis.#ISISConfig
		sr_config:    sr.#SRConfig
		bfd_config:   bfd.#BFDConfig
		qos_config:   qos.#QoSConfig
		tilfa_config: tilfa.#TILFAConfig
		lldp_config:  lldp.#LLDPConfig
		acl_config:   acl.#ACLConfig
		copp_config:  copp.#CoPPConfig
		ntp_config:   ntp.#NTPConfig
	}

	// --- RR: underlay + BGP RR + security + RPKI ---
	if role == "RR" {
		isis_config:         isis.#ISISConfig
		sr_config:           sr.#SRConfig
		bfd_config:          bfd.#BFDConfig
		qos_config:          qos.#QoSConfig
		tilfa_config:        tilfa.#TILFAConfig
		lldp_config:         lldp.#LLDPConfig
		bgp_config:          bgp.#BGPConfig & {is_route_reflector: true}
		acl_config:          acl.#ACLConfig
		copp_config:         copp.#CoPPConfig
		route_policy_config: route_policy.#RoutePolicyConfig
		rpki_config:         rpki.#RPKIConfig
		ntp_config:          ntp.#NTPConfig
	}

	// --- AGG: underlay + 802.1ad NNI + security ---
	if role == "AGG" {
		isis_config:   isis.#ISISConfig
		sr_config:     sr.#SRConfig
		bfd_config:    bfd.#BFDConfig
		qos_config:    qos.#QoSConfig
		tilfa_config:  tilfa.#TILFAConfig
		lldp_config:   lldp.#LLDPConfig
		dot1ad_config: dot1ad.#Dot1adConfig
		acl_config:    acl.#ACLConfig
		copp_config:   copp.#CoPPConfig
		ntp_config:    ntp.#NTPConfig
	}

	// --- ASBR: underlay + BGP + security + RPKI ---
	if role == "ASBR" {
		isis_config:         isis.#ISISConfig
		sr_config:           sr.#SRConfig
		bfd_config:          bfd.#BFDConfig
		qos_config:          qos.#QoSConfig
		tilfa_config:        tilfa.#TILFAConfig
		lldp_config:         lldp.#LLDPConfig
		bgp_config:          bgp.#BGPConfig
		acl_config:          acl.#ACLConfig
		copp_config:         copp.#CoPPConfig
		route_policy_config: route_policy.#RoutePolicyConfig
		rpki_config:         rpki.#RPKIConfig
		ntp_config:          ntp.#NTPConfig
	}

	// --- PCE: underlay + BGP-LS + security ---
	if role == "PCE" {
		isis_config: isis.#ISISConfig
		sr_config:   sr.#SRConfig
		bfd_config:  bfd.#BFDConfig
		qos_config:  qos.#QoSConfig
		lldp_config: lldp.#LLDPConfig
		bgp_config:  bgp.#BGPConfig
		acl_config:  acl.#ACLConfig
		copp_config: copp.#CoPPConfig
		ntp_config:  ntp.#NTPConfig
	}

	// --- EXTERNAL: minimal — BGP + LLDP only ---
	if role == "EXTERNAL" {
		bgp_config:  bgp.#BGPConfig
		lldp_config: lldp.#LLDPConfig
	}

	// --- CE: minimal — LLDP required, all other protocols optional ---
	if role == "CE" {
		lldp_config: lldp.#LLDPConfig
	}
}
