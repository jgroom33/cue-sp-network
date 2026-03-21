package lldp

// LLDP schema per IEEE 802.1AB (Link Layer Discovery Protocol)
// and RFC 2922 (LLDP MIB)

// LLDP chassis ID subtype per 802.1AB Section 8.5.2
#ChassisIDSubtype: "chassis-component" | "interface-alias" | "port-component" |
	"mac-address" | "network-address" | "interface-name" | "locally-assigned"

// LLDP port ID subtype per 802.1AB Section 8.5.3
#PortIDSubtype: "interface-alias" | "port-component" | "mac-address" |
	"network-address" | "interface-name" | "agent-circuit-id" | "locally-assigned"

// TLV types that can be enabled/disabled
#OptionalTLV: "system-name" | "system-description" | "system-capabilities" |
	"port-description" | "management-address" | "port-vlan-id" |
	"max-frame-size" | "link-aggregation"

// Per-interface LLDP configuration
#LLDPInterface: {
	name:     string
	enabled:  bool | *true
	transmit: bool | *true
	receive:  bool | *true
}

// LLDP-MED (Media Endpoint Discovery) for VoIP / PoE devices
#LLDPMEDPolicy: {
	application: "voice" | "voice-signaling" | "guest-voice" | "guest-voice-signaling" |
		"softphone-voice" | "video-conferencing" | "streaming-video" | "video-signaling"
	vlan_id?:    int & >=1 & <=4094
	dscp?:       int & >=0 & <=63
	priority?:   int & >=0 & <=7    // 802.1p CoS
}

// Device-level LLDP configuration
#LLDPConfig: {
	enabled:          bool | *true
	// Timers
	tx_interval:      int & >=5 & <=32768 | *30         // seconds between advertisements
	hold_multiplier:  int & >=2 & <=10 | *4             // TTL = tx_interval * hold_multiplier
	reinit_delay:     int & >=1 & <=10 | *2             // seconds before re-init after disable
	tx_delay:         int & >=1 & <=8192 | *2           // min seconds between frames

	// Chassis identification
	chassis_id_subtype: #ChassisIDSubtype | *"mac-address"

	// Optional TLVs to advertise
	optional_tlvs: [...#OptionalTLV] | *[
		"system-name",
		"system-description",
		"system-capabilities",
		"port-description",
		"management-address",
	]

	// Per-interface overrides
	interfaces: [...#LLDPInterface] | *[]

	// LLDP-MED policies
	med_policies: [...#LLDPMEDPolicy] | *[]
}
