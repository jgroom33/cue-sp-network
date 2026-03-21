# Changelog

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
