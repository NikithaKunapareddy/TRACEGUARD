import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import {
  Globe2,
  RotateCcw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  ShieldAlert,
  Search,
  X,
  FileCode,
  ExternalLink,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";

export interface GraphNode {
  id: string;
  name: string;
  kind: string;
  file?: string;
  line?: number;
  x?: number;
  y?: number;
  z?: number;
  finding?: Finding;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
  color?: number;
}

interface ConsistencyGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings?: Finding[];
  onSelectNode?: (nodeName: string) => void;
  darkMode?: boolean;
  auditId?: string;
}

// ─── Classification & Color Taxonomy ──────────────────────────────────────────

interface NodeVisualMeta {
  color: number;
  hex: string;
  label: string;
  category: "security" | "gap" | "endpoint" | "model" | "function" | "interface" | "config" | "module" | "default";
  radius: number;
  geo: "dodecahedron" | "tetrahedron" | "sphere" | "box" | "octahedron" | "icosahedron" | "cylinder";
  halo?: boolean;
  ring?: boolean;
}

function getNodeStyle(node: GraphNode, isDark: boolean = true): NodeVisualMeta {
  const k = (node.kind || "").toLowerCase();
  const name = (node.name || "").toLowerCase();
  const file = (node.file || "").toLowerCase();

  // 1. Security Vulnerability / Defect (Rose Red in Dark, Crimson in Light)
  if (
    node.finding?.category === "security" ||
    k.includes("vuln") ||
    k.includes("sec") ||
    k.includes("defect") ||
    k.includes("cve") ||
    k.includes("sink") ||
    k.includes("finding")
  ) {
    return {
      color: isDark ? 0xf43f5e : 0xdc2626,
      hex: isDark ? "#f43f5e" : "#dc2626",
      label: "Security Defect",
      category: "security",
      radius: 3.2,
      geo: "dodecahedron",
      halo: true,
    };
  }

  // 2. Negative-Space Gap / Missing Implementation (Neon Orange in Dark, Bold Orange in Light)
  if (
    node.finding?.category === "gap" ||
    k.includes("gap") ||
    k.includes("missing") ||
    k.includes("stub") ||
    name.includes("mock") ||
    name.includes("unimplemented")
  ) {
    return {
      color: isDark ? 0xf97316 : 0xea580c,
      hex: isDark ? "#f97316" : "#ea580c",
      label: "Negative-Space Gap",
      category: "gap",
      radius: 3.0,
      geo: "tetrahedron",
      halo: true,
    };
  }

  // 3. API Route / Endpoint (Electric Cyan in Dark, Rich Azure in Light)
  if (
    k === "endpoint" ||
    k.includes("route") ||
    k.includes("api") ||
    name.startsWith("/") ||
    name.includes("get") ||
    name.includes("post") ||
    name.includes("delete") ||
    name.includes("put") ||
    name.includes("patch") ||
    name.includes("handler") ||
    name.includes("service")
  ) {
    return {
      color: isDark ? 0x00f0ff : 0x0284c7,
      hex: isDark ? "#00f0ff" : "#0284c7",
      label: "API Endpoint",
      category: "endpoint",
      radius: 2.8,
      geo: "sphere",
      ring: true,
    };
  }

  // 4. Database Model / Table / Entity / Struct (Emerald Green)
  if (
    k.includes("model") ||
    k.includes("table") ||
    k.includes("database") ||
    k.includes("db") ||
    k.includes("entity") ||
    k.includes("class") ||
    k.includes("struct") ||
    k.includes("migration") ||
    name.includes("model") ||
    name.includes("cache") ||
    name.includes("store") ||
    name.includes("pool")
  ) {
    return {
      color: isDark ? 0x10b981 : 0x059669,
      hex: isDark ? "#10b981" : "#059669",
      label: "DB Model / Entity",
      category: "model",
      radius: 2.8,
      geo: "box",
    };
  }

  // 5. Interface / Contract / Type (Turquoise in Dark, Deep Teal in Light)
  if (k.includes("interface") || k.includes("type") || k.includes("contract")) {
    return {
      color: isDark ? 0x06b6d4 : 0x0891b2,
      hex: isDark ? "#06b6d4" : "#0891b2",
      label: "Interface / Contract",
      category: "interface",
      radius: 2.6,
      geo: "icosahedron",
    };
  }

  // 6. Config / Environment (Amber Gold in Dark, Warm Ochre in Light)
  if (k.includes("config") || k.includes("env") || file.includes(".env") || name.includes("config")) {
    return {
      color: isDark ? 0xf59e0b : 0xd97706,
      hex: isDark ? "#f59e0b" : "#d97706",
      label: "Config / Env",
      category: "config",
      radius: 2.5,
      geo: "cylinder",
    };
  }

  // 7. Function / Controller / Handler / Service (Electric Violet in Dark, Royal Purple in Light)
  if (
    name.includes("controller") ||
    name.includes("handler") ||
    name.includes("service") ||
    name.includes("helper") ||
    k === "function" ||
    k === "method" ||
    k === "guard"
  ) {
    return {
      color: isDark ? 0xa855f7 : 0x7c3aed,
      hex: isDark ? "#a855f7" : "#7c3aed",
      label: "Function / Controller",
      category: "function",
      radius: 2.5,
      geo: "octahedron",
    };
  }

  // 8. Module / Package / File (Indigo in Dark, Deep Indigo in Light)
  if (k === "file" || k === "module" || k === "package") {
    return {
      color: isDark ? 0x6366f1 : 0x4338ca,
      hex: isDark ? "#6366f1" : "#4338ca",
      label: "Module / File",
      category: "module",
      radius: 2.3,
      geo: "dodecahedron",
    };
  }

  // Default fallback (Cyan in Dark, Royal Cobalt in Light)
  return {
    color: isDark ? 0x38bdf8 : 0x2563eb,
    hex: isDark ? "#38bdf8" : "#2563eb",
    label: "Component",
    category: "default",
    radius: 2.4,
    geo: "sphere",
  };
}

export const ConsistencyGraph3D: React.FC<ConsistencyGraph3DProps> = ({
  nodes,
  edges,
  findings = [],
  onSelectNode,
  darkMode = true,
  auditId,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [evidenceFinding, setEvidenceFinding] = useState<Finding | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // ─── 1. Build Comprehensive Combined Nodes & Edges ──────────────────────────
  const { allNodes, allEdges } = useMemo(() => {
    const list: GraphNode[] = [];
    const seenIds = new Set<string>();

    // A. Backend Symbols (with clean display labels & filtered benchmark harness metadata)
    const IGNORED_META = new Set(["traps_to_reject", "known_defects"]);
    if (nodes && nodes.length > 0) {
      nodes.forEach((n) => {
        const rawName = (n.name || "").trim();
        if (IGNORED_META.has(rawName.toLowerCase())) return;
        if (n.file && n.file.toLowerCase().includes("ground_truth.json")) return;
        let cleanName = rawName;
        let cleanKind = n.kind || "component";
        if (rawName.startsWith("fn:")) {
          cleanName = `${rawName.slice(3)}()`;
          if (!cleanKind || cleanKind === "node" || cleanKind === "component") cleanKind = "function";
        } else if (rawName.startsWith("mod:")) {
          cleanName = rawName.slice(4);
          if (!cleanKind || cleanKind === "node" || cleanKind === "component") cleanKind = "module";
        }
        if (!seenIds.has(n.id)) {
          seenIds.add(n.id);
          list.push({ ...n, name: cleanName, kind: cleanKind });
        }
      });
    }

    // B. Integrate Findings as High-Visibility 3D Nodes
    if (findings && findings.length > 0) {
      findings.forEach((f, idx) => {
        const findingId = `finding_${f.id || idx}`;
        if (!seenIds.has(findingId)) {
          seenIds.add(findingId);
          list.push({
            id: findingId,
            name: f.title.length > 28 ? f.title.slice(0, 26) + "…" : f.title,
            kind: f.category === "security" ? "vulnerability" : f.category === "gap" ? "gap" : "hygiene",
            file: f.affected_file,
            line: f.line_number,
            finding: f,
          });
        }
      });
    }

    // Fallback if completely empty
    if (list.length === 0) {
      list.push(
        { id: "api_gateway", name: "FastAPI Gateway", kind: "endpoint", file: "app/main.py", line: 1 },
        { id: "auth_service", name: "Authentication Service", kind: "function", file: "app/auth.py", line: 12 },
        { id: "user_model", name: "User Database Model", kind: "model", file: "app/models.py", line: 40 },
        { id: "payment_controller", name: "Billing Controller", kind: "function", file: "app/billing.py", line: 18 },
        { id: "config_env", name: "JWT Secret / ENV", kind: "config", file: ".env", line: 2 }
      );
    }

    // Build Edges
    const edgeList: GraphEdge[] = [];
    if (edges && edges.length > 0) {
      edges.forEach((e) => {
        edgeList.push({
          source: e.source,
          target: e.target,
          relation: e.relation || "calls",
          color: 0x38bdf8,
        });
      });
    }

    // Synthesize connections between findings and target files / symbols
    findings.forEach((f, idx) => {
      const fId = `finding_${f.id || idx}`;
      // Find matching node by file
      const match = list.find((n) => n.id !== fId && n.file && f.affected_file.includes(n.file));
      if (match) {
        edgeList.push({
          source: fId,
          target: match.id,
          relation: "affects",
          color: f.category === "security" ? 0xf43f5e : 0xf97316,
        });
      }
    });

    // If edges are still minimal, synthesize topological links between functional layers
    if (edgeList.length < list.length - 1) {
      for (let i = 0; i < list.length; i++) {
        const next = list[(i + 1) % list.length];
        edgeList.push({
          source: list[i].id,
          target: next.id,
          relation: "connected",
          color: 0x3b82f6,
        });
      }
    }

    return { allNodes: list, allEdges: edgeList };
  }, [nodes, edges, findings]);

  // ─── 2. Filter Nodes ────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => {
      const style = getNodeStyle(node);
      const matchesCategory =
        activeCategory === "all" ||
        style.category === activeCategory ||
        (activeCategory === "security" && (style.category === "security" || style.category === "gap"));

      const matchesSearch =
        !searchQuery ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.file && node.file.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [allNodes, activeCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allNodes.length, security: 0, endpoint: 0, model: 0, function: 0, config: 0 };
    allNodes.forEach((n) => {
      const s = getNodeStyle(n, darkMode);
      if (s.category === "security" || s.category === "gap") counts.security = (counts.security || 0) + 1;
      if (s.category === "endpoint") counts.endpoint = (counts.endpoint || 0) + 1;
      if (s.category === "model") counts.model = (counts.model || 0) + 1;
      if (s.category === "function") counts.function = (counts.function || 0) + 1;
      if (s.category === "config") counts.config = (counts.config || 0) + 1;
    });
    return counts;
  }, [allNodes, darkMode]);

  // ─── 3. Three.js Scene Setup ────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    // A. Scene & Camera - Dead Center at (0, 0, 95) looking directly at (0, 0, 0)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(0, 0, 126);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // B. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // C. Dynamic Studio Lights - Balanced so all node pigments shine vibrantly
    const ambientLight = new THREE.AmbientLight(0xffffff, darkMode ? 1.0 : 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, darkMode ? 1.2 : 1.5);
    keyLight.position.set(60, 80, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, darkMode ? 0.6 : 0.85);
    fillLight.position.set(-60, -40, -60);
    scene.add(fillLight);

    const cyanPoint = new THREE.PointLight(darkMode ? 0x00f0ff : 0x0284c7, 1.2, 220);
    cyanPoint.position.set(40, 50, 40);
    scene.add(cyanPoint);

    const purplePoint = new THREE.PointLight(darkMode ? 0xa855f7 : 0x7c3aed, 1.2, 220);
    purplePoint.position.set(-40, -40, -30);
    scene.add(purplePoint);

    // D. Architectural Floor Grid & Spatial Horizon (CAD Blueprint aesthetic)
    const gridHelper = new THREE.GridHelper(
      140,
      28,
      darkMode ? 0x00f0ff : 0x0284c7,
      darkMode ? 0x1e293b : 0xcbd5e1
    );
    gridHelper.position.set(0, -42, 0);
    if (gridHelper.material instanceof THREE.Material) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = darkMode ? 0.28 : 0.75;
    }
    scene.add(gridHelper);

    // E. Sci-Fi Starfield (Dark Mode only - keeps Light Mode clean and crisp)
    let starField: THREE.Points | null = null;
    if (darkMode) {
      const starCount = 350;
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 320;
        starPositions[i + 1] = (Math.random() - 0.5) * 320;
        starPositions[i + 2] = (Math.random() - 0.5) * 320;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 1.4,
        transparent: true,
        opacity: 0.45,
      });
      starField = new THREE.Points(starGeo, starMat);
      scene.add(starField);
    }

    // F. 3D Node Mesh Group (Centered mathematically around (0, 0, 0))
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(0, 0, 0);
    scene.add(nodeGroup);
    nodeMeshesRef.current.clear();

    const nodeCoords = new Map<string, THREE.Vector3>();
    const total = allNodes.length;
    const sphereRadius = 32;

    // Distribute nodes using Spherical Golden Spiral
    allNodes.forEach((node, idx) => {
      const phi = Math.acos(-1 + (2 * idx) / Math.max(1, total));
      const theta = Math.sqrt(total * Math.PI) * phi;
      const x = sphereRadius * Math.cos(theta) * Math.sin(phi);
      const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
      const z = sphereRadius * Math.cos(phi);
      const pos = new THREE.Vector3(x, y, z);
      nodeCoords.set(node.id, pos);
    });

    // Compute exact centroid and recenter all nodes to dead-center (0, 0, 0)
    const centroid = new THREE.Vector3(0, 0, 0);
    nodeCoords.forEach((p) => centroid.add(p));
    if (total > 0) centroid.divideScalar(total);
    nodeCoords.forEach((p) => p.sub(centroid));

    allNodes.forEach((node) => {
      const pos = nodeCoords.get(node.id) || new THREE.Vector3(0, 0, 0);
      const style = getNodeStyle(node, darkMode);
      const isFilteredOut = !filteredNodes.some((fn) => fn.id === node.id);

      // Node Geometry based on style.geo
      let geometry: THREE.BufferGeometry;
      switch (style.geo) {
        case "dodecahedron":
          geometry = new THREE.DodecahedronGeometry(style.radius);
          break;
        case "tetrahedron":
          geometry = new THREE.TetrahedronGeometry(style.radius);
          break;
        case "box":
          geometry = new THREE.BoxGeometry(style.radius * 1.1, style.radius * 1.1, style.radius * 1.1);
          break;
        case "octahedron":
          geometry = new THREE.OctahedronGeometry(style.radius);
          break;
        case "icosahedron":
          geometry = new THREE.IcosahedronGeometry(style.radius);
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(style.radius * 0.8, style.radius * 0.8, style.radius * 1.2, 16);
          break;
        case "sphere":
        default:
          geometry = new THREE.SphereGeometry(style.radius, 24, 24);
          break;
      }

      const material = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.color,
        emissiveIntensity: isFilteredOut ? 0.04 : darkMode ? 0.35 : 0.14,
        roughness: darkMode ? 0.25 : 0.35,
        metalness: darkMode ? 0.1 : 0.05,
        transparent: isFilteredOut,
        opacity: isFilteredOut ? 0.2 : 1.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData = { node, style };
      nodeGroup.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);

      // In Light Mode, add crisp wireframe contour for razor-sharp edge definition
      if (!darkMode && !isFilteredOut) {
        const contourMat = new THREE.MeshBasicMaterial({
          color: 0x0f172a,
          wireframe: true,
          transparent: true,
          opacity: 0.18,
        });
        const contourMesh = new THREE.Mesh(geometry, contourMat);
        contourMesh.scale.set(1.025, 1.025, 1.025);
        mesh.add(contourMesh);
      }

      // Pulsing Outer Alarm Sphere for Security Defect / Gaps
      if (style.halo && !isFilteredOut) {
        const alarmGeo = new THREE.SphereGeometry(style.radius * 1.55, 16, 16);
        const alarmMat = new THREE.MeshBasicMaterial({
          color: style.color,
          wireframe: true,
          transparent: true,
          opacity: darkMode ? 0.35 : 0.5,
        });
        const alarmMesh = new THREE.Mesh(alarmGeo, alarmMat);
        mesh.add(alarmMesh);
      }

      // Orbital Rings for Endpoints / APIs
      if (style.ring && !isFilteredOut) {
        const ringGeo = new THREE.TorusGeometry(style.radius * 1.45, 0.14, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: darkMode ? 0.45 : 0.65,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        mesh.add(ringMesh);
      }
    });

    // G. Edges & Dataflow Beams (Bold and crisp in both themes)
    const edgeGroup = new THREE.Group();
    edgeGroup.position.set(0, 0, 0);
    scene.add(edgeGroup);

    allEdges.forEach((edge) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (p1 && p2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const isDefectEdge =
          edge.color === 0xf43f5e ||
          edge.color === 0xdc2626 ||
          edge.color === 0xf97316 ||
          edge.color === 0xea580c;
        const defaultEdgeColor = darkMode ? 0x38bdf8 : 0x2563eb;
        const lineMat = new THREE.LineBasicMaterial({
          color: edge.color || defaultEdgeColor,
          transparent: true,
          opacity: isDefectEdge ? 0.85 : darkMode ? 0.35 : 0.65,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        edgeGroup.add(line);
      }
    });

    // H. Traveling Photon Energy Particles (Living Neural Network)
    const photonCount = Math.min(30, allEdges.length);
    const photonGeo = new THREE.SphereGeometry(darkMode ? 0.55 : 0.75, 8, 8);
    const photonMat = new THREE.MeshBasicMaterial({ color: darkMode ? 0x00f0ff : 0x1d4ed8 });
    const photons: Array<{ mesh: THREE.Mesh; p1: THREE.Vector3; p2: THREE.Vector3; progress: number; speed: number }> = [];

    allEdges.slice(0, photonCount).forEach((edge, i) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (p1 && p2) {
        const pMesh = new THREE.Mesh(photonGeo, photonMat);
        scene.add(pMesh);
        photons.push({
          mesh: pMesh,
          p1,
          p2,
          progress: i / photonCount,
          speed: 0.006 + Math.random() * 0.008,
        });
      }
    });

    // H. Mouse Interaction & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeGroup.children, true);

      if (intersects.length > 0) {
        // Find topmost mesh with userData.node
        let cur: THREE.Object3D | null = intersects[0].object;
        while (cur && !cur.userData?.node && cur.parent) {
          cur = cur.parent;
        }
        if (cur && cur.userData?.node) {
          setHoveredNode(cur.userData.node as GraphNode);
          container.style.cursor = "pointer";
          return;
        }
      }
      setHoveredNode(null);
      container.style.cursor = "grab";
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeGroup.children, true);
      if (intersects.length > 0) {
        let cur: THREE.Object3D | null = intersects[0].object;
        while (cur && !cur.userData?.node && cur.parent) {
          cur = cur.parent;
        }
        if (cur && cur.userData?.node) {
          const n = cur.userData.node as GraphNode;
          setSelectedNode(n);
          if (onSelectNode) onSelectNode(n.name);
          // Smooth focus target
          if (cur.position) {
            cameraTargetRef.current.copy(cur.position);
          }
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);

    // I. Orbit Drag Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
      container.style.cursor = "grabbing";
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      nodeGroup.rotation.y += deltaX * 0.006;
      nodeGroup.rotation.x += deltaY * 0.006;
      edgeGroup.rotation.y += deltaX * 0.006;
      edgeGroup.rotation.x += deltaY * 0.006;
    };

    const handleMouseUp = () => {
      isDragging = false;
      container.style.cursor = "grab";
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(30, Math.min(180, camera.position.z + e.deltaY * 0.08));
    };

    // Mobile & Tablet Touch Support (Orbit Drag & Pinch Zoom)
    let touchStartPos = { x: 0, y: 0 };
    let initialPinchDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - touchStartPos.x;
        const deltaY = e.touches[0].clientY - touchStartPos.y;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        nodeGroup.rotation.y += deltaX * 0.008;
        nodeGroup.rotation.x += deltaY * 0.008;
        edgeGroup.rotation.y += deltaX * 0.008;
        edgeGroup.rotation.x += deltaY * 0.008;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = (initialPinchDist - dist) * 0.15;
        camera.position.z = Math.max(30, Math.min(180, camera.position.z + factor));
        initialPinchDist = dist;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    // J. Render Loop
    let animId: number;
    let clock = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.02;

      // Auto rotation
      if (autoRotate && !isDragging) {
        nodeGroup.rotation.y += 0.0022;
        edgeGroup.rotation.y += 0.0022;
        if (starField) starField.rotation.y += 0.0006;
      }

      // Animate child meshes (halo rotation & breathing pulse)
      nodeGroup.children.forEach((mesh) => {
        mesh.children.forEach((child) => {
          child.rotation.y += 0.015;
          child.rotation.x += 0.01;
        });
      });

      // Animate traveling photons
      photons.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1.0) p.progress = 0;
        p.mesh.position.lerpVectors(p.p1, p.p2, p.progress);
        // Apply group rotation to photon positions
        p.mesh.position.applyEuler(nodeGroup.rotation);
      });

      renderer.render(scene, camera);
    };
    animate();

    // K. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", handleResize);
      photons.forEach((p) => scene.remove(p.mesh));
      renderer.dispose();
    };
  }, [allNodes, allEdges, filteredNodes, autoRotate, darkMode]);

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 126);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(30, cameraRef.current.position.z - 15);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(180, cameraRef.current.position.z + 15);
    }
  };

  const selectedStyle = selectedNode ? getNodeStyle(selectedNode) : null;
  const hoveredStyle = hoveredNode ? getNodeStyle(hoveredNode) : null;

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "24px",
        overflow: "hidden",
        border: darkMode ? "1px solid rgba(56, 189, 248, 0.22)" : "1px solid #cbd5e1",
        background: darkMode
          ? "radial-gradient(circle at 50% 50%, #0d1838 0%, #050914 100%)"
          : "radial-gradient(circle at 50% 45%, #ffffff 0%, #f1f5f9 65%, #e2e8f0 100%)",
        boxShadow: darkMode
          ? "0 20px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
          : "0 10px 30px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Dedicated Top Header Bar (Never Overlaps 3D Canvas) ────────────── */}
      <div
        style={{
          padding: "12px 18px",
          background: darkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
          backdropFilter: "blur(16px)",
          borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Title Pill */}
          <div
            style={{
              background: darkMode ? "rgba(255, 255, 255, 0.04)" : "#f8fafc",
              border: darkMode ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid #cbd5e1",
              padding: "6px 12px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Globe2 size={15} color={darkMode ? "#00f0ff" : "#0284c7"} />
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: darkMode ? "#f8fafc" : "#0f172a" }}>
              3D Graph Architecture
            </span>
            <span
              style={{
                fontSize: "10.5px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(0, 240, 255, 0.15)" : "rgba(2, 132, 199, 0.12)",
                color: darkMode ? "#00f0ff" : "#0284c7",
                fontWeight: 700,
              }}
            >
              {nodes && nodes.length > 0
                ? `Actual ERCG Data (${filteredNodes.length} Nodes)`
                : `Illustrative Preview (${filteredNodes.length} Nodes)`}
            </span>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All", count: categoryCounts.all, color: darkMode ? "#38bdf8" : "#0284c7" },
              { id: "security", label: "Defects & Gaps", count: categoryCounts.security, color: darkMode ? "#f43f5e" : "#dc2626" },
              { id: "endpoint", label: "Endpoints", count: categoryCounts.endpoint, color: darkMode ? "#00f0ff" : "#0284c7" },
              { id: "model", label: "Models", count: categoryCounts.model, color: darkMode ? "#10b981" : "#059669" },
              { id: "function", label: "Functions", count: categoryCounts.function, color: darkMode ? "#a855f7" : "#7c3aed" },
              { id: "config", label: "Config", count: categoryCounts.config, color: darkMode ? "#f59e0b" : "#d97706" },
            ].map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    background: active ? `${cat.color}25` : darkMode ? "rgba(255,255,255,0.04)" : "#f1f5f9",
                    border: active ? `1.5px solid ${cat.color}` : "1px solid transparent",
                    color: active ? cat.color : darkMode ? "#94a3b8" : "#475569",
                    padding: "5px 11px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    fontWeight: active ? 700 : 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cat.color }} />
                  {cat.label} ({cat.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orbit, Zoom & Reset Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: autoRotate
                ? darkMode
                  ? "rgba(56, 189, 248, 0.2)"
                  : "rgba(2, 132, 199, 0.15)"
                : darkMode
                  ? "rgba(255, 255, 255, 0.05)"
                  : "#f1f5f9",
              border: darkMode ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid #cbd5e1",
              color: darkMode ? "#f8fafc" : "#0f172a",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11.5px",
              fontWeight: 600,
            }}
          >
            {autoRotate ? (
              <Pause size={13} color={darkMode ? "#00f0ff" : "#0284c7"} />
            ) : (
              <Play size={13} color={darkMode ? "#00f0ff" : "#0284c7"} />
            )}
            {autoRotate ? "Pause Orbit" : "Resume Orbit"}
          </button>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#0f172a",
              borderRadius: "8px",
              padding: "6px 9px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#0f172a",
              borderRadius: "8px",
              padding: "6px 9px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ZoomOut size={14} />
          </button>

          <button
            onClick={handleResetCamera}
            title="Reset View"
            style={{
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#0f172a",
              borderRadius: "8px",
              padding: "6px 11px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11.5px",
              fontWeight: 600,
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* ── Unobstructed 3D WebGL Viewport ─────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(420px, 58vh, 580px)",
          touchAction: "none",
          backgroundImage: !darkMode
            ? "radial-gradient(circle, rgba(2, 132, 199, 0.08) 1.2px, transparent 1.2px)"
            : undefined,
          backgroundSize: !darkMode ? "28px 28px" : undefined,
        }}
      >
        <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

        {/* Hovered Node Tooltip HUD */}
        {hoveredNode && !selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              right: "20px",
              background: darkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(18px)",
              border: `1.5px solid ${hoveredStyle?.hex || "#38bdf8"}`,
              borderRadius: "14px",
              padding: "14px 18px",
              maxWidth: "340px",
              boxShadow: `0 12px 36px ${hoveredStyle?.hex || "#38bdf8"}33`,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  fontSize: "10.5px",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: `${hoveredStyle?.hex || "#38bdf8"}22`,
                  color: hoveredStyle?.hex || "#38bdf8",
                  border: `1px solid ${hoveredStyle?.hex || "#38bdf8"}55`,
                }}
              >
                {hoveredStyle?.label}
              </span>
              <span style={{ fontSize: "11px", color: darkMode ? "#94a3b8" : "#64748b" }}>Click node to inspect</span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: darkMode ? "#f8fafc" : "#0f172a", marginBottom: "4px" }}>
              {hoveredNode.name}
            </div>
            {hoveredNode.file && (
              <div style={{ fontSize: "12px", color: darkMode ? "#94a3b8" : "#475569", fontFamily: "JetBrains Mono, monospace" }}>
                {hoveredNode.file} {hoveredNode.line ? `:${hoveredNode.line}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              right: "20px",
              background: darkMode ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.97)",
              backdropFilter: "blur(20px)",
              border: `1.5px solid ${selectedStyle?.hex || "#38bdf8"}`,
              borderRadius: "16px",
              padding: "18px 20px",
              width: "360px",
              boxShadow: `0 16px 44px ${selectedStyle?.hex || "#38bdf8"}44`,
              zIndex: 15,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "10.5px",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    padding: "3px 9px",
                    borderRadius: "9999px",
                    background: `${selectedStyle?.hex || "#38bdf8"}25`,
                    color: selectedStyle?.hex || "#38bdf8",
                    border: `1px solid ${selectedStyle?.hex || "#38bdf8"}66`,
                  }}
                >
                  {selectedStyle?.label}
                </span>
                {selectedNode.finding && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(244, 63, 94, 0.2)",
                      color: "#f43f5e",
                    }}
                  >
                    {selectedNode.finding.severity.toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  cursor: "pointer",
                  padding: "2px",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: "15px", fontWeight: 700, color: darkMode ? "#f8fafc" : "#0f172a", marginBottom: "6px" }}>
              {selectedNode.name}
            </div>

            {selectedNode.file && (
              <div
                style={{
                  fontSize: "12px",
                  color: darkMode ? "#94a3b8" : "#475569",
                  fontFamily: "JetBrains Mono, monospace",
                  marginBottom: "12px",
                  background: darkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
                  padding: "6px 10px",
                  borderRadius: "6px",
                }}
              >
                📄 {selectedNode.file} {selectedNode.line ? `:${selectedNode.line}` : ""}
              </div>
            )}

            {selectedNode.finding && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "12px", color: darkMode ? "#cbd5e1" : "#334155", lineHeight: 1.45, marginBottom: "10px" }}>
                  {selectedNode.finding.technical_explanation || selectedNode.finding.title}
                </div>

                <button
                  onClick={() => setEvidenceFinding(selectedNode.finding || null)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "9px 14px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 100%)",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(244, 63, 94, 0.4)",
                  }}
                >
                  <FileCode size={14} />
                  <span>Inspect Source Evidence &amp; Fix</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dedicated Bottom Legend Bar (Never Overlaps 3D Canvas) ─────────── */}
      <div
        style={{
          padding: "10px 18px",
          background: darkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
          borderTop: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: darkMode ? "#00f0ff" : "#0284c7", display: "inline-block" }} />
            Route / API
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: darkMode ? "#10b981" : "#059669", display: "inline-block" }} />
            Database Model
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", transform: "rotate(45deg)", background: darkMode ? "#a855f7" : "#7c3aed", display: "inline-block" }} />
            Controller / Func
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: darkMode ? "#06b6d4" : "#0891b2", display: "inline-block" }} />
            Interface
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: darkMode ? "#f59e0b" : "#d97706", display: "inline-block" }} />
            Config
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: darkMode ? "#f43f5e" : "#dc2626", display: "inline-block" }} />
            Security Defect
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: darkMode ? "#94a3b8" : "#0f172a" }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: darkMode ? "#f97316" : "#ea580c", display: "inline-block" }} />
            Negative Gap
          </div>
        </div>

        <span style={{ fontSize: "11px", color: darkMode ? "#64748b" : "#94a3b8" }}>
          Drag to orbit · Scroll to zoom · Click any node to inspect
        </span>
      </div>

      {/* Source Code Evidence Modal */}
      {evidenceFinding && (
        <FindingEvidenceModal
          auditId={auditId || evidenceFinding.id}
          finding={evidenceFinding}
          onClose={() => setEvidenceFinding(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};
