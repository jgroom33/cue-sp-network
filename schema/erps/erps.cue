package erps

// G.8032 Ethernet Ring Protection Switching — ITU-T G.8032/Y.1344
// Provides sub-50ms protection for Ethernet ring topologies

#ERPSConfig: {
	enabled: bool | *true
	rings: [...#ERPSRing]
}

#ERPSRing: {
	ring_id:    int & >=1 & <=255
	ring_name:  string
	// Control VLAN carries R-APS (Ring Automatic Protection Switching) PDUs
	control_vlan: int & >=1 & <=4094
	// Data VLANs protected by this ring instance
	data_vlans: [...int & >=1 & <=4094]
	// Ring ports — exactly 2 per node (east and west)
	ring_ports: [#ERPSPort, #ERPSPort]
	// Node role in the ring
	node_role: #ERPSNodeRole
	// RPL port designation (only on RPL owner/neighbor)
	rpl_port?: #RPLDesignation
	// Timers
	wait_to_restore: int & >=1 & <=720 | *5   // minutes, default 5
	guard_timer:     int & >=10 & <=2000 | *500 // ms, default 500
	hold_off_timer:  int & >=0 & <=10000 | *0   // ms, default 0
	// Revertive mode
	revertive: bool | *true
	// Ring interconnection (sub-ring or virtual channel)
	interconnection?: #RingInterconnection
}

#ERPSPort: {
	interface:  string
	port_role:  "east" | "west"
	// Administrative state — "blocked" for RPL port under normal operation
	admin_state: "forwarding" | "blocked" | *"forwarding"
}

#ERPSNodeRole: "rpl-owner" | "rpl-neighbor" | "transit"

#RPLDesignation: {
	port:  "east" | "west"   // Which ring port is the RPL
	role:  "owner" | "neighbor"
}

#RingInterconnection: {
	type:           "sub-ring" | "virtual-channel"
	parent_ring_id?: int & >=1 & <=255
	interconnect_node: bool | *false
}
