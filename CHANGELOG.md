# Changelog

## [0.5.1] - 2026-03-23

### Educational onboarding

- **"Simple IP Forwarding" scenario** — new beginner-friendly scenario in a "Getting Started" group, shown first in the scenario selector. Demonstrates pure hop-by-hop IP forwarding (CE2 → AGG1 → PE1) with no MPLS, explaining TTL decrement, MAC rewrite, and L2-vs-L3 fundamentals at each hop
- **Keyboard shortcut help modal** — press `?` or click the `?` button in the panel header to see all shortcuts. Closes on `?`, Escape, or clicking the backdrop

### Testing & documentation

- **Root README** — project overview, architecture diagram, quick start, project structure, scenario table, keyboard shortcuts, and tech stack
- **Unit tests** — added Vitest with 23 tests across two suites:
  - `pathfinding.test.ts`: Dijkstra shortest path, adjacency graph construction, disabled links, backup path computation
  - `clouds.test.ts`: convex hull (Graham scan), cloud SVG path generation, label positioning

## [0.5.0] - 2026-03-23

### Educational mode promoted to primary view

- Educational mode is now the only view — Devices and Validation tabs removed
- Sidebar simplified to a pure control panel: Roles, Link Types, Overlays, Domains
- Removed DevicePanel, ProtocolTabs, ValidationDashboard (1,246 lines of dead code)
- Removed Protocol Filter dropdown (redundant with domain clouds)
- Removed device list and search (device interaction via graph directly)

### Domain cloud overlays

- New overlay type: translucent convex-hull background clouds that visually group devices by protocol domain
- Five clouds: IS-IS Domain (slate), BGP Mesh (amber), VXLAN VTEPs (violet), G.8032 Ring (teal), L2VPN Endpoints (cyan)
- Clouds compute convex hull of member positions with 45px padding and rounded Bézier corners
- Toggleable from new "Domains" section in sidebar; layers stack when multiple active
- New utility: `ui/src/utils/clouds.ts` — Graham scan, hull expansion, SVG path generation

### L2VPN Pseudowire scenario

- New educational scenario: L2VPN VPWS point-to-point pseudowire
- Shows PW label + transport label stack, control word, transparent L2 frame transport
- Full CE-to-CE path: ce1 → pe1 → p1 → p2 → p4 → pe2 → ce4 (3 P hops)

### Topology restructure (19 devices, 24 links)

- **P-core diagonal attachment**: PE1 connects to P1 (primary) + P3 (backup metric 50); PE2 connects to P4 (primary) + P2 (backup metric 50). Forces 3-P-hop IGP shortest path across the core
- **G.8032 ERPS ring**: PE1 → AGG1 → AGG5 → PE1. PE1 is RPL owner (west port blocked), AGG1 is RPL neighbor, AGG5 is transit. Ring protects VLANs 100/200/300 with R-APS on VLAN 4090
- **New schema**: `schema/erps/` — ITU-T G.8032 ring protection (ring ports, RPL designation, WTR/guard/hold-off timers, sub-ring interconnection)
- **Added CE1, CE4**: L2VPN pseudowire attachment circuits (CE1↔PE1:eth4, CE4↔PE2:eth4)
- **Removed CE1 (original), AGG3, AGG4**: Simplified access layer; CE1 repurposed as L2VPN endpoint

## [0.4.0] - 2026-03-21

### Educational Network Visualization

- **Educational mode** — third view alongside Devices/Validation, accessible from the sidebar tab
  - 6 pre-built scenarios: L3VPN CE-to-CE, VXLAN Ingress Replication, SR-TE Low-Latency, BGP Route Reflection, TI-LFA Failover, Internet Transit
  - Packet engine pre-computes full header state at every hop (MPLS push/swap/pop, VXLAN encap/decap, TTL decrement, QoS classification)
  - Animated packet dot with glow trail travels the topology graph along the computed path
  - Header stack "layer cake" diagram (Ethernet/MPLS/IP/VXLAN/Payload) with yellow flash on changed fields per hop
  - QoS pipeline visualization: Classification → Policing → Queuing → WRED (togglable)
  - What-If mode: disable links to simulate failures and see TI-LFA reconvergence
  - Hop timeline with clickable nodes, play/pause/step/speed controls, keyboard shortcuts (Space, arrows, +/-)
  - Service overlay highlighting (L3VPN, VXLAN, L2VPN, Internet paths) on the topology

### Topology changes (17 → 19 devices)

- **Added AGG3 and AGG4** aggregation switches between PEs and CE1
  - CE1 now routes through AGG layer instead of direct PE attachment
  - Full L3VPN path: CE3 → AGG2 → PE2 → P1 → PE1 → AGG1 → CE2 (traverses P core)
- Removed direct PE1↔CE1 and PE2↔CE1 customer links; replaced with PE↔AGG edge links + AGG↔CE customer links
- Removed VRRP and EVPN ESI multihoming config from PE1/PE2 (no longer shared LAN)
- CE1 changed from eBGP dual-homed to static routing via AGG3/AGG4
- Updated validation constraints: removed VRRP/ESI checks, added AGG3/AGG4 to provider device set

### Static graph layout

- Replaced force-directed layout with deterministic fixed positions for all 19 devices
  - P routers arranged in a square (p1/p2 lower, p3/p4 upper)
  - ASBRs above, PEs below, AGGs fanned out beneath PEs, CEs at bottom
  - Nodes stay pinned; drag to reposition persists
- Educational overlay SVG tracks zoom/pan transform for correct alignment

### New files (15 files, ~1,500 lines)

- `ui/src/educational/` — types, scenarios, pathfinding (Dijkstra + SR-TE), packet engine, 10 React components
- `devices/agg3.cue`, `devices/agg4.cue` — full AGG device configs (IS-IS, SR, QoS, BFD, ACL, CoPP, NTP)

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
