# Changelog

## [0.3.0] - 2026-03-21

### Schema enhancements (Phase 1)

- **BGP**: Added `maximum_prefix`, `timers` (keepalive/holdtime/connect), `ttl_security`, `shutdown`, `multihop` to `#BGPNeighbor` and `#PeerGroup` — RFC 4271/5082
- **IS-IS**: Added SPF throttle timers (`spf_initial_delay`/`spf_second_delay`/`spf_max_wait`), LSP generation timers, `max_lsp_lifetime`, `hostname_dynamic`, per-interface `hello_interval`/`hello_multiplier` — RFC 5301
- **OSPF**: Added `#OSPFGracefulRestart` (RFC 3623), `#StubRouter` (RFC 6987), `spf_max_wait`
- All 13 provider devices now have IS-IS MD5 authentication enabled
- eBGP neighbors on ASBRs have `maximum_prefix: 500000`; PE→CE neighbors have `maximum_prefix: 1000`

### New protocol schemas (Phase 2)

- **LDP** (`schema/ldp/`): Label Distribution Protocol per RFC 5036/5561/5918 — interfaces, targeted neighbors, sessions, graceful restart, IGP sync
- **NTP** (`schema/ntp/`): Network Time Protocol per RFC 5905 — servers, peers, authentication, access control
- **Netflow/IPFIX** (`schema/netflow/`): Flow monitoring per RFC 7011/5101 — samplers, records, exporters, monitors, interface bindings
- NTP is now mandatory for all provider device roles; all 13 provider devices configured with dual NTP servers

### New validation constraints (14–18)

- SRLB range consistency (15000–15999) across SR domain
- IS-IS authentication coverage on all provider devices
- NTP coverage on all provider devices
- Management VRF consistency (MGMT VRF on all provider devices)
- Loopback /32 prefix enforcement

### UI updates

- Validation dashboard now shows 18 health checks (up from 13)
- TypeScript types updated for new schema fields (IS-IS auth, NTP, LDP, Netflow)

## [0.2.0] - 2026-03-21

### Added

- **Interactive Network Topology UI** (`ui/`) — React + D3.js single-page application
  - Force-directed graph visualization of 17 devices and 22 links
  - Nodes color-coded by role (PE, P, RR, ASBR, AGG, CE, PCE, EXTERNAL)
  - Links color-coded by type (core, edge, customer, peering)
  - Click device to open detail panel with full protocol configuration
  - Protocol tabs: IS-IS, SR-MPLS, BGP, BFD, QoS, TI-LFA, SR Policy, Security, Services, 802.1Q/ad, L2 QoS, OSPF
  - Validation dashboard with 13 cross-device health checks
  - Sidebar with device list, search, role/link type filters, protocol filter
  - Drag, zoom, and pan interactions

- **Protocol overlay layers** on the topology graph
  - **iBGP overlay**: 11 dashed amber curved paths showing iBGP peering sessions (RR-client and RR-RR)
  - **eBGP overlay**: 4 dashed orange curved paths (PE→CE, ASBR→ISP)
  - **SR SID labels**: Node SID values displayed above each SR-enabled device
  - **Link IP addresses**: /31 P2P addresses shown on physical links
  - **Loopback IPs**: Loopback addresses shown below device hostnames
  - BGP sessions integrated into force simulation so RRs/PCE are positioned near their peers
  - Hover tooltips on BGP overlay paths showing peer group, AFIs, RR-client status

- **GitHub Pages deployment** — static build in `docs/` directory

### Network model changes

- Added ASBR2, PCE1, ISP upstream device configurations
- Expanded RR1/RR2 with BGP route reflector config (peer groups, RR clients, RPKI)
- Expanded AGG1/AGG2 with BFD, 802.1ad, ACL, CoPP, TI-LFA, QoS configs
- Expanded ASBR1 with MACsec, Flowspec, RPKI, route policy configs
- Added VTEP loopbacks and management subnet to addressing plan
- Added 8 new topology links (AGG, ASBR2, PCE, peering links)
- Added 5 new validation constraints (OSPF router-ID, ASBR redundancy, CoPP coverage, ESI consistency, CE1 handoff)

## [0.1.0] - 2026-03-20

### Added

- Initial CUE service provider network model
- 12 device configurations (PE1, PE2, P1-P4, RR1, RR2, ASBR1, AGG1, AGG2, CE1-CE3)
- 22 protocol schemas (BGP, IS-IS, SR-MPLS, BFD, QoS, VXLAN, L2VPN, VRRP, ACL, CoPP, etc.)
- Topology with 14 links and IP addressing plan
- 8 cross-device validation constraints
