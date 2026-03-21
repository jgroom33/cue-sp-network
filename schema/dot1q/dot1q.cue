package dot1q

// 802.1Q standalone VLAN schema per IEEE 802.1Q-2022, RFC 7042 (EUI/TPID registry)
// Includes VLAN classification rules per IEEE 802.1Q-2022 Section 6.9
// and IEEE 802.1ad Section 6 (provider bridge double-tag matching)

import "github.com/jgroom/sp-network-model/schema/common"

// TPID — IEEE 802.1Q-2022 Section 9.6, RFC 7042 Section 2.1
#TPID: *0x8100 | 0x88a8 | 0x9100

// Port mode — IEEE 802.1Q-2022 Section 6.9 (ingress frame types)
#PortMode: "access" | "trunk"

// VLAN range for trunk allowed-VLAN lists
#VLANRange: {
	start: common.#VLANID
	end:   common.#VLANID
	_valid: true & (end >= start)
}

// Per-interface 802.1Q configuration
#Dot1qInterface: {
	interface:      string
	port_mode:      #PortMode | *"trunk"
	tpid:           #TPID | *0x8100                        // IEEE 802.1Q-2022 Section 9.6
	native_vlan?:   common.#VLANID                         // IEEE 802.1Q-2022 Section 6.9
	// Trunk mode: allowed VLANs
	allowed_vlans?:       [...common.#VLANID]
	allowed_vlan_ranges?: [...#VLANRange]
	// Access mode: single VLAN assignment
	access_vlan?: common.#VLANID
	// Ingress filtering — IEEE 802.1Q-2022 Section 8.6.2
	ingress_filtering: bool | *true
	// Access port must specify access_vlan
	if port_mode == "access" {
		access_vlan: common.#VLANID
	}
}

// VLAN definition
#VLAN: {
	vlan_id:      common.#VLANID
	name?:        string
	description?: string
}

// --- VLAN Classification Engine ---
// IEEE 802.1Q-2022 Section 6.9 (ingress rules)
// IEEE 802.1ad Section 6 (provider bridge double-tag matching)

// Match criteria for VLAN classification
#VLANClassificationMatch: {
	type: "untagged" | "single-tagged" | "double-tagged"
	// Single-tagged match — IEEE 802.1Q-2022 Section 6.9
	vlan_id?:    common.#VLANID                            // exact VLAN match
	vlan_range?: #VLANRange                                // range match
	any_vlan?:   bool                                      // match any C-VLAN
	// Double-tagged match — IEEE 802.1ad Section 6
	outer_vlan_id?: common.#VLANID                         // S-VLAN
	inner_vlan_id?: common.#VLANID                         // C-VLAN
	inner_any?:     bool                                   // match any inner tag
}

// VLAN tag manipulation actions — IEEE 802.1Q-2022 Section 6.9
#VLANClassificationAction: "push" | "pop" | "swap" | "translate"

#VLANRewriteAction: {
	action:          #VLANClassificationAction
	push_vlan_id?:   common.#VLANID                        // for push/swap
	push_tpid?:      #TPID                                 // for push
	translate_from?: common.#VLANID                        // for translate
	translate_to?:   common.#VLANID                        // for translate
}

// Classification rule: match + action
#VLANClassificationRule: {
	name:   string
	match:  #VLANClassificationMatch
	action: #VLANRewriteAction
}

// Device-level 802.1Q configuration
#Dot1qConfig: {
	enabled:              bool | *true
	vlans:                [...#VLAN] | *[]
	interfaces:           [...#Dot1qInterface] | *[]
	classification_rules: [...#VLANClassificationRule] | *[]
}
