import rustworkx as rx
import json

class MaptiveGraphEngine:
    def __init__(self):
        self.graph = rx.PyDiGraph()

    def create_graph(self, data: dict = None):
        self.graph = rx.PyDiGraph()
        if data and "nodes" in data:
            # Reconstruct from JSON if provided
            node_map = {}
            for node in data["nodes"]:
                idx = self.graph.add_node(node)
                node_map[node["id"]] = idx
            
            for edge in data.get("links", []):
                u = node_map.get(edge["source"])
                v = node_map.get(edge["target"])
                if u is not None and v is not None:
                    self.graph.add_edge(u, v, edge)
        return self

    def add_node(self, node_data: dict):
        return self.graph.add_node(node_data)

    def add_edge(self, u_idx: int, v_idx: int, edge_data: dict):
        return self.graph.add_edge(u_idx, v_idx, edge_data)

    def shortest_path(self, start_idx: int, end_idx: int):
        return rx.digraph_dijkstra_shortest_paths(self.graph, start_idx, end_idx)

    def to_json(self):
        nodes = [self.graph.get_node_data(i) for i in self.graph.node_indices()]
        links = [self.graph.get_edge_data(u, v) for u, v in self.graph.edge_list()]
        return {"nodes": nodes, "links": links}

graph_engine = MaptiveGraphEngine()
