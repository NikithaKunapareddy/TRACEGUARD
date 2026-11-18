import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Finding } from "../api/client";
import { GraphNode, GraphEdge } from "./ConsistencyGraph3D";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArchitectureGraph2DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings?: Finding[];
  highlightedNodeId?: string | null;
  onNodeSelect?: (node: GraphNode | null) => void;
  onToggle3D?: () => void;
  darkMode?: boolean;
}

interface NodePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_RADIUS: Record<string, number> = {
  endpoint: 16,
  function: 10,
  model: 12,
  class: 11,
  config: 8,
  vulnerability: 14,
  gap: 12,
  default: 9,
};

const NODE_COLOR: Record<string, string> = {
  endpoint: "#38bdf8",
  model: "#10b981",
  function: "#a855f7",
  class: "#6366f1",
  config: "#f59e0b",
  vulnerability: "#f43f5e",
  gap: "#f97316",
  default: "#64748b",
};

const EDGE_COLOR: Record<string, string> = {
  calls: "#22d3ee",
  imports: "#6366f1",
  routes_to: "#10b981",
  queries_db: "#f59e0b",
  tests: "#a855f7",
  defines: "#64748b",
  default: "#475569",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#38bdf8",
  info: "#64748b",
};

const KIND_FILTERS = [
  { label: "All", value: "all" },
  { label: "Endpoints", value: "endpoint" },
  { label: "Functions", value: "function" },
  { label: "Models", value: "model" },
  { label: "Files", value: "file" },
  { label: "Configs", value: "config" },
  { label: "Vulnerabilities", value: "vulnerability" },
];

const EDGE_FILTERS = [
  { label: "All", value: "all" },
  { label: "calls", value: "calls" },
  { label: "imports", value: "imports" },
  { label: "routes_to", value: "routes_to" },
  { label: "queries_db", value: "queries_db" },
];

const LEGEND_ITEMS = [
  { label: "Endpoint", color: "#38bdf8" },
  { label: "Function", color: "#a855f7" },
  { label: "Model", color: "#10b981" },
  { label: "Config", color: "#f59e0b" },
  { label: "Vulnerability", color: "#f43f5e" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNodeRadius(kind: string): number {
  const k = (kind || "").toLowerCase();
  for (const key of Object.keys(NODE_RADIUS)) {
    if (k.includes(key)) return NODE_RADIUS[key];
  }
  return NODE_RADIUS.default;
}

function getNodeColor(kind: string): string {
  const k = (kind || "").toLowerCase();
  for (const key of Object.keys(NODE_COLOR)) {
    if (k.includes(key)) return NODE_COLOR[key];
  }
  return NODE_COLOR.default;
}

function getEdgeColor(relation?: string): string {
  if (!relation) return EDGE_COLOR.default;
  const r = relation.toLowerCase();
  for (const key of Object.keys(EDGE_COLOR)) {
    if (r.includes(key)) return EDGE_COLOR[key];
  }
  return EDGE_COLOR.default;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ─── Force Simulation ─────────────────────────────────────────────────────────

function runSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  ticks = 200
): NodePos[] {
  const positions: NodePos[] = nodes.map((_, i) => ({
    x: width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.6,
    y: height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.6,
    vx: 0,
    vy: 0,
  }));

  const idxById = new Map<string, number>();
  nodes.forEach((n, i) => idxById.set(n.id, i));

  const K_REPULSION = 8000;
  const K_SPRING = 0.03;
  const IDEAL_LENGTH = 120;
  const DAMPING = 0.85;
  const GRAVITY = 0.015;

  for (let t = 0; t < ticks; t++) {
    // Repulsion (coulomb)
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist2 = dx * dx + dy * dy + 0.001;
        const dist = Math.sqrt(dist2);
        const force = K_REPULSION / dist2;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[j].vx += fx;
        positions[j].vy += fy;
      }
    }

    // Spring attraction (edges)
    for (const edge of edges) {
      const si = idxById.get(edge.source);
      const ti = idxById.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const displacement = dist - IDEAL_LENGTH;
      const force = K_SPRING * displacement;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      positions[si].vx += fx;
      positions[si].vy += fy;
      positions[ti].vx -= fx;
      positions[ti].vy -= fy;
    }

    // Gravity toward center
    for (let i = 0; i < positions.length; i++) {
      positions[i].vx += (width / 2 - positions[i].x) * GRAVITY;
      positions[i].vy += (height / 2 - positions[i].y) * GRAVITY;
    }

    // Integrate + dampen
    for (let i = 0; i < positions.length; i++) {
      positions[i].vx *= DAMPING;
      positions[i].vy *= DAMPING;
      positions[i].x += positions[i].vx;
      positions[i].y += positions[i].vy;
    }
  }

  return positions;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ArchitectureGraph2D: React.FC<ArchitectureGraph2DProps> = ({
  nodes,
  edges,
  findings = [],
  highlightedNodeId = null,
  onNodeSelect,
  onToggle3D,
  darkMode = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionsRef = useRef<NodePos[]>([]);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hoveredIdxRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [edgeFilter, setEdgeFilter] = useState("all");
  const [, forceRender] = useState(0);

  // ── Filtered visible nodes/edges ──────────────────────────────────────────

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchKind =
        kindFilter === "all" || (n.kind || "").toLowerCase().includes(kindFilter);
      const matchSearch =
        search.trim() === "" ||
        n.name.toLowerCase().includes(search.toLowerCase());
      return matchKind && matchSearch;
    });
  }, [nodes, kindFilter, search]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      const matchEdge =
        edgeFilter === "all" ||
        (e.relation || "").toLowerCase().includes(edgeFilter);
      return (
        matchEdge &&
        filteredNodeIds.has(e.source) &&
        filteredNodeIds.has(e.target)
      );
    });
  }, [edges, edgeFilter, filteredNodeIds]);

  // ── Simulation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width || 800;
    const H = canvas.height || 500;
    if (filteredNodes.length === 0) {
      positionsRef.current = [];
      forceRender((v) => v + 1);
      return;
    }
    positionsRef.current = runSimulation(filteredNodes, filteredEdges, W, H);
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    forceRender((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNodes.length, filteredEdges.length]);

  // ── Fit to screen ──────────────────────────────────────────────────────────

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || positionsRef.current.length === 0) return;
    const W = canvas.width;
    const H = canvas.height;
    const pad = 60;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    positionsRef.current.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const sc = Math.min(
      (W - pad * 2) / rangeX,
      (H - pad * 2) / rangeY,
      4.0
    );
    scaleRef.current = Math.max(0.3, sc);
    panRef.current = {
      x: W / 2 - ((minX + maxX) / 2) * scaleRef.current,
      y: H / 2 - ((minY + maxY) / 2) * scaleRef.current,
    };
    forceRender((v) => v + 1);
  }, []);

  const resetView = useCallback(() => {
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    forceRender((v) => v + 1);
  }, []);

  // ── Highlight node pan/zoom ─────────────────────────────────────────────────

  useEffect(() => {
    if (!highlightedNodeId) return;
    const idx = filteredNodes.findIndex((n) => n.id === highlightedNodeId);
    if (idx === -1 || !positionsRef.current[idx]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const pos = positionsRef.current[idx];
    scaleRef.current = 2;
    panRef.current = {
      x: W / 2 - pos.x * scaleRef.current,
      y: H / 2 - pos.y * scaleRef.current,
    };
    forceRender((v) => v + 1);
  }, [highlightedNodeId, filteredNodes]);

  // ── Canvas draw ────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const positions = positionsRef.current;
    const pan = panRef.current;
    const scale = scaleRef.current;

    // Build index lookup
    const idxById = new Map<string, number>();
    filteredNodes.forEach((n, i) => idxById.set(n.id, i));

    const connectedToSelected = new Set<number>();
    if (selectedNode) {
      filteredEdges.forEach((e) => {
        if (e.source === selectedNode.id) {
          const ti = idxById.get(e.target);
          if (ti !== undefined) connectedToSelected.add(ti);
        }
        if (e.target === selectedNode.id) {
          const si = idxById.get(e.source);
          if (si !== undefined) connectedToSelected.add(si);
        }
      });
    }

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = darkMode ? "#050914" : "#f1f5f9";
    ctx.fillRect(0, 0, W, H);

    if (positions.length === 0) {
      ctx.fillStyle = darkMode ? "#475569" : "#94a3b8";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Run an audit to generate the architecture graph", W / 2, H / 2);
      return;
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // ── Edges ──
    for (const edge of filteredEdges) {
      const si = idxById.get(edge.source);
      const ti = idxById.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      if (!positions[si] || !positions[ti]) continue;

      const color = getEdgeColor(edge.relation);
      ctx.beginPath();
      ctx.moveTo(positions[si].x, positions[si].y);
      ctx.lineTo(positions[ti].x, positions[ti].y);
      ctx.strokeStyle = hexToRgba(color, 0.45);
      ctx.lineWidth = 1 / scale;

      // dashed if inferred (resolution field absent or "inferred")
      const edgeWithRes = edge as GraphEdge & { resolution?: string };
      if (!edgeWithRes.resolution || edgeWithRes.resolution === "inferred") {
        ctx.setLineDash([5 / scale, 4 / scale]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Nodes ──
    for (let i = 0; i < filteredNodes.length; i++) {
      const node = filteredNodes[i];
      const pos = positions[i];
      if (!pos) continue;

      const baseColor = getNodeColor(node.kind);
      let r = getNodeRadius(node.kind);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredIdxRef.current === i;
      const isHighlighted = node.id === highlightedNodeId;
      const isConnected = connectedToSelected.has(i);
      const isSearchMatch =
        search.trim() !== "" &&
        node.name.toLowerCase().includes(search.toLowerCase());

      if (isConnected) r += 2;

      // Glow ring for highlighted
      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(253,224,71,0.9)";
        ctx.lineWidth = 4 / scale;
        ctx.stroke();
      }

      // Search match ring
      if (isSearchMatch) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(253,224,71,0.5)";
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      }

      // Hover glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(baseColor, 0.5);
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      }

      // Fill circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      if (isSelected) {
        ctx.fillStyle = hexToRgba(baseColor, 0.9);
      } else {
        ctx.fillStyle = hexToRgba(baseColor, 0.75);
      }
      ctx.fill();

      // Selected ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2.5 / scale;
        ctx.stroke();
      }

      // Label
      const label = truncate(node.name, 18);
      ctx.fillStyle = darkMode ? "rgba(248,250,252,0.85)" : "rgba(15,23,42,0.85)";
      ctx.font = `${10 / scale}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, pos.x, pos.y + r + 12 / scale);
    }

    ctx.restore();
  }, [
    filteredNodes,
    filteredEdges,
    selectedNode,
    darkMode,
    highlightedNodeId,
    search,
  ]);

  // ── RAF draw loop (single frame on state changes) ──────────────────────────

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  });

  // ── Resize canvas ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const obs = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      forceRender((v) => v + 1);
    });
    obs.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => obs.disconnect();
  }, []);

  // ── Mouse helpers ──────────────────────────────────────────────────────────

  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const pan = panRef.current;
    const scale = scaleRef.current;
    return {
      x: (cx - pan.x) / scale,
      y: (cy - pan.y) / scale,
    };
  }, []);

  const findNodeAtWorld = useCallback(
    (wx: number, wy: number): number | null => {
      let best: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < filteredNodes.length; i++) {
        const pos = positionsRef.current[i];
        if (!pos) continue;
        const r = getNodeRadius(filteredNodes[i].kind) + 4;
        const dx = wx - pos.x;
        const dy = wy - pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= r && d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    [filteredNodes]
  );

  // ── Canvas events ──────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const world = canvasToWorld(cx, cy);
    const hit = findNodeAtWorld(world.x, world.y);
    if (hit === null) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: cx - panRef.current.x, y: cy - panRef.current.y };
    }
  }, [canvasToWorld, findNodeAtWorld]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      lastMouseRef.current = { x: cx, y: cy };

      if (isDraggingRef.current) {
        panRef.current = {
          x: cx - dragStartRef.current.x,
          y: cy - dragStartRef.current.y,
        };
        forceRender((v) => v + 1);
        return;
      }

      const world = canvasToWorld(cx, cy);
      const hit = findNodeAtWorld(world.x, world.y);
      const prev = hoveredIdxRef.current;
      hoveredIdxRef.current = hit;
      setHoveredNode(hit !== null ? filteredNodes[hit] : null);
      if (prev !== hit) forceRender((v) => v + 1);
    },
    [canvasToWorld, filteredNodes, findNodeAtWorld]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const world = canvasToWorld(cx, cy);
        const hit = findNodeAtWorld(world.x, world.y);
        if (hit !== null) {
          const node = filteredNodes[hit];
          const next = selectedNode?.id === node.id ? null : node;
          setSelectedNode(next);
          onNodeSelect?.(next);
        } else {
          setSelectedNode(null);
          onNodeSelect?.(null);
        }
      }
      isDraggingRef.current = false;
    },
    [canvasToWorld, filteredNodes, findNodeAtWorld, onNodeSelect, selectedNode]
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.3, Math.min(4.0, scaleRef.current * factor));
    // Zoom toward cursor
    panRef.current = {
      x: cx - (cx - panRef.current.x) * (newScale / scaleRef.current),
      y: cy - (cy - panRef.current.y) * (newScale / scaleRef.current),
    };
    scaleRef.current = newScale;
    forceRender((v) => v + 1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    hoveredIdxRef.current = null;
    setHoveredNode(null);
  }, []);

  // ── Computed edge stats for panel ──────────────────────────────────────────

  const { incomingEdges, outgoingEdges, nodeFindings } = useMemo(() => {
    if (!selectedNode)
      return { incomingEdges: [] as GraphEdge[], outgoingEdges: [] as GraphEdge[], nodeFindings: [] as Finding[] };
    const inc = filteredEdges.filter((e) => e.target === selectedNode.id);
    const out = filteredEdges.filter((e) => e.source === selectedNode.id);
    const nf = findings.filter(
      (f) =>
        selectedNode.file &&
        (f.affected_file || "").includes(selectedNode.file)
    );
    return { incomingEdges: inc, outgoingEdges: out, nodeFindings: nf };
  }, [selectedNode, filteredEdges, findings]);

  function groupByRelation(edgeList: GraphEdge[]): Record<string, GraphEdge[]> {
    const groups: Record<string, GraphEdge[]> = {};
    for (const e of edgeList) {
      const key = e.relation || "unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const bg = darkMode ? "#0a1628" : "#ffffff";
  const surface = darkMode ? "#0f1f3d" : "#f8fafc";
  const border = darkMode ? "rgba(56,189,248,0.15)" : "rgba(100,116,139,0.2)";
  const text = darkMode ? "#f1f5f9" : "#0f172a";
  const muted = darkMode ? "#64748b" : "#94a3b8";
  const inputBg = darkMode ? "#1e3a5f" : "#f1f5f9";
  const btnBg = darkMode ? "rgba(30,58,95,0.8)" : "#e2e8f0";
  const btnActiveBg = darkMode ? "rgba(56,189,248,0.2)" : "rgba(99,102,241,0.15)";
  const btnActiveBorder = darkMode ? "#38bdf8" : "#6366f1";
  const btnActiveColor = darkMode ? "#38bdf8" : "#6366f1";

  function toolbarBtn(active: boolean) {
    return {
      padding: "5px 10px",
      fontSize: "11px",
      fontWeight: 500,
      border: `1px solid ${active ? btnActiveBorder : border}`,
      borderRadius: "6px",
      cursor: "pointer",
      background: active ? btnActiveBg : btnBg,
      color: active ? btnActiveColor : muted,
      transition: "all 0.15s",
      whiteSpace: "nowrap" as const,
    };
  }

  const panelWidth = 280;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: bg,
        borderRadius: "12px",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
        border: `1px solid ${border}`,
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderBottom: `1px solid ${border}`,
          background: surface,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes…"
          style={{
            padding: "5px 10px",
            fontSize: "12px",
            border: `1px solid ${border}`,
            borderRadius: "6px",
            background: inputBg,
            color: text,
            outline: "none",
            width: "150px",
          }}
        />

        {/* Kind filter */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {KIND_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setKindFilter(f.value)}
              style={toolbarBtn(kindFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Edge filter */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {EDGE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEdgeFilter(f.value)}
              style={toolbarBtn(edgeFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <button
          onClick={() => {
            scaleRef.current = Math.min(4.0, scaleRef.current * 1.2);
            forceRender((v) => v + 1);
          }}
          style={toolbarBtn(false)}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => {
            scaleRef.current = Math.max(0.3, scaleRef.current / 1.2);
            forceRender((v) => v + 1);
          }}
          style={toolbarBtn(false)}
          title="Zoom Out"
        >
          −
        </button>
        <button onClick={fitToScreen} style={toolbarBtn(false)}>
          Fit
        </button>
        <button onClick={resetView} style={toolbarBtn(false)}>
          Reset
        </button>

        {/* 2D/3D toggle */}
        {onToggle3D && (
          <button onClick={onToggle3D} style={toolbarBtn(false)}>
            3D View
          </button>
        )}
      </div>

      {/* ── Canvas + Side Panel ── */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: isDraggingRef.current ? "grabbing" : hoveredNode ? "pointer" : "grab",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />

        {/* Hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              left: "16px",
              background: darkMode ? "rgba(10,22,40,0.95)" : "rgba(255,255,255,0.97)",
              border: `1px solid ${border}`,
              borderRadius: "8px",
              padding: "10px 14px",
              maxWidth: "220px",
              pointerEvents: "none",
              zIndex: 20,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: getNodeColor(hoveredNode.kind),
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              {hoveredNode.kind}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: text }}>
              {hoveredNode.name}
            </div>
            {hoveredNode.file && (
              <div
                style={{
                  fontSize: "11px",
                  color: muted,
                  fontFamily: "monospace",
                  marginTop: "4px",
                }}
              >
                {hoveredNode.file}
                {hoveredNode.line ? `:${hoveredNode.line}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Node count badge */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "12px",
            background: darkMode ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.9)",
            border: `1px solid ${border}`,
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: muted,
            pointerEvents: "none",
          }}
        >
          {filteredNodes.length} nodes · {filteredEdges.length} edges
        </div>

        {/* ── Side Panel ── */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: `${panelWidth}px`,
              height: "100%",
              background: darkMode ? "rgba(10,22,40,0.97)" : "rgba(248,250,252,0.98)",
              borderLeft: `1px solid ${border}`,
              overflowY: "auto",
              padding: "16px",
              zIndex: 15,
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => {
                setSelectedNode(null);
                onNodeSelect?.(null);
              }}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: muted,
                fontSize: "18px",
              }}
            >
              ×
            </button>

            {/* Kind badge */}
            <div
              style={{
                display: "inline-block",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                background: hexToRgba(getNodeColor(selectedNode.kind), 0.15),
                color: getNodeColor(selectedNode.kind),
                marginBottom: "8px",
              }}
            >
              {selectedNode.kind}
            </div>

            {/* Name */}
            <div
              style={{ fontSize: "15px", fontWeight: 700, color: text, marginBottom: "8px", wordBreak: "break-word" }}
            >
              {selectedNode.name}
            </div>

            {/* File */}
            {selectedNode.file && (
              <div
                style={{
                  fontSize: "11px",
                  color: muted,
                  fontFamily: "monospace",
                  marginBottom: "12px",
                  wordBreak: "break-all",
                }}
              >
                {selectedNode.file}
                {selectedNode.line ? `:${selectedNode.line}` : ""}
              </div>
            )}

            {/* Incoming edges */}
            {incomingEdges.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{ fontSize: "10px", fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: "6px" }}
                >
                  Incoming ({incomingEdges.length})
                </div>
                {Object.entries(groupByRelation(incomingEdges)).map(([rel, es]) => (
                  <div key={rel} style={{ marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: getEdgeColor(rel),
                        marginRight: "4px",
                      }}
                    >
                      {rel}
                    </span>
                    {es.map((e, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          color: text,
                          display: "block",
                          paddingLeft: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        ← {filteredNodes.find((n) => n.id === e.source)?.name || e.source}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing edges */}
            {outgoingEdges.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{ fontSize: "10px", fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: "6px" }}
                >
                  Outgoing ({outgoingEdges.length})
                </div>
                {Object.entries(groupByRelation(outgoingEdges)).map(([rel, es]) => (
                  <div key={rel} style={{ marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: getEdgeColor(rel),
                        marginRight: "4px",
                      }}
                    >
                      {rel}
                    </span>
                    {es.map((e, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          color: text,
                          display: "block",
                          paddingLeft: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        → {filteredNodes.find((n) => n.id === e.target)?.name || e.target}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Findings */}
            {nodeFindings.length > 0 && (
              <div>
                <div
                  style={{ fontSize: "10px", fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: "6px" }}
                >
                  Findings ({nodeFindings.length})
                </div>
                {nodeFindings.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: hexToRgba(SEVERITY_COLOR[f.severity] || "#64748b", 0.15),
                      color: SEVERITY_COLOR[f.severity] || "#64748b",
                      border: `1px solid ${hexToRgba(SEVERITY_COLOR[f.severity] || "#64748b", 0.3)}`,
                      cursor: "pointer",
                      marginBottom: "4px",
                      marginRight: "4px",
                      maxWidth: "100%",
                      wordBreak: "break-word",
                    }}
                    title={f.technical_explanation}
                  >
                    {f.severity.toUpperCase()} · {truncate(f.title, 30)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "8px 16px",
          borderTop: `1px solid ${border}`,
          background: surface,
          flexWrap: "wrap",
        }}
      >
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "11px", color: muted }}>{item.label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", color: muted }}>
          Dashed = inferred · Solid = confirmed
        </span>
      </div>
    </div>
  );
};

export default ArchitectureGraph2D;
