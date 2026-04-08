import json
import re
from datetime import datetime, timedelta
from typing import Any, List, Dict, Optional
import random

import networkx as nx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

G = nx.DiGraph()
G.add_node("R1", status="online", type="hub", label="Core Network")

# Pydantic models for network management
class Device(BaseModel):
    id: str
    type: str
    ip: Optional[str] = None
    status: str = "online"
    label: Optional[str] = None

class Connection(BaseModel):
    from_device: str
    to_device: str
    status: str = "active"

class NetworkTopology(BaseModel):
    devices: List[Device]
    connections: List[Connection]

class Alert(BaseModel):
    device: str
    issue: str
    severity: str
    time: str

class NetworkAnalysis(BaseModel):
    summary: str
    cause: str
    suggestion: str

class NetworkResponse(BaseModel):
    topology: NetworkTopology
    alerts: List[Alert]
    analysis: NetworkAnalysis
    chat_response: str

# Sample network logs storage
network_logs = []
sample_devices = [
    {"id": "R1", "type": "Router", "ip": "192.168.1.1", "label": "Core Router"},
    {"id": "S1", "type": "Switch", "ip": "192.168.1.2", "label": "Main Switch"},
    {"id": "S2", "type": "Switch", "ip": "192.168.1.3", "label": "Lab Switch"},
    {"id": "FW1", "type": "Firewall", "ip": "192.168.1.10", "label": "Main Firewall"},
    {"id": "SRV1", "type": "Server", "ip": "192.168.1.100", "label": "Application Server"},
    {"id": "PC1", "type": "PC", "ip": "192.168.1.50", "label": "Admin PC"},
]

sample_connections = [
    {"from_device": "R1", "to_device": "S1", "status": "active"},
    {"from_device": "R1", "to_device": "FW1", "status": "active"},
    {"from_device": "S1", "to_device": "S2", "status": "active"},
    {"from_device": "S1", "to_device": "SRV1", "status": "active"},
    {"from_device": "S2", "to_device": "PC1", "status": "active"},
]


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _resolve_node_id(fragment: str) -> str | None:
    """Map a user fragment (e.g. 'switch a', 'R1') to an existing node id."""
    fragment = re.sub(
        r"^(the|a|an)\s+", "", str(fragment or "").strip(), flags=re.I
    )
    frag = _normalize(fragment)
    if not frag:
        return None
    low = (fragment or "").lower()
    if "core" in low and "router" in low and "R1" in G:
        return "R1"
    if "main" in low and "switch" in low:
        for nid in G.nodes:
            if str(nid) == "Switch-A" or "main" in str(G.nodes[nid].get("label", "")).lower():
                return str(nid)
        return "Switch-A" if "Switch-A" in G else None
    best: tuple[int, str] | None = None
    for nid in G.nodes:
        nn = _normalize(str(nid))
        if frag == nn:
            return str(nid)
        if frag in nn or nn in frag:
            score = min(len(frag), len(nn))
            if best is None or score > best[0]:
                best = (score, str(nid))
    return best[1] if best else None


def _next_numbered_id(prefix: str) -> str:
    """Next id like R2, PC3 from existing nodes matching ^prefix(\\d+)$."""
    pat = re.compile(rf"^{re.escape(prefix)}(\d+)$", re.I)
    nmax = 0
    for nid in G.nodes:
        m = pat.match(str(nid))
        if m:
            nmax = max(nmax, int(m.group(1)))
    return f"{prefix}{nmax + 1}"


def _next_numbered_ids(prefix: str, count: int) -> list[str]:
    """Reserve `count` sequential ids (e.g. PC1..PC3) before nodes exist in G."""
    if count <= 0:
        return []
    pat = re.compile(rf"^{re.escape(prefix)}(\d+)$", re.I)
    nmax = 0
    for nid in G.nodes:
        m = pat.match(str(nid))
        if m:
            nmax = max(nmax, int(m.group(1)))
    return [f"{prefix}{nmax + i + 1}" for i in range(count)]


def _next_switch_id() -> str:
    return _next_switch_ids(1)[0]


def _next_switch_ids(count: int) -> list[str]:
    """Next Switch-X ids (after existing Switch-A..Z in G)."""
    if count <= 0:
        return []
    used_ord: list[int] = []
    for nid in G.nodes:
        m = re.match(r"^Switch-([A-Z])$", str(nid))
        if m:
            used_ord.append(ord(m.group(1)))
    cur = max(used_ord) if used_ord else ord("A") - 1
    out: list[str] = []
    for _ in range(count):
        cur += 1
        if cur <= ord("Z"):
            out.append(f"Switch-{chr(cur)}")
        else:
            out.append(_next_numbered_id("SW"))
    return out


def _allocate_node_id(node_type: str) -> str:
    t = (node_type or "edge").lower()
    if t == "cloud":
        if "Cloud-ISP" not in G:
            return "Cloud-ISP"
        return _next_numbered_id("Cloud")
    if t == "router":
        return _next_numbered_id("R")
    if t == "switch":
        return _next_switch_id()
    if t in ("wifi_edge", "ap", "wifi"):
        return _next_numbered_id("AP")
    if t == "pc":
        return _next_numbered_id("PC")
    if t == "server":
        return _next_numbered_id("SRV")
    return _next_numbered_id("NODE")


def update_network_node(node_id, parent_id, status, type="edge", label="Edge Node"):
    if node_id not in G:
        G.add_node(node_id, status=status, type=type, label=label)
    else:
        G.nodes[node_id]["status"] = status
    if parent_id and parent_id in G:
        if not G.has_edge(parent_id, node_id):
            G.add_edge(parent_id, node_id, status="up")


update_network_node("Switch-A", "R1", "online", "switch", "Floor 1 Switch")
update_network_node("Switch-B", "R1", "online", "switch", "Floor 2 Switch")
update_network_node("AP1", "Switch-A", "online", "wifi_edge", "AP-Room101")
update_network_node("AP2", "Switch-A", "warning", "wifi_edge", "AP-Room102")


def _ensure_all_edges_have_status() -> None:
    for u, v, data in G.edges(data=True):
        if "status" not in data or data["status"] not in ("up", "down"):
            data["status"] = "up"


_ensure_all_edges_have_status()


def natural_language_to_topology_json(prompt: str) -> dict[str, Any]:
    """
    Mock Maptive engine: natural language → {nodes, links, remove_nodes?}.
    Matches the schema in maptive_system_prompt.txt (plus optional remove_nodes).
    """
    low = prompt.strip().lower()
    nodes: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []
    remove_nodes: list[str] = []
    lid = 0

    def next_lid() -> str:
        nonlocal lid
        lid += 1
        return f"L{lid}"

    def add_link(
        s: str, t: str, label: str = "ethernet", status: str = "up"
    ) -> None:
        e: dict[str, Any] = {
            "id": next_lid(),
            "source": s,
            "target": t,
            "label": label,
        }
        if status != "up":
            e["status"] = status
        links.append(e)

    # --- Link down / up (failure simulation) ---
    if any(
        k in low
        for k in (
            "link down",
            "link up",
            "break",
            "failure",
            "failed",
            "restore link",
            "bring up",
            "severed",
            "mark it as down",
            "simulate a failure",
        )
    ):
        between = re.search(
            r"between\s+(.+?)\s+and\s+(.+?)(?:\.|$)", low, flags=re.I
        )
        if not between:
            between = re.search(
                r"from\s+(.+?)\s+to\s+(.+?)(?:\.|$)", low, flags=re.I
            )
        if between:
            a = _resolve_node_id(between.group(1))
            b = _resolve_node_id(between.group(2))
            if a and b:
                want_down = not (
                    "link up" in low or "restore" in low or "bring up" in low
                )
                add_link(
                    a,
                    b,
                    label="logical",
                    status="down" if want_down else "up",
                )
                return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    if "remove" in low or "delete" in low:
        words = low.split()
        for i, w in enumerate(words):
            if w in ("remove", "delete") and i + 1 < len(words):
                target = words[i + 1]
                if i + 2 < len(words):
                    target = f"{words[i + 1]} {words[i + 2]}"
                resolved = _resolve_node_id(target.replace(" ", "_"))
                if resolved:
                    remove_nodes.append(resolved)
                return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    if "connect" in low or "attach" in low:
        m = re.search(
            r"(?:connect|attach)\s+(.+?)\s+to\s+(.+?)(?:\.|$)", low, flags=re.I
        )
        if m:
            src = _resolve_node_id(m.group(1))
            tgt = _resolve_node_id(m.group(2))
            if src and tgt:
                add_link(src, tgt, label="ethernet")
            return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    # --- Scenario: basic office LAN ---
    if (
        "basic office" in low
        or ("2960" in low and "workstation" in low)
        or ("three" in low and "workstation" in low)
        or ("3 " in low and "workstation" in low)
    ):
        sw = _allocate_node_id("switch")
        pc_ids = _next_numbered_ids("PC", 3)
        srv = _allocate_node_id("server")
        nodes.extend(
            [
                {"id": sw, "type": "switch", "label": "Cisco 2960 Access"},
                {"id": srv, "type": "server", "label": "Local file server"},
            ]
        )
        for pid in pc_ids:
            nodes.append({"id": pid, "type": "pc", "label": pid})
        add_link("R1", sw, label="uplink")
        for pid in pc_ids:
            add_link(sw, pid, label="access")
        add_link(sw, srv, label="access")
        return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    # --- Scenario: redundant core + ISP cloud ---
    if (
        "redundant" in low
        or "two router" in low
        or ("serial" in low and "router" in low)
        or (
            "distribution" in low
            and "switch" in low
            and ("each" in low or "own" in low)
        )
    ):
        r2, r3 = _next_numbered_ids("R", 2)
        sw_a, sw_b = _next_switch_ids(2)
        cloud_id = "Cloud-ISP"
        nodes.extend(
            [
                {"id": r2, "type": "router", "label": "Core router A"},
                {"id": r3, "type": "router", "label": "Core router B"},
                {"id": sw_a, "type": "switch", "label": "Distribution A"},
                {"id": sw_b, "type": "switch", "label": "Distribution B"},
                {"id": cloud_id, "type": "cloud", "label": "ISP / Internet"},
            ]
        )
        add_link(r2, r3, label="serial_WAN")
        add_link(r2, sw_a, label="trunk")
        add_link(r3, sw_b, label="trunk")
        if "cloud" in low or "isp" in low:
            add_link("R1", cloud_id, label="BGP")
        else:
            add_link(r2, cloud_id, label="BGP")
        return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    # --- Single add / create ---
    if "add" in low or "create" in low:
        node_type = "wifi_edge"
        if "server" in low:
            node_type = "server"
        elif "router" in low:
            node_type = "router"
        elif "switch" in low:
            node_type = "switch"
        elif "pc" in low or "computer" in low or "workstation" in low:
            node_type = "pc"
        elif "cloud" in low:
            node_type = "cloud"

        new_id = _allocate_node_id(node_type)
        type_labels = {
            "router": "Router",
            "switch": "Switch",
            "server": "Server",
            "pc": "PC",
            "wifi_edge": "Access Point",
            "cloud": "Cloud",
        }
        new_label = f"New {type_labels.get(node_type, node_type)}"
        nodes.append(
            {"id": new_id, "type": node_type, "label": new_label}
        )

        parent_id = "R1"
        for node in G.nodes:
            if str(node).lower().replace("_", " ") in low.replace("_", " "):
                parent_id = str(node)
                break
        if parent_id == "R1":
            if "101" in low:
                parent_id = "AP1"
            elif "102" in low:
                parent_id = "AP2"
            elif "switch a" in low or "switch-a" in low:
                parent_id = "Switch-A"
            elif "switch b" in low or "switch-b" in low:
                parent_id = "Switch-B"

        add_link(parent_id, new_id, label="ethernet")
        return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}

    return {"nodes": nodes, "links": links, "remove_nodes": remove_nodes}


def apply_topology_spec(spec: dict[str, Any]) -> list[str]:
    """Merge Maptive JSON into the live graph."""
    errors: list[str] = []
    if not isinstance(spec, dict):
        return ["Spec must be a JSON object"]

    for nid in spec.get("remove_nodes") or []:
        if not nid:
            continue
        if nid in G:
            G.remove_node(nid)
        else:
            errors.append(f"remove_nodes: {nid!r} not found")

    for n in spec.get("nodes") or []:
        nid = n.get("id")
        if not nid:
            errors.append("A node entry is missing id")
            continue
        typ = n.get("type", "switch")
        lab = n.get("label", nid)
        if nid not in G:
            G.add_node(nid, status="online", type=typ, label=lab)
        else:
            G.nodes[nid]["type"] = typ
            G.nodes[nid]["label"] = lab

    for L in spec.get("links") or []:
        s, t = L.get("source"), L.get("target")
        if s not in G or t not in G:
            errors.append(f"Link {s!r}→{t!r}: missing endpoint after node apply")
            continue
        label = L.get("label") or ""
        st = L.get("status", "up")
        if st not in ("up", "down"):
            st = "up"
        if G.has_edge(s, t):
            G[s][t]["status"] = st
            if label:
                G[s][t]["label"] = label
        else:
            G.add_edge(s, t, status=st, label=label)

    _ensure_all_edges_have_status()
    return errors


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    _ensure_all_edges_have_status()
    await websocket.send_json(
        {"type": "topology", "data": nx.node_link_data(G, edges="links")}
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Invalid JSON",
                    }
                )
                continue

            mtype = msg.get("type")
            spec: dict[str, Any]

            if mtype == "apply_topology_json":
                raw_spec = msg.get("spec")
                if not isinstance(raw_spec, dict):
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "apply_topology_json requires object field spec",
                        }
                    )
                    continue
                spec = {
                    "nodes": raw_spec.get("nodes") or [],
                    "links": raw_spec.get("links") or [],
                    "remove_nodes": raw_spec.get("remove_nodes") or [],
                }
            elif mtype == "chat_command":
                user_text = msg.get("text", "")
                if not isinstance(user_text, str) or not user_text.strip():
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "Missing or empty text",
                        }
                    )
                    continue
                spec = natural_language_to_topology_json(user_text)
            else:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Unsupported message type: {mtype!r}",
                    }
                )
                continue

            errs = apply_topology_spec(spec)
            nn = len(spec.get("nodes") or [])
            nl = len(spec.get("links") or [])
            nr = len(spec.get("remove_nodes") or [])
            touched = nn + nl + nr > 0

            await websocket.send_json({"type": "topology_spec", "data": spec})

            if errs:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "; ".join(errs),
                    }
                )
            elif touched:
                await websocket.send_json(
                    {
                        "type": "chat_reply",
                        "message": f"Applied topology JSON ({nn} node(s), {nl} link(s), {nr} remove(s)).",
                    }
                )
            else:
                await websocket.send_json(
                    {
                        "type": "chat_reply",
                        "message": "No matching command; topology unchanged.",
                    }
                )

            await websocket.send_json(
                {"type": "topology", "data": nx.node_link_data(G, edges="links")}
            )

    except WebSocketDisconnect:
        pass


# Network Management API Endpoints
def extract_topology_from_text(text: str) -> Dict:
    """Extract network topology from text input"""
    devices = []
    connections = []
    
    # Simple pattern matching for devices
    device_patterns = [
        (r'router\s+(\w+)', 'Router'),
        (r'switch\s+(\w+)', 'Switch'),
        (r'server\s+(\w+)', 'Server'),
        (r'firewall\s+(\w+)', 'Firewall'),
        (r'pc\s+(\w+)', 'PC'),
    ]
    
    ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
    
    found_devices = set()
    for pattern, device_type in device_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            device_id = match.group(1).upper()
            if device_id not in found_devices:
                found_devices.add(device_id)
                devices.append({
                    "id": device_id,
                    "type": device_type,
                    "ip": None,
                    "status": "online"
                })
    
    # Extract IP addresses
    ip_matches = re.finditer(ip_pattern, text)
    for i, match in enumerate(ip_matches):
        if i < len(devices):
            devices[i]["ip"] = match.group(1)
    
    # Simple connection extraction
    connection_patterns = [
        r'(\w+)\s+connected\s+to\s+(\w+)',
        r'(\w+)\s+->\s+(\w+)',
        r'(\w+)\s+links?\s+to\s+(\w+)',
    ]
    
    for pattern in connection_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            from_device = match.group(1).upper()
            to_device = match.group(2).upper()
            connections.append({
                "from_device": from_device,
                "to_device": to_device,
                "status": "active"
            })
    
    return {"devices": devices, "connections": connections}


def generate_sample_logs(device_ids: List[str]) -> List[Dict]:
    """Generate sample network logs for analysis"""
    logs = []
    current_time = datetime.now()
    
    issues = [
        ("Link Down", "High"),
        ("High CPU Usage", "Medium"),
        ("Packet Loss", "High"),
        ("Memory Leak", "Medium"),
        ("Connection Timeout", "Low"),
        ("Interface Flapping", "Critical"),
    ]
    
    for i in range(20):  # Generate 20 sample logs
        device = random.choice(device_ids)
        issue, severity = random.choice(issues)
        time_offset = random.randint(0, 1440)  # Last 24 hours
        log_time = current_time - timedelta(minutes=time_offset)
        
        logs.append({
            "timestamp": log_time.isoformat(),
            "device": device,
            "issue": issue,
            "severity": severity,
            "description": f"{issue} detected on {device}"
        })
    
    return sorted(logs, key=lambda x: x["timestamp"], reverse=True)


def analyze_network_logs(logs: List[Dict]) -> Dict:
    """Analyze network logs for patterns and issues"""
    if not logs:
        return {
            "summary": "No logs available for analysis.",
            "cause": "No data to analyze.",
            "suggestion": "Check log collection system."
        }
    
    # Count issues by device
    device_issues = {}
    severity_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    
    for log in logs:
        device = log["device"]
        severity = log["severity"]
        
        if device not in device_issues:
            device_issues[device] = []
        device_issues[device].append(log)
        severity_counts[severity] += 1
    
    # Find most problematic device
    most_problematic = max(device_issues.items(), key=lambda x: len(x[1]))
    device_name, issues = most_problematic
    
    # Determine primary issue type
    issue_types = {}
    for issue in issues:
        issue_type = issue["issue"]
        issue_types[issue_type] = issue_types.get(issue_type, 0) + 1
    
    primary_issue = max(issue_types.items(), key=lambda x: x[1])[0]
    
    # Generate analysis
    summary = f"{device_name} has {len(issues)} issues in the last 24 hours. Primary problem: {primary_issue}."
    
    cause_map = {
        "Link Down": "Physical cable failure or port configuration issue",
        "High CPU Usage": "Excessive traffic or processing load",
        "Packet Loss": "Network congestion or hardware malfunction",
        "Memory Leak": "Software bug or memory management issue",
        "Connection Timeout": "Network latency or firewall blocking",
        "Interface Flapping": "Unstable physical connection or duplex mismatch"
    }
    
    cause = cause_map.get(primary_issue, "Unknown cause - further investigation required")
    
    suggestion_map = {
        "Link Down": "Check cable integrity and port configuration",
        "High CPU Usage": "Monitor traffic patterns and consider load balancing",
        "Packet Loss": "Inspect network hardware and check for congestion",
        "Memory Leak": "Restart affected services and apply patches",
        "Connection Timeout": "Verify firewall rules and network paths",
        "Interface Flapping": "Check physical connections and duplex settings"
    }
    
    suggestion = suggestion_map.get(primary_issue, "Perform detailed diagnostic analysis")
    
    return {
        "summary": summary,
        "cause": cause,
        "suggestion": suggestion
    }


@app.post("/api/network/analyze", response_model=NetworkResponse)
async def analyze_network(text_input: Optional[str] = None):
    """Main network analysis endpoint"""
    try:
        # Extract topology or use sample data
        if text_input:
            topology_data = extract_topology_from_text(text_input)
        else:
            topology_data = {
                "devices": sample_devices,
                "connections": sample_connections
            }
        
        # Generate alerts from recent logs
        device_ids = [d["id"] for d in topology_data["devices"]]
        logs = generate_sample_logs(device_ids)
        
        # Get recent logs (last 24 hours)
        recent_logs = [log for log in logs if (datetime.now() - datetime.fromisoformat(log["timestamp"])).total_seconds() < 86400]
        
        # Create alerts from recent logs
        alerts = []
        for log in recent_logs[:10]:  # Top 10 recent alerts
            alerts.append(Alert(
                device=log["device"],
                issue=log["issue"],
                severity=log["severity"],
                time=datetime.fromisoformat(log["timestamp"]).strftime("%I:%M %p")
            ))
        
        # Analyze logs
        analysis_data = analyze_network_logs(recent_logs)
        analysis = NetworkAnalysis(**analysis_data)
        
        # Generate chat response
        chat_response = f"⚠️ Network analysis complete. {analysis_data['summary']} {analysis_data['suggestion']}"
        
        # Create response
        response = NetworkResponse(
            topology=NetworkTopology(**topology_data),
            alerts=alerts,
            analysis=analysis,
            chat_response=chat_response
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network analysis failed: {str(e)}")


@app.get("/api/network/topology", response_model=NetworkTopology)
async def get_network_topology():
    """Get current network topology"""
    return NetworkTopology(
        devices=[Device(**d) for d in sample_devices],
        connections=[Connection(**c) for c in sample_connections]
    )


@app.get("/api/network/logs")
async def get_network_logs(limit: int = 50):
    """Get network logs"""
    device_ids = [d["id"] for d in sample_devices]
    logs = generate_sample_logs(device_ids)
    return {"logs": logs[:limit]}


@app.post("/api/network/topology/extract")
async def extract_topology(text: str):
    """Extract topology from text input"""
    try:
        topology_data = extract_topology_from_text(text)
        return {"topology": topology_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topology extraction failed: {str(e)}")


@app.post("/api/network/logs/analyze")
async def analyze_logs(logs: List[Dict]):
    """Analyze provided network logs"""
    try:
        analysis = analyze_network_logs(logs)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log analysis failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Maptive Pro Network Management API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
