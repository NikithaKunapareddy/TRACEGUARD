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

function getNodeStyle(node: GraphNode): NodeVisualMeta {
  const k = (node.kind || "").toLowerCase();
  const name = (node.name || "").toLowerCase();
  const file = (node.file || "").toLowerCase();

  // 1. Security Vulnerability / Defect (Rose Red)
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
      color: 0xf43f5e,
      hex: "#f43f5e",
      label: "Security Defect",
      category: "security",
      radius: 3.0,
      geo: "dodecahedron",
      halo: true,
    };
  }

  // 2. Negative-Space Gap / Missing Implementation (Neon Orange)
  if (
    node.finding?.category === "gap" ||
    k.includes("gap") ||
    k.includes("missing") ||
    k.includes("stub") ||
    name.includes("mock") ||
    name.includes("unimplemented")
  ) {
    return {
      color: 0xf97316,
      hex: "#f97316",
      label: "Negative-Space Gap",
      category: "gap",
      radius: 2.8,
      geo: "tetrahedron",
      halo: true,
    };
  }

  // 3. API Route / Endpoint (Electric Cyan)
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
      color: 0x00f0ff,
      hex: "#00f0ff",
      label: "API Endpoint",
      category: "endpoint",
      radius: 2.6,
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
      color: 0x10b981,
      hex: "#10b981",
      label: "DB Model / Entity",
      category: "model",
      radius: 2.6,
      geo: "box",
    };
  }

  // 5. Interface / Contract / Type (Bright Turquoise)
  if (k.includes("interface") || k.includes("type") || k.includes("contract")) {
    return {
      color: 0x06b6d4,
      hex: "#06b6d4",
      label: "Interface / Contract",
      category: "interface",
      radius: 2.4,
      geo: "icosahedron",
    };
  }

  // 6. Config / Environment (Cyber Amber Gold)
  if (k.includes("config") || k.includes("env") || file.includes(".env") || name.includes("config")) {
    return {
      color: 0xf59e0b,
      hex: "#f59e0b",
      label: "Config / Env",
      category: "config",
      radius: 2.3,
      geo: "cylinder",
    };
  }

  // 7. Function / Controller / Handler / Service (Vivid Violet)
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
      color: 0xa855f7,
      hex: "#a855f7",
      label: "Function / Controller",
      category: "function",
      radius: 2.3,
      geo: "octahedron",
    };
  }

  // 8. Module / Package / File (Indigo)
  if (k === "file" || k === "module" || k === "package") {
    return {
      color: 0x6366f1,
      hex: "#6366f1",
      label: "Module / File",
      category: "module",
      radius: 2.1,
      geo: "dodecahedron",
    };
  }

  // Default fallback (Cyan)
  return {
    color: 0x38bdf8,
    hex: "#38bdf8",
    label: "Component",
    category: "default",
    radius: 2.2,
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

    // A. Backend Symbols
    if (nodes && nodes.length > 0) {
      nodes.forEach((n) => {
        if (!seenIds.has(n.id)) {
          seenIds.add(n.id);
          list.push(n);
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
      const s = getNodeStyle(n);
      if (s.category === "security" || s.category === "gap") counts.security = (counts.security || 0) + 1;
      if (s.category === "endpoint") counts.endpoint = (counts.endpoint || 0) + 1;
      if (s.category === "model") counts.model = (counts.model || 0) + 1;
      if (s.category === "function") counts.function = (counts.function || 0) + 1;
      if (s.category === "config") counts.config = (counts.config || 0) + 1;
    });
    return counts;
  }, [allNodes]);

  // ─── 3. Three.js Scene Setup ────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    // A. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 25, 95);
    cameraRef.current = camera;

    // B. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // C. Dynamic Studio Lights - Balanced so all node pigments shine vibrantly
    const ambientLight = new THREE.AmbientLight(0xffffff, darkMode ? 1.0 : 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, darkMode ? 1.2 : 1.4);
    keyLight.position.set(60, 80, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, darkMode ? 0.6 : 0.8);
    fillLight.position.set(-60, -40, -60);
    scene.add(fillLight);

    const cyanPoint = new THREE.PointLight(0x00f0ff, 1.2, 220);
    cyanPoint.position.set(40, 50, 40);
    scene.add(cyanPoint);

    const purplePoint = new THREE.PointLight(0xa855f7, 1.2, 220);
    purplePoint.position.set(-40, -40, -30);
    scene.add(purplePoint);

    // D. Sci-Fi Starfield / High-Tech Grid Particle Cloud
    const starCount = darkMode ? 400 : 250;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 320;
      starPositions[i + 1] = (Math.random() - 0.5) * 320;
      starPositions[i + 2] = (Math.random() - 0.5) * 320;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: darkMode ? 0x38bdf8 : 0x0284c7,
      size: darkMode ? 1.4 : 1.1,
      transparent: true,
      opacity: darkMode ? 0.45 : 0.25,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // E. 3D Node Mesh Group
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);
    nodeMeshesRef.current.clear();

    const nodeCoords = new Map<string, THREE.Vector3>();
    const total = allNodes.length;
    const sphereRadius = 38;

    // Distribute nodes using Spherical Golden Spiral
    allNodes.forEach((node, idx) => {
      const phi = Math.acos(-1 + (2 * idx) / Math.max(1, total));
      const theta = Math.sqrt(total * Math.PI) * phi;
      const x = sphereRadius * Math.cos(theta) * Math.sin(phi);
      const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
      const z = sphereRadius * Math.cos(phi);
      const pos = new THREE.Vector3(x, y, z);
      nodeCoords.set(node.id, pos);

      const style = getNodeStyle(node);
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
        emissiveIntensity: isFilteredOut ? 0.05 : 0.35,
        roughness: 0.25,
        metalness: 0.1,
        transparent: isFilteredOut,
        opacity: isFilteredOut ? 0.2 : 1.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData = { node, style };
      nodeGroup.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);

      // Pulsing Outer Alarm Sphere for Security Defect / Gaps
      if (style.halo && !isFilteredOut) {
        const alarmGeo = new THREE.SphereGeometry(style.radius * 1.55, 16, 16);
        const alarmMat = new THREE.MeshBasicMaterial({
          color: style.color,
          wireframe: true,
          transparent: true,
          opacity: 0.35,
        });
        const alarmMesh = new THREE.Mesh(alarmGeo, alarmMat);
        mesh.add(alarmMesh);
      }

      // Orbital Rings for Endpoints / APIs
      if (style.ring && !isFilteredOut) {
        const ringGeo = new THREE.TorusGeometry(style.radius * 1.45, 0.12, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: 0.45,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        mesh.add(ringMesh);
      }
    });

    // F. Edges & Dataflow Beams
    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);

    allEdges.forEach((edge) => {
      const p1 = nodeCoords.get(edge.source);
      const p2 = nodeCoords.get(edge.target);
      if (p1 && p2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const isDefectEdge = edge.color === 0xf43f5e || edge.color === 0xf97316;
        const lineMat = new THREE.LineBasicMaterial({
          color: edge.color || 0x38bdf8,
          transparent: true,
          opacity: isDefectEdge ? 0.75 : 0.35,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        edgeGroup.add(line);
      }
    });

    // G. Traveling Photon Energy Particles (Living Neural Network)
    const photonCount = Math.min(30, allEdges.length);
    const photonGeo = new THREE.SphereGeometry(0.55, 8, 8);
    const photonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
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
          progress: (i / photonCount),
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

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

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
        starField.rotation.y += 0.0006;
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
      window.removeEventListener("resize", handleResize);
      photons.forEach((p) => scene.remove(p.mesh));
      renderer.dispose();
    };
  }, [allNodes, allEdges, filteredNodes, autoRotate, darkMode]);

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 25, 95);
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
        position: "relative",
        width: "100%",
        height: "580px",
        borderRadius: "18px",
        overflow: "hidden",
        border: darkMode ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid rgba(0, 0, 0, 0.12)",
        background: darkMode
          ? "radial-gradient(circle at center, #0b1329 0%, #030712 100%)"
          : "radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)",
        boxShadow: darkMode
          ? "0 20px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
          : "0 10px 30px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* ── Top HUD Controls & Category Filters ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "20px",
          right: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", pointerEvents: "auto" }}>
          {/* Title Pill */}
          <div
            style={{
              background: darkMode ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(14px)",
              border: darkMode ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(0, 0, 0, 0.12)",
              padding: "8px 14px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
            }}
          >
            <Globe2 size={16} color="#00f0ff" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: darkMode ? "#f8fafc" : "#0f172a" }}>
              ERCG 3D Consistency Map
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "rgba(0, 240, 255, 0.15)",
                color: "#00f0ff",
                fontWeight: 700,
              }}
            >
              {filteredNodes.length} Nodes
            </span>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(14px)",
              padding: "4px 8px",
              borderRadius: "10px",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            {[
              { id: "all", label: "All", count: categoryCounts.all, color: "#38bdf8" },
              { id: "security", label: "Defects & Gaps", count: categoryCounts.security, color: "#f43f5e" },
              { id: "endpoint", label: "Endpoints", count: categoryCounts.endpoint, color: "#00f0ff" },
              { id: "model", label: "Models", count: categoryCounts.model, color: "#10b981" },
              { id: "function", label: "Functions", count: categoryCounts.function, color: "#a855f7" },
              { id: "config", label: "Config", count: categoryCounts.config, color: "#f59e0b" },
            ].map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    background: active ? `${cat.color}25` : "transparent",
                    border: active ? `1.5px solid ${cat.color}` : "1px solid transparent",
                    color: active ? cat.color : darkMode ? "#94a3b8" : "#64748b",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    fontWeight: active ? 700 : 500,
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "auto" }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: autoRotate ? "rgba(56, 189, 248, 0.2)" : darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: darkMode ? "#f8fafc" : "#0f172a",
              borderRadius: "8px",
              padding: "7px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              backdropFilter: "blur(12px)",
            }}
          >
            {autoRotate ? <Pause size={13} color="#00f0ff" /> : <Play size={13} color="#00f0ff" />}
            {autoRotate ? "Pause Orbit" : "Resume Orbit"}
          </button>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              background: darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
              color: darkMode ? "#94a3b8" : "#475569",
              borderRadius: "8px",
              padding: "7px 9px",
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
              background: darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
              color: darkMode ? "#94a3b8" : "#475569",
              borderRadius: "8px",
              padding: "7px 9px",
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
              background: darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
              color: darkMode ? "#94a3b8" : "#475569",
              borderRadius: "8px",
              padding: "7px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* ── Multi-Color Legend Overlay ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "20px",
          display: "flex",
          gap: "14px",
          zIndex: 10,
          background: darkMode ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(14px)",
          padding: "8px 16px",
          borderRadius: "10px",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#00f0ff", display: "inline-block", boxShadow: "0 0 8px #00f0ff" }} />
          Route / API
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
          Database Model
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", transform: "rotate(45deg)", background: "#a855f7", display: "inline-block", boxShadow: "0 0 8px #a855f7" }} />
          Controller / Func
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#06b6d4", display: "inline-block" }} />
          Interface
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
          Config
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f43f5e", display: "inline-block", boxShadow: "0 0 10px #f43f5e" }} />
          Security Defect
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: darkMode ? "#94a3b8" : "#475569" }}>
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f97316", display: "inline-block", boxShadow: "0 0 8px #f97316" }} />
          Negative Gap
        </div>
      </div>

      {/* ── Hovered Node Tooltip HUD ─────────────────────────────────────────── */}
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

      {/* ── Selected Node Inspector Drawer ───────────────────────────────────── */}
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

      {/* ── Source Code Evidence Modal ───────────────────────────────────────── */}
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
