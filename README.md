# Service Provider Network Model & Interactive Visualization

**v0.5.0** — An educational reference implementation of a complete service provider backbone network, combining CUE configuration language for declarative network modeling with a React + D3.js interactive visualization.

- **23 devices**: PE, P, RR, ASBR, AGG, NID, ENNI, CE, PCE, ISP-upstream
- **28 protocol schemas** (CUE): BGP, IS-IS, SR-MPLS, VXLAN, L2VPN, ERPS, MEF, and more
- **24 network links** with proper topology (3-P-hop L3VPN path, G.8032 ERPS ring, MEF services)
- **18 validation constraints** in CUE
- **12 educational scenarios** with animated packet flow

---

## Features

- Animated packet flow tracing across multi-hop paths
- Wireshark-style SVG packet views: RFC 32-bit header grids with proportional bit fields, drawn for every hop side by side under the hop chain, with animated push/pop/swap transitions and diff badges between hops
- Hex bytes pane encoded from the real header values (Ethernet, 802.1ad, MPLS, IPv4, UDP/VXLAN, PW control word) with an IPv4 checksum
- QoS pipeline visualization
- What-If link failure simulation
- Domain cloud overlays (SP core, access, data center, MEF)
- Scenario-driven learning with grouped educational walkthroughs
- Fully declarative network model in CUE with export to JSON

---

## Architecture

```
CUE Layer                          UI Layer
─────────────────────────────      ──────────────────────────
schema/                            ui/src/
  ├── protocols (28 schemas)         ├── components/
  ├── devices/  (23 devices)         ├── educational/
  ├── topology/ (24 links)           ├── hooks/
  └── validation/ (18 rules)         └── utils/
         │                                  ▲
         ▼                                  │
   export-data.sh ──► network-data.json ────┘
```

CUE schemas define the network model. `export-data.sh` evaluates and exports to `network-data.json`, which the React UI consumes at runtime.

---

## Quick Start

**Prerequisites**: Node.js 22 (what CI uses; 20+ works). CUE CLI is optional (only needed if modifying the network model).

```bash
cd ui
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

**Rebuilding network data** (only if you change CUE definitions):

```bash
./export-data.sh
```

---

## Project Structure

```
agent_rfc/
├── schema/              # CUE protocol schemas (BGP, IS-IS, SR-MPLS, etc.)
├── devices/             # Per-device CUE configurations (23 devices)
├── topology/            # Link definitions (24 links)
├── validation/          # CUE constraint definitions (18 rules)
├── export-data.sh       # CUE → JSON export script
├── network-data.json    # Exported network model consumed by UI
├── ui/
│   ├── src/
│   │   ├── components/  # React + D3.js visualization components
│   │   ├── educational/ # Scenario definitions and walkthroughs
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Helpers and data transforms
│   ├── package.json
│   └── vite.config.ts
└── .github/workflows/   # CI: lint, test, build, deploy to GitHub Pages
```

---

## Deployment

The site is built and published by GitHub Actions (`.github/workflows/pages.yml`). Every push and pull request runs lint, tests and a production build; pushes to `main` also deploy `ui/dist` to GitHub Pages. Nothing generated is committed. To build locally:

```bash
cd ui
npm run build      # output in ui/dist
npm run preview
```

---

## Educational Scenarios

| Category | Scenario | Description |
|---|---|---|
| **SP Core** | L3VPN CE-to-CE | End-to-end Layer 3 VPN path across PE and P routers |
| | SR-TE Low-Latency | Segment Routing Traffic Engineering with latency optimization |
| | BGP Route Reflection | RR1/RR2 reflecting routes to PE and ASBR peers |
| | TI-LFA Failover | Topology-Independent LFA fast reroute |
| | Internet Transit | ASBR upstream path to ISP |
| **Data Center** | VXLAN Ingress Replication | VXLAN overlay with ingress replication between AGG nodes |
| **MEF Services** | L2VPN Pseudowire | Point-to-point L2VPN across the SP core |
| | ENNI-ENNI E-Line | Carrier-to-carrier Ethernet line service |
| | ENNI-UNI E-Line | External NNI to user-facing UNI E-Line |
| | All-to-One Bundling | MEF VLAN bundling — all VLANs to a single service |
| | Many-to-One Bundling | MEF VLAN bundling — selected VLANs to a single service |
| | 1:1 Bundling | MEF VLAN bundling — one VLAN per service |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause animation |
| `Left Arrow` | Step backward |
| `Right Arrow` | Step forward |
| `+` / `-` | Increase / Decrease speed |
| `Home` / `End` | Jump to first / last hop |
| `d` | Toggle the side-by-side packet drawer |
| `[` / `]` | Packet drawer size (small / medium / large); `Ctrl`+wheel inside the drawer does the same |
| `e` | Expand the active hop in the drawer to full size |
| `c` | Drawer shows only the layers each hop changes |
| `b` | Toggle the hex bytes pane (right panel, and under the active hop in the drawer) |
| `?` | Keyboard shortcut help |
| `Esc` | Return to scenario list |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Network model | CUE configuration language |
| UI framework | React 19 |
| Language | TypeScript 5.9 |
| Visualization | D3.js 7.9 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |

---

## License

MIT
