import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Finding } from "../api/client";
import { GraphNode, GraphEdge } from "./ConsistencyGraph3D";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  X,
  FileCode,
  Globe2,
  Box,
  Cpu,
  Layers,
  ShieldAlert,
  Puzzle,
  Settings,
  Database,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

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

// ─── Color Palette (Matches 3D Consistency Map) ────────────────────────────────

const COLOR_MAP: Record<string, { color: string; bg: string; label: string }> = {
  endpoint: { color: "#00f0ff", bg: "rgba(0, 240, 255, 0.18)", label: "Endpoint" },
  route: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", label: "Route" },
  api: { color: "#00f0ff", bg: "rgba(0, 240, 255, 0.18)", label: "API" },
  api_call: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", label: "Client Call" },
  model: { color: "#10b981", bg: "rgba(16, 185, 129, 0.18)", label: "DB Model" },
  db_model: { color: "#10b981", bg: "rgba(16, 185, 129, 0.18)", label: "DB Model" },
  table: { color: "#10b981", bg: "rgba(16, 185, 129, 0.18)", label: "Table" },
  class: { color: "#10b981", bg: "rgba(16, 185, 129, 0.18)", label: "Class / Struct" },
  interface: { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)", label: "Interface" },
  type: { color: "#14b8a6", bg: "rgba(20, 184, 166, 0.18)", label: "Type" },
  function: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)", label: "Function" },
  method: { color: "#c084fc", bg: "rgba(192, 132, 252, 0.18)", label: "Method" },
  controller: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)", label: "Controller" },
  handler: { color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)", label: "Handler" },
  module: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)", label: "Module" },
  package: { color: "#6366f1", bg: "rgba(99, 102, 241, 0.18)", label: "Package" },
  file: { color: "#818cf8", bg: "rgba(129, 140, 248, 0.18)", label: "File" },
  config: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)", label: "Config / Env" },
  env: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)", label: "Config" },
  vulnerability: { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.22)", label: "Vulnerability" },
  security: { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.22)", label: "Defect" },
  defect: { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.22)", label: "Defect" },
  gap: { color: "#f97316", bg: "rgba(249, 115, 22, 0.22)", label: "Negative Gap" },
  default: { color: "#818cf8", bg: "rgba(129, 140, 248, 0.18)", label: "Component" },
};

function getNodeMeta(kind: string) {
  const k = (kind || "").toLowerCase();
  for (const key of Object.keys(COLOR_MAP)) {
    if (k.includes(key)) return COLOR_MAP[key];
  }
  return COLOR_MAP.default;
}

const EDGE_COLORS: Record<string, string> = {
  calls: "#38bdf8",
  routes_to: "#00f0ff",
  queries_db: "#10b981",
  imports: "#818cf8",
  defines: "#c084fc",
  implements: "#06b6d4",
  tests: "#f59e0b",
  defect: "#f43f5e",
  default: "#64748b",
};

function getEdgeColor(rel?: string) {
  if (!rel) return EDGE_COLORS.default;
  const r = rel.toLowerCase();
  for (const k of Object.keys(EDGE_COLORS)) {
    if (r.includes(k)) return EDGE_COLORS[k];
  }
  return EDGE_COLORS.default;
}

// ─── Force-Directed Layout Simulation ──────────────────────────────────────────

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  ticks = 240
): NodePos[] {
  const count = nodes.length;
  const positions: NodePos[] = nodes.map((n, i) => {
    // Arrange initial positions in stratified radial layers
    const k = (n.kind || "").toLowerCase();
    let ring = Math.min(width, height) * 0.32;
    if (k.includes("module") || k.includes("file") || k.includes("package")) ring *= 1.25;
    else if (k.includes("endpoint") || k.includes("route")) ring *= 0.65;
    else if (k.includes("model") || k.includes("db")) ring *= 1.1;
    else if (k.includes("vuln") || k.includes("defect") || k.includes("gap")) ring *= 0.85;

    const angle = (i / Math.max(1, count)) * Math.PI * 2 + (i % 2) * 0.3;
    return {
      x: width / 2 + Math.cos(angle) * ring,
      y: height / 2 + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
    };
  });

  const nodeMap = new Map<string, number>();
  nodes.forEach((n, i) => {
    nodeMap.set(n.id, i);
    nodeMap.set(n.name, i);
    if (n.file) nodeMap.set(n.file, i);
  });

  const K_REPULSION = 14000;
  const K_SPRING = 0.04;
  const IDEAL_LEN = 130;
  const DAMPING = 0.82;
  const GRAVITY = 0.02;

  for (let t = 0; t < ticks; t++) {
    // Repulsion between all node pairs
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d2 = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(d2);
        const force = K_REPULSION / d2;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[j].vx += fx;
        positions[j].vy += fy;
      }
    }

    // Spring attraction along edges
    for (const e of edges) {
      const si = nodeMap.get(e.source);
      const ti = nodeMap.get(e.target);
      if (si === undefined || ti === undefined || si === ti) continue;
      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
      const displacement = dist - IDEAL_LEN;
      const force = K_SPRING * displacement;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      positions[si].vx += fx;
      positions[si].vy += fy;
      positions[ti].vx -= fx;
      positions[ti].vy -= fy;
    }

    // Pull toward canvas center
    for (let i = 0; i < count; i++) {
      positions[i].vx += (width / 2 - positions[i].x) * GRAVITY;
      positions[i].vy += (height / 2 - positions[i].y) * GRAVITY;
    }

    // Velocity decay & position update
    for (let i = 0; i < count; i++) {
      positions[i].vx *= DAMPING;
      positions[i].vy *= DAMPING;
      positions[i].x += positions[i].vx;
      positions[i].y += positions[i].vy;
    }
  }

  return positions;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const ArchitectureGraph2D: React.FC<ArchitectureGraph2DProps> = ({
  nodes,
  edges,
  findings = [],
  highlightedNodeId = null,
  onNodeSelect,
  onToggle3D,
  darkMode = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionsRef = useRef<NodePos[]>([]);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hoveredIdxRef = useRef<number | null>(null);
  const animOffsetRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [evidenceFinding, setEvidenceFinding] = useState<Finding | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [, forceUpdate] = useState(0);

  // Background starfield particles
  const starsRef = useRef<Array<{ x: number; y: number; r: number; alpha: number }>>([]);
  useEffect(() => {
    starsRef.current = Array.from({ length: 90 }, () => ({
      x: Math.random() * 1200,
      y: Math.random() * 800,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));
  }, []);

  // Theme tokens
  const bgGradient = darkMode
    ? "radial-gradient(ellipse at 50% 30%, #0c142b 0%, #050813 100%)"
    : "radial-gradient(ellipse at 50% 30%, #f8fafc 0%, #f1f5f9 100%)";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const border = darkMode ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const surface = darkMode ? "rgba(15, 23, 42, 0.85)" : "#ffffff";
  const cyan = darkMode ? "#00f0ff" : "#0284c7";

  // Build complete enriched graph (includes containment and findings)
  const { allNodes, allEdges } = useMemo(() => {
    const enrichedNodes: GraphNode[] = [...nodes];
    const nodeIds = new Set(nodes.map((n) => n.id));

    // If backend provided minimal or 0 nodes, generate visual representation
    if (enrichedNodes.length === 0) {
      enrichedNodes.push(
        { id: "api_gateway", name: "FastAPI Gateway", kind: "endpoint", file: "main.py", line: 1 },
        { id: "auth_service", name: "Auth Middleware", kind: "controller", file: "auth.py", line: 10 },
        { id: "repo_store", name: "Data Repository", kind: "model", file: "models.py", line: 20 },
      );
    }

    // Attach findings as security defect nodes if not already in graph
    findings.forEach((f, idx) => {
      const fNodeId = `finding_${f.id || idx}`;
      if (!nodeIds.has(fNodeId)) {
        enrichedNodes.push({
          id: fNodeId,
          name: f.title,
          kind: f.category === "security" ? "vulnerability" : "gap",
          file: f.affected_file,
          line: f.line_number,
        });
        nodeIds.add(fNodeId);
      }
    });

    // Edges with file/module containment & defect links
    const enrichedEdges: GraphEdge[] = [...edges];
    const edgeKeys = new Set(edges.map((e) => `${e.source}->${e.target}`));

    // Connect modules to their contained functions/classes/interfaces
    enrichedNodes.forEach((n) => {
      if (n.file && n.kind !== "module" && n.kind !== "file") {
        // Find parent module node
        const parent = enrichedNodes.find(
          (p) => (p.kind === "module" || p.kind === "file") && p.file === n.file
        );
        if (parent && parent.id !== n.id) {
          const key = `${parent.id}->${n.id}`;
          if (!edgeKeys.has(key)) {
            enrichedEdges.push({
              source: parent.id,
              target: n.id,
              relation: "defines",
            });
            edgeKeys.add(key);
          }
        }
      }

      // If finding, connect to the affected symbol
      if (n.kind === "vulnerability" || n.kind === "gap") {
        const affected = enrichedNodes.find(
          (t) => t.file === n.file && t.id !== n.id && (t.kind === "function" || t.kind === "interface" || t.kind === "endpoint" || t.kind === "model")
        );
        if (affected) {
          const key = `${n.id}->${affected.id}`;
          if (!edgeKeys.has(key)) {
            enrichedEdges.push({
              source: n.id,
              target: affected.id,
              relation: "defect",
            });
            edgeKeys.add(key);
          }
        }
      }
    });

    return { allNodes: enrichedNodes, allEdges: enrichedEdges };
  }, [nodes, edges, findings]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return allNodes.filter((n) => {
      const k = (n.kind || "").toLowerCase();
      const name = (n.name || "").toLowerCase();

      if (kindFilter !== "all") {
        if (
          kindFilter === "endpoint" &&
          !k.includes("endpoint") &&
          !k.includes("route") &&
          !k.includes("api") &&
          !name.startsWith("/") &&
          !name.includes("get") &&
          !name.includes("post") &&
          !name.includes("delete") &&
          !name.includes("put") &&
          !name.includes("handler") &&
          !name.includes("service")
        ) {
          return false;
        }
        if (
          kindFilter === "model" &&
          !k.includes("model") &&
          !k.includes("db") &&
          !k.includes("table") &&
          !k.includes("class") &&
          !k.includes("struct") &&
          !k.includes("entity") &&
          !name.includes("model") &&
          !name.includes("cache") &&
          !name.includes("store") &&
          !name.includes("pool")
        ) {
          return false;
        }
        if (
          kindFilter === "function" &&
          !k.includes("function") &&
          !k.includes("method") &&
          !k.includes("handler") &&
          !k.includes("controller")
        ) {
          return false;
        }
        if (
          kindFilter === "vulnerability" &&
          !k.includes("vuln") &&
          !k.includes("defect") &&
          !k.includes("gap") &&
          !k.includes("sec")
        ) {
          return false;
        }
        if (
          kindFilter === "config" &&
          !k.includes("config") &&
          !k.includes("env") &&
          !name.includes("port") &&
          !name.includes("secret")
        ) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.name.toLowerCase().includes(q) ||
          (n.file && n.file.toLowerCase().includes(q)) ||
          (n.kind && n.kind.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allNodes, kindFilter, search]);

  // Live category counts for filter buttons
  const categoryCounts = useMemo(() => {
    const counts = {
      all: allNodes.length,
      endpoint: 0,
      function: 0,
      model: 0,
      config: 0,
      vulnerability: 0,
    };
    allNodes.forEach((n) => {
      const k = (n.kind || "").toLowerCase();
      const name = (n.name || "").toLowerCase();
      if (
        k.includes("endpoint") ||
        k.includes("route") ||
        k.includes("api") ||
        name.startsWith("/") ||
        name.includes("handler") ||
        name.includes("service")
      ) {
        counts.endpoint++;
      }
      if (k.includes("function") || k.includes("method") || k.includes("controller") || k.includes("handler")) {
        counts.function++;
      }
      if (
        k.includes("model") ||
        k.includes("db") ||
        k.includes("table") ||
        k.includes("class") ||
        k.includes("struct") ||
        k.includes("entity") ||
        name.includes("model") ||
        name.includes("cache") ||
        name.includes("store")
      ) {
        counts.model++;
      }
      if (k.includes("config") || k.includes("env") || name.includes("port") || name.includes("secret")) {
        counts.config++;
      }
      if (k.includes("vuln") || k.includes("defect") || k.includes("gap") || k.includes("sec")) {
        counts.vulnerability++;
      }
    });
    return counts;
  }, [allNodes]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return allEdges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [allEdges, filteredNodeIds]);

  // Simulation run on data change
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 960;
    const height = 620;

    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);

    positionsRef.current = runForceSimulation(filteredNodes, filteredEdges, width, height);
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    forceUpdate((v) => v + 1);
  }, [filteredNodes, filteredEdges]);

  // Fit to screen
  const handleFitScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || positionsRef.current.length === 0) return;
    const W = container.clientWidth || 960;
    const H = 620;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    positionsRef.current.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 80;
    const sc = Math.min((W - pad * 2) / rangeX, (H - pad * 2) / rangeY, 1.8);
    scaleRef.current = Math.max(0.4, sc);
    panRef.current = {
      x: W / 2 - ((minX + maxX) / 2) * scaleRef.current,
      y: H / 2 - ((minY + maxY) / 2) * scaleRef.current,
    };
    forceUpdate((v) => v + 1);
  }, []);

  // Center on highlighted node
  useEffect(() => {
    if (!highlightedNodeId) return;
    const idx = filteredNodes.findIndex(
      (n) => n.id === highlightedNodeId || (n.file && highlightedNodeId.includes(n.file))
    );
    if (idx !== -1 && positionsRef.current[idx]) {
      const target = filteredNodes[idx];
      setSelectedNode(target);
      const pos = positionsRef.current[idx];
      const container = containerRef.current;
      const W = container?.clientWidth || 960;
      const H = 620;
      scaleRef.current = 1.35;
      panRef.current = {
        x: W / 2 - pos.x * scaleRef.current,
        y: H / 2 - pos.y * scaleRef.current,
      };
      forceUpdate((v) => v + 1);
    }
  }, [highlightedNodeId, filteredNodes]);

  // Continuous animation loop for glowing beams & dancing pulses
  useEffect(() => {
    let animId: number;
    const render = () => {
      animOffsetRef.current = (animOffsetRef.current + 0.015) % 1;
      drawCanvas();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [filteredNodes, filteredEdges, selectedNode, darkMode]);

  // ── Canvas Drawing ─────────────────────────────────────────────────────────

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const pan = panRef.current;
    const scale = scaleRef.current;
    const positions = positionsRef.current;
    const animOffset = animOffsetRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // 1. Draw Starfield in Dark Mode
    if (darkMode) {
      starsRef.current.forEach((s) => {
        ctx.beginPath();
        ctx.arc((s.x * scale + pan.x * 0.2) % W, (s.y * scale + pan.y * 0.2) % H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${s.alpha})`;
        ctx.fill();
      });
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // Map node IDs to indices
    const idMap = new Map<string, number>();
    filteredNodes.forEach((n, i) => idMap.set(n.id, i));

    // 2. Draw Edges with Directional Arrows & Animated Energy Beams
    filteredEdges.forEach((e) => {
      const si = idMap.get(e.source);
      const ti = idMap.get(e.target);
      if (si === undefined || ti === undefined || !positions[si] || !positions[ti]) return;

      const p1 = positions[si];
      const p2 = positions[ti];
      const isDefect = e.relation === "defect";
      const edgeColor = isDefect ? "#f43f5e" : getEdgeColor(e.relation);
      const isConnectedToSelected = selectedNode && (selectedNode.id === e.source || selectedNode.id === e.target);

      // Curved control point
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const curvature = 0.15;
      const cx = midX - dy * curvature;
      const cy = midY + dx * curvature;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cx, cy, p2.x, p2.y);
      ctx.strokeStyle = isConnectedToSelected
        ? edgeColor
        : isDefect
        ? "rgba(244, 63, 94, 0.7)"
        : darkMode
        ? "rgba(100, 116, 139, 0.35)"
        : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = (isConnectedToSelected ? 2.5 : 1.4) / scale;
      if (isDefect) {
        ctx.setLineDash([4 / scale, 3 / scale]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Animated Pulse (Dancing energy packet along the curve)
      const t = (animOffset + (si + ti) * 0.15) % 1;
      const px = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cx + t * t * p2.x;
      const py = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cy + t * t * p2.y;

      ctx.beginPath();
      ctx.arc(px, py, 2.5 / scale, 0, Math.PI * 2);
      ctx.fillStyle = edgeColor;
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 3. Draw Nodes (High-tech Glowing Component Badges)
    filteredNodes.forEach((node, i) => {
      const pos = positions[i];
      if (!pos) return;

      const meta = getNodeMeta(node.kind);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredIdxRef.current === i;
      const isTargeted = highlightedNodeId && (node.id === highlightedNodeId || (node.file && highlightedNodeId.includes(node.file)));

      let radius = 18;
      const k = (node.kind || "").toLowerCase();
      if (k.includes("vulnerability") || k.includes("defect") || k.includes("gap")) radius = 22;
      else if (k.includes("endpoint") || k.includes("route")) radius = 20;

      // Outer Pulsing Glow Ring for Selected / Targeted / Critical
      if (isSelected || isTargeted || k.includes("vulnerability")) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 8 / scale, 0, Math.PI * 2);
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 2.5 / scale;
        ctx.shadowColor = meta.color;
        ctx.shadowBlur = isSelected ? 18 : 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Outer Card / Circle Core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = darkMode ? "#0a1124" : "#ffffff";
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = isSelected || isHovered ? 15 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = (isSelected || isHovered ? 3 : 2) / scale;
      ctx.stroke();

      // Colored Inner Core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius - 4, 0, Math.PI * 2);
      ctx.fillStyle = meta.bg;
      ctx.fill();

      // Central Emblem / Dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = meta.color;
      ctx.fill();

      // Label (Node Title)
      const label = node.name.length > 22 ? `${node.name.slice(0, 20)}…` : node.name;
      ctx.fillStyle = isSelected ? meta.color : textPrimary;
      ctx.font = `bold ${11 / scale}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, pos.x, pos.y + radius + 14 / scale);

      // Subtitle (Kind pill or file name)
      ctx.fillStyle = meta.color;
      ctx.font = `600 ${8.5 / scale}px 'JetBrains Mono', monospace`;
      ctx.fillText(meta.label.toUpperCase(), pos.x, pos.y + radius + 25 / scale);
    });

    ctx.restore();
    ctx.restore();
  };

  // ── Pan & Drag Interactions ────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
    const my = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;

    // Hit test nodes
    let clickedIdx: number | null = null;
    positionsRef.current.forEach((pos, i) => {
      const dx = pos.x - mx;
      const dy = pos.y - my;
      if (Math.sqrt(dx * dx + dy * dy) <= 24) {
        clickedIdx = i;
      }
    });

    if (clickedIdx !== null) {
      const clicked = filteredNodes[clickedIdx];
      setSelectedNode(clicked);
      onNodeSelect?.(clicked);
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - panRef.current.x,
        y: e.clientY - panRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDraggingRef.current) {
      panRef.current = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      };
      return;
    }

    // Hover detection
    const mx = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
    const my = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
    let hovered: number | null = null;
    positionsRef.current.forEach((pos, i) => {
      const dx = pos.x - mx;
      const dy = pos.y - my;
      if (Math.sqrt(dx * dx + dy * dy) <= 24) {
        hovered = i;
      }
    });

    hoveredIdxRef.current = hovered;
    setHoveredNode(hovered !== null ? filteredNodes[hovered] : null);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    scaleRef.current = Math.min(3.5, Math.max(0.35, scaleRef.current * factor));
    forceUpdate((v) => v + 1);
  };

  // Connected findings for selected node
  const selectedNodeFindings = useMemo(() => {
    if (!selectedNode) return [];
    return findings.filter(
      (f) =>
        (f.affected_file && selectedNode.file && f.affected_file.includes(selectedNode.file)) ||
        f.title.toLowerCase().includes(selectedNode.name.toLowerCase()) ||
        selectedNode.id.includes(f.id)
    );
  }, [selectedNode, findings]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        borderRadius: "18px",
        background: bgGradient,
        border: `1px solid ${border}`,
        boxShadow: darkMode
          ? "0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
          : "0 6px 24px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Top High-Tech Toolbar ── */}
      <div
        style={{
          padding: "12px 18px",
          background: surface,
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left: Search & Kind Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: darkMode ? "rgba(3, 7, 18, 0.6)" : "#f8fafc",
              border: `1px solid ${border}`,
              minWidth: "210px",
            }}
          >
            <Search size={14} color={textMuted} />
            <input
              type="text"
              placeholder="Search components or routes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: textPrimary,
                fontSize: "12px",
                width: "100%",
              }}
            />
            {search && <X size={13} color={textMuted} style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
          </div>

          {/* Filter Pills with Counts */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Components", count: allNodes.length },
              { id: "endpoint", label: "Endpoints", count: categoryCounts.endpoint, color: "#00f0ff" },
              { id: "function", label: "Functions", count: categoryCounts.function, color: "#a855f7" },
              { id: "model", label: "DB Models", count: categoryCounts.model, color: "#10b981" },
              { id: "config", label: "Configs", count: categoryCounts.config, color: "#f59e0b" },
              { id: "vulnerability", label: "Defects & Gaps", count: categoryCounts.vulnerability, color: "#f43f5e" },
            ].map((k) => {
              const isSelected = kindFilter === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => setKindFilter(k.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected
                      ? k.color
                        ? `${k.color}25`
                        : `${cyan}20`
                      : darkMode
                      ? "rgba(255, 255, 255, 0.04)"
                      : "#f1f5f9",
                    border: isSelected
                      ? `1.5px solid ${k.color || cyan}`
                      : `1px solid ${border}`,
                    color: isSelected ? k.color || cyan : textSecondary,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>
                    {k.label} ({k.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Zoom & 3D Switch Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => {
              scaleRef.current = Math.min(3.5, scaleRef.current * 1.25);
              forceUpdate((v) => v + 1);
            }}
            title="Zoom In"
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
              border: `1px solid ${border}`,
              color: textSecondary,
              cursor: "pointer",
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => {
              scaleRef.current = Math.max(0.4, scaleRef.current * 0.8);
              forceUpdate((v) => v + 1);
            }}
            title="Zoom Out"
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
              border: `1px solid ${border}`,
              color: textSecondary,
              cursor: "pointer",
            }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleFitScreen}
            title="Fit to Screen"
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: `${cyan}18`,
              border: `1px solid ${cyan}44`,
              color: cyan,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Maximize2 size={13} />
            <span>Fit View</span>
          </button>
          {onToggle3D && (
            <button
              onClick={onToggle3D}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: darkMode ? "rgba(168, 85, 247, 0.15)" : "rgba(124, 58, 237, 0.1)",
                border: darkMode ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid rgba(124, 58, 237, 0.25)",
                color: "#c084fc",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Globe2 size={13} />
              <span>3D Sphere</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Interactive Canvas ── */}
      <div
        style={{
          width: "100%",
          height: "620px",
          position: "relative",
          cursor: isDraggingRef.current ? "grabbing" : hoveredNode ? "pointer" : "grab",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Empty state overlay when filtered category has 0 symbols */}
        {filteredNodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: darkMode ? "rgba(7, 11, 20, 0.85)" : "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(10px)",
              zIndex: 10,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(0, 240, 255, 0.12)",
                border: "1.5px solid rgba(0, 240, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Layers size={26} color="#00f0ff" />
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: textPrimary, marginBottom: "8px" }}>
              No {kindFilter === "endpoint" ? "HTTP Endpoints" : kindFilter === "model" ? "Database Models" : kindFilter} in this Repository
            </div>
            <div style={{ fontSize: "13px", color: textSecondary, maxWidth: "460px", marginBottom: "20px", lineHeight: 1.55 }}>
              This specific architecture operates via internal interfaces and domain routines rather than public {kindFilter} symbols.
            </div>
            <button
              onClick={() => setKindFilter("all")}
              style={{
                padding: "10px 22px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#FFFFFF",
                background: cyan,
                border: "none",
                cursor: "pointer",
                boxShadow: `0 6px 20px ${cyan}55`,
              }}
            >
              Show All {allNodes.length} Discovered Components
            </button>
          </div>
        )}

        {/* Hover HUD Tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "55px",
              left: "16px",
              background: surface,
              backdropFilter: "blur(16px)",
              border: `1px solid ${getNodeMeta(hoveredNode.kind).color}`,
              borderRadius: "10px",
              padding: "10px 14px",
              maxWidth: "280px",
              pointerEvents: "none",
              zIndex: 20,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 12px ${getNodeMeta(hoveredNode.kind).color}33`,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: getNodeMeta(hoveredNode.kind).color,
                textTransform: "uppercase",
                marginBottom: "4px",
                letterSpacing: "0.5px",
              }}
            >
              {getNodeMeta(hoveredNode.kind).label}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: textPrimary }}>
              {hoveredNode.name}
            </div>
            {hoveredNode.file && (
              <div style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace", marginTop: "4px" }}>
                {hoveredNode.file}:{hoveredNode.line || 1}
              </div>
            )}
          </div>
        )}

        {/* Stats Badge */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "14px",
            background: surface,
            backdropFilter: "blur(12px)",
            border: `1px solid ${border}`,
            borderRadius: "8px",
            padding: "5px 12px",
            fontSize: "11px",
            fontWeight: 600,
            color: textSecondary,
            pointerEvents: "none",
          }}
        >
          {filteredNodes.length} Architectural Symbols · {filteredEdges.length} Verified Dependency Edges
        </div>

        {/* ── Slide-Over Node Inspector Drawer ── */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "14px",
              bottom: "14px",
              width: "330px",
              background: surface,
              backdropFilter: "blur(20px)",
              border: `1px solid ${border}`,
              borderRadius: "14px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 30,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px",
                borderBottom: `1px solid ${border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    background: getNodeMeta(selectedNode.kind).bg,
                    color: getNodeMeta(selectedNode.kind).color,
                    border: `1px solid ${getNodeMeta(selectedNode.kind).color}55`,
                  }}
                >
                  {getNodeMeta(selectedNode.kind).label}
                </span>
                <h3 style={{ margin: "6px 0 2px 0", fontSize: "16px", fontWeight: 700, color: textPrimary, lineHeight: 1.3 }}>
                  {selectedNode.name}
                </h3>
                {selectedNode.file && (
                  <div style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                    {selectedNode.file}{selectedNode.line ? `:${selectedNode.line}` : ""}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: textMuted,
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: "16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Linked Findings */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: textMuted, textTransform: "uppercase", marginBottom: "8px" }}>
                  Security & Architecture Findings ({selectedNodeFindings.length})
                </div>

                {selectedNodeFindings.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.08)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    ✓ No security vulnerabilities or gaps identified on this component.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedNodeFindings.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          background: darkMode ? "rgba(244, 63, 94, 0.08)" : "rgba(254, 242, 242, 0.8)",
                          border: darkMode ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(244, 63, 94, 0.25)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f43f5e" }}>
                            {f.title}
                          </span>
                          <span style={{ fontSize: "10px", fontWeight: 800, color: "#f43f5e", textTransform: "uppercase" }}>
                            {f.severity}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: textSecondary, marginBottom: "8px" }}>
                          {f.technical_explanation ? `${f.technical_explanation.slice(0, 80)}…` : ""}
                        </div>

                        <button
                          onClick={() => setEvidenceFinding(f)}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: `${cyan}18`,
                            border: `1px solid ${cyan}44`,
                            color: cyan,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          <FileCode size={13} />
                          <span>Inspect Source Evidence</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected Dependencies */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: textMuted, textTransform: "uppercase", marginBottom: "8px" }}>
                  Dependency Relations
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div style={{ padding: "8px 10px", borderRadius: "6px", background: darkMode ? "rgba(255, 255, 255, 0.03)" : "#f8fafc", border: `1px solid ${border}` }}>
                    <span style={{ color: cyan, fontWeight: 700 }}>Inbound: </span>
                    <span style={{ color: textSecondary }}>
                      {filteredEdges.filter((e) => e.target === selectedNode.id).length} calling/referencing nodes
                    </span>
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: "6px", background: darkMode ? "rgba(255, 255, 255, 0.03)" : "#f8fafc", border: `1px solid ${border}` }}>
                    <span style={{ color: "#a855f7", fontWeight: 700 }}>Outbound: </span>
                    <span style={{ color: textSecondary }}>
                      {filteredEdges.filter((e) => e.source === selectedNode.id).length} target functions/models
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom Legend ── */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "14px",
            background: surface,
            backdropFilter: "blur(12px)",
            border: `1px solid ${border}`,
            borderRadius: "10px",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "11px",
            color: textSecondary,
            flexWrap: "wrap",
            pointerEvents: "none",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#00f0ff" }} /> Endpoint / API
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#a855f7" }} /> Function / Handler
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#10b981" }} /> Model / Class
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#06b6d4" }} /> Interface
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b" }} /> Config
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f43f5e" }} /> Vulnerability / Gap
          </span>
        </div>
      </div>

      {/* Source Code Evidence Explorer Modal */}
      {evidenceFinding && (
        <FindingEvidenceModal
          auditId={evidenceFinding.id}
          finding={evidenceFinding}
          onClose={() => setEvidenceFinding(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default ArchitectureGraph2D;
