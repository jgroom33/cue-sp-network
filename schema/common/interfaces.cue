package common

#Interface: {
	name:        string
	description: string | *""
	enabled:     bool | *true
	mtu:         int & >=1280 & <=9216 | *9000
	ipv4?:       #IPv4Prefix
	ipv6?:       #IPv6Prefix
	type:        "loopback" | "physical" | "lag" | "subinterface"
}
