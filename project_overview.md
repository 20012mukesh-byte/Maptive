# Maptive: Project Overview

**Maptive** is an enterprise-grade, real-time campus infrastructure monitoring and architectural layout platform. It combines visual topology generation (via AI) with real-time fault tracking (via Firebase) into a seamless, high-end "Arctic Glass" interface.

Here is the complete story of the project, from its inception to its current state, and the roadmap of what is still pending.

---

## 1. The Vision (Where We Started)
The initial goal was to build a highly interactive, dynamic network dashboard for university IT admins. We didn't want a boring, static map. We wanted a "Digital Twin":
- An interface that felt scientifically advanced (the "Antigravity" aesthetic).
- The ability to **upload physical architectural PDFs** and have an AI (Grok Vision) automatically draw the network logic.
- A **live monitoring system** where if a real-world router dies, the interface violently pulses red without the user needing to refresh the screen.

## 2. The Current Architecture (What We Built)

We successfully mapped the vision into a functioning React Application (`frontend/`) and a backend simulator / data pipeline.

### The Foundation
- **Framework:** React + Vite + TypeScript + Tailwind CSS (`v4.0`).
- **Aesthetic:** "Arctic Glass." We implemented a gorgeous `bg-[#f0f9ff]` radial gradient with heavy `backdrop-blur-3xl` glass cards, giving the app a floating, weightless feel.
- **Authentication:** Firebase Auth (`useAuthContext`). Users must log in via Google to access their campuses (though a mock login exists for testing).

### The Gateway Flow
We implemented a strict, clean **Wizard Flow**:
1. Users log in and see a pristine **Entry Gateway**.
2. They are given two choices to create their network:
   - **Digital Twin Uplink:** Upload a PDF. `pdfParser.ts` converts the PDF to an image and sends it to Grok Vision (`api.x.ai/v1/chat/completions`) to magically generate a JSON topology structure.
   - **Grok Text Constructor:** Type a plain English prompt (e.g., *"Build a star topology for the CS lab"*), and Grok generates the JSON.

### The Live Canvas
Once generated, the UI fades out and reveals the **Network Dashboard**.
- Driven by **React Flow**, the nodes bounce into a clean layout organically using `dagre` auto-layout and `framer-motion` physics delays.
- Each node maps to a custom SVG Cisco icon (Router, Switch, Firewall).

### Real-Time Diagnostics (The Breakdowns)
- Connected via `useBreakdown.ts` to Firebase Firestore (`network_logs`).
- If an external script or real-world sensor updates a node's status to `DOWN` in the database, the dashboard reacts instantly:
  - The entire screen takes on a subtle, blurred red warning tint.
  - The node pulses neon red.
  - The connection lines connecting to it dynamically "snap" and become a dashed laser red line.
- **Grok Analyst:** The AI sits on the sidebar, actively reading the historical logs to tell you *why* a breakdown occurred, directly citing if it is a recurring hardware failure or a massive traffic spike based on latency history.

---

## 3. The Missing Pieces (What's Next?)

While the core simulation and interaction architecture is standing and polished, there are several key elements still unattached or unimplemented that complete the "Real-World" pipeline:

### A. The Hardware Telemetry Layer (Edge Nodes)
Right now, the dashboard reads from Firebase beautifully, but **what writes to Firebase?**
- Currently, outages are simulated using `graph_engine.py` or manually edited in Firebase.
- **Missing:** The actual Python/Rust microservices or SNMP (Simple Network Management Protocol) workers running on local machines that *actually* ping the physical routers and send the packet-loss metrics to Firebase.

### B. The Simulated CLI Functionality
- We built a gorgeous Cisco CLI simulator (`CiscoCliOverlay.tsx`) that highlights nodes when you type commands like `conf t` or `int g0/0`.
- **Missing:** It doesn't actually alter the configuration of the network, nor does it let you manually rewrite IP tables. It is strictly a visual highlighter right now.

### C. Self-Healing Algorithms
- The "Self Heal" button and framework exist (`applySelfHeal` in `NetworkCreator.tsx`), and the visual state for `healing` (dashed blue lines with high-speed data packet animations) is coded.
- **Missing:** The actual logic that detects an optimal redundant path when a switch fails and automatically draws those blue lines before the user asks for it.

### D. Production Deployment
- The app builds flawlessly, but it relies on a `VITE_XAI_API_KEY` for Grok to actually read PDFs. 
- **Missing:** If we want multiple students/users to use this organically, we will need to deploy this to Vercel/Firebase Hosting and manage API cost-billing (since Grok Vision calls can get expensive when parsing hundreds of heavy PDFs).
