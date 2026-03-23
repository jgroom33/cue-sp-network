package network

// Top-level network model — 23 devices, 12+ protocol schemas

import (
	"github.com/jgroom/sp-network-model/topology"
	"github.com/jgroom/sp-network-model/devices"
	"github.com/jgroom/sp-network-model/validation"
)

network: {
	// Physical topology and addressing plan
	topo: topology

	// All device configurations
	device_configs: {
		// Provider Edge
		pe1: devices.pe1
		pe2: devices.pe2
		// Provider Core (lower tier)
		p1: devices.p1
		p2: devices.p2
		// Provider Core (upper tier)
		p3: devices.p3
		p4: devices.p4
		// Route Reflectors
		rr1: devices.rr1
		rr2: devices.rr2
		// AS Border Routers
		asbr1: devices.asbr1
		asbr2: devices.asbr2
		// Aggregation
		agg1: devices.agg1
		agg2: devices.agg2
		agg5: devices.agg5
		// Path Computation Element
		pce1: devices.pce1
		// External
		isp_upstream: devices.isp_upstream
		// Customer Edge
		// Network Interface Devices (MEF UNI demarcation)
		nid1: devices.nid1
		nid2: devices.nid2
		enni1: devices.enni1
		enni2: devices.enni2
		// Customer Edge
		ce1: devices.ce1
		ce2: devices.ce2
		ce3: devices.ce3
		ce4: devices.ce4
	}

	// Global validation (hidden — evaluated for constraint checking only)
	_validation: validation
}
