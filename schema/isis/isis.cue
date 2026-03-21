package isis

// IS-IS schema per ISO 10589 / RFC 1195 / RFC 5305 (wide metrics)

// NET address format: AFI(49).AreaID.SystemID(6 bytes).NSEL(00)
// Example: 49.0001.0000.0000.0001.00
#NETAddress: string & =~"^49\\.[0-9]{4}(\\.[0-9]{4}){3}\\.00$"

// IS-IS level
#Level: "L1" | "L2" | "L1L2"

// Wide metric range per RFC 5305
#ISISMetric: int & >=1 & <=16777215

// Authentication
#AuthType: "md5" | "cleartext"

#ISISAuthentication: {
	type:    #AuthType
	key:     string
	key_id?: int & >=1 & <=255
}

// Per-interface IS-IS configuration
#ISISInterface: {
	name:          string
	level:         #Level | *"L2"
	metric:        #ISISMetric | *10
	passive:       bool | *false
	network_type:  "point-to-point" | "broadcast" | *"point-to-point"
	authentication?: #ISISAuthentication
}

// Device-level IS-IS configuration
#ISISConfig: {
	instance:        string | *"default"
	net:             #NETAddress
	level:           #Level
	interfaces:      [...#ISISInterface]
	authentication?: #ISISAuthentication
	lsp_mtu:         int & >=512 & <=9216 | *1492
	overload_bit:    bool | *false
}
