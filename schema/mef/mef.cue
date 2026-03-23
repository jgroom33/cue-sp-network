package mef

// MEF UNI / EVC Service Configuration — MEF 10.4, MEF 26.2
// Models the Network Interface Device (NID) at the customer demarcation point

#MEFConfig: {
	enabled: bool | *true
	unis: [...#UNI]
}

#UNI: {
	uni_id:     string
	uni_type:   #UNIType
	interface:  string
	// Bandwidth profile per MEF 10.4 Section 12
	bandwidth_profile: #BandwidthProfile
	// Class of Service mapping
	cos_mapping?: #CoSMapping
	// Service OAM per MEF 17 / ITU-T Y.1731
	service_oam?: #ServiceOAM
	// EVC association
	evc_id:     string
	evc_type:   "point-to-point" | "multipoint-to-multipoint" | "rooted-multipoint"
}

#UNIType: "UNI-C" | "UNI-N" | "ENNI"

#BandwidthProfile: {
	cir:   int & >=0           // Committed Information Rate (kbps)
	cbs:   int & >=0           // Committed Burst Size (bytes)
	eir?:  int & >=0           // Excess Information Rate (kbps)
	ebs?:  int & >=0           // Excess Burst Size (bytes)
	// Color mode per MEF 10.4
	color_mode: "color-blind" | "color-aware" | *"color-blind"
	// Coupling flag (CF)
	coupling_flag: bool | *false
	// Envelope
	envelope?: string
}

#CoSMapping: {
	type: "pcp" | "dscp" | "evc" | *"pcp"
	// PCP-to-CoS mapping entries
	pcp_entries?: [...#PCPCoSEntry]
}

#PCPCoSEntry: {
	pcp:       int & >=0 & <=7
	cos_name:  string
	color:     "green" | "yellow" | *"green"
}

#ServiceOAM: {
	// MEF 17 / ITU-T Y.1731 CFM
	md_level:    int & >=0 & <=7 | *4
	mep_id:      int & >=1 & <=8191
	// Continuity Check Messages
	ccm_interval: "3.3ms" | "10ms" | "100ms" | "1s" | "10s" | "1min" | "10min" | *"1s"
	// Remote MEP ID (far-end)
	remote_mep_id: int & >=1 & <=8191
	// Loopback and Linktrace
	loopback:   bool | *true
	linktrace:  bool | *true
	// Performance monitoring (delay, loss, jitter)
	performance_monitoring: bool | *true
}
