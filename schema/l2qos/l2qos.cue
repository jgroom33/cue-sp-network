package l2qos

// L2 QoS schema per IEEE 802.1Q-2022 Section 6.9.3 (PCP/DEI encoding),
// IEEE 802.1Q-2022 Table 8-5 (default PCP encoding),
// RFC 8325 (DiffServ to 802.1Q PCP mapping),
// RFC 5462 (MPLS TC field definition),
// RFC 3270 (DiffServ-aware MPLS TE)

import (
	"github.com/jgroom/sp-network-model/schema/common"
	"github.com/jgroom/sp-network-model/schema/qos"
)

// PCP-to-DSCP mapping entry — ingress: L2 → L3
// Per RFC 8325 Section 4.3
#PCPtoDSCPEntry: {
	pcp:  common.#PCP
	dei:  common.#DEI | *0
	dscp: qos.#DSCPName
}

// PCP-to-MPLS-TC mapping entry — ingress: L2 → MPLS
// Per RFC 5462 (TC field) + RFC 3270 (DS-TE mapping)
#PCPtoMPLSTCEntry: {
	pcp:     common.#PCP
	dei:     common.#DEI | *0
	mpls_tc: qos.#MPLSTrafficClass
}

// DSCP-to-PCP mapping entry — egress: L3 → L2
// Per RFC 8325 Section 4.3
#DSCPtoPCPEntry: {
	dscp: qos.#DSCPName
	pcp:  common.#PCP
	dei:  common.#DEI | *0
}

// PCP mapping table — IEEE 802.1Q-2022 Table 8-5
#PCPMappingTable: {
	name:           string
	pcp_to_dscp:    [...#PCPtoDSCPEntry] | *[]
	pcp_to_mpls_tc: [...#PCPtoMPLSTCEntry] | *[]
	dscp_to_pcp:    [...#DSCPtoPCPEntry] | *[]
}

// L2 classification rule — match on PCP/DEI
// IEEE 802.1Q-2022 Section 6.9.3
#L2ClassificationRule: {
	name:             string
	match_pcp?:       [...common.#PCP]
	match_dei?:       common.#DEI
	forwarding_class: string
}

// L2 remarking action
#L2RemarkAction: {
	name:     string
	set_pcp?: common.#PCP
	set_dei?: common.#DEI
}

// Per-VLAN QoS policy binding — IEEE 802.1Q-2022 Section 6.9.3
#VLANQoSBinding: {
	vlan_id:       int & >=1 & <=4094
	mapping_table: string                                  // reference to #PCPMappingTable.name
}

// Device-level L2 QoS configuration
#L2QoSConfig: {
	enabled:        bool | *true
	mapping_tables: [...#PCPMappingTable] | *[]
	classification: [...#L2ClassificationRule] | *[]
	remark_actions: [...#L2RemarkAction] | *[]
	vlan_bindings:  [...#VLANQoSBinding] | *[]
}
