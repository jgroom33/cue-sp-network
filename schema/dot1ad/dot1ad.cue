package dot1ad

import "github.com/jgroom/sp-network-model/schema/common"

// TPID values per IEEE 802.1ad / 802.1Q
#TPID: *0x88a8 | 0x8100 | 0x9100

// Service VLAN tag (outer tag, 802.1ad)
#SVLANTag: {
	svlan_id: common.#VLANID
	tpid:     #TPID | *0x88a8
}

// Customer VLAN tag (inner tag, 802.1Q)
#CVLANTag: {
	cvlan_id: common.#VLANID
	tpid:     #TPID | *0x8100
}

// Port classification per IEEE 802.1ad Section 6
#PortMode: "C-UNI" | "S-UNI" | "NNI"

// VLAN rewrite operations at the provider edge
#VLANRewrite: {
	operation: "push" | "pop" | "swap"
	svlan_id?: common.#VLANID
}

// Q-in-Q interface configuration
#QinQInterface: {
	interface:    string
	port_mode:    #PortMode
	svlan:        #SVLANTag
	cvlan_range:  [...common.#VLANID] | *[]
	rewrite?:     #VLANRewrite
}

// Top-level 802.1ad configuration per device
#Dot1adConfig: {
	enabled:    bool | *true
	interfaces: [...#QinQInterface]
}
