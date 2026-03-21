package macsec

// MACsec schema per IEEE 802.1AE (MAC Security),
// IEEE 802.1X-2020 (MKA — MACsec Key Agreement)

// Cipher suite — IEEE 802.1AE Section 14
#CipherSuite: "gcm-aes-128" | "gcm-aes-256" | "gcm-aes-xpn-128" | "gcm-aes-xpn-256"

// Confidentiality offset — IEEE 802.1AE Section 10.6
#ConfidentialityOffset: 0 | 30 | 50

// MKA policy — IEEE 802.1X-2020 Section 9
#MKAPolicy: {
	name:                   string
	cipher_suite:           #CipherSuite | *"gcm-aes-256"
	key_server_priority:    int & >=0 & <=255 | *16      // lower = more preferred
	confidentiality_offset: #ConfidentialityOffset | *0
	include_sci:            bool | *true                  // include SCI in SecTAG
	replay_protection:      bool | *true
	replay_window:          int & >=0 & <=4294967295 | *0 // 0 = strict ordering
}

// Key entry within a key chain
#MACsecKey: {
	id:         int & >=0 & <=255
	key_string: string                                    // hex-encoded pre-shared key
	// Key lifetime
	start_time?: string                                   // ISO 8601 datetime
	end_time?:   string                                   // ISO 8601 datetime
}

// Key chain for MKA
#KeyChain: {
	name: string
	keys: [...#MACsecKey] & [_, ...]
}

// Per-interface MACsec configuration
#MACsecInterface: {
	interface:  string
	mka_policy: string                                    // reference to #MKAPolicy.name
	key_chain:  string                                    // reference to #KeyChain.name
	enabled:    bool | *true
}

// Device-level MACsec configuration
#MACsecConfig: {
	enabled:      bool | *true
	mka_policies: [...#MKAPolicy] | *[]
	key_chains:   [...#KeyChain] | *[]
	interfaces:   [...#MACsecInterface] | *[]
}
