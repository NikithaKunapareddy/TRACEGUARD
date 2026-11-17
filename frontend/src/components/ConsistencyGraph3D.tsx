import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Finding } from "../api/client";
import { Eye, RotateCcw, Play, Pause, Layers, ShieldAlert, Globe2 } from "lucide-react";

export interface GraphNode {
  id: string;
  name: string;
  kind: string;
  file?: string;
  line?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
}

interface ConsistencyGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings?: Finding[];
  onSelectNode?: (nodeName: string) => void;
}

export const ConsistencyGraph3D: React.FC<ConsistencyGraph3DProps> = ({
  nodes,
  edges,
  findings = [],
  onSelectNode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Build synthetic graph if backend returns empty
  const effectiveNodes: GraphNode[] = React.useMemo(() => {
    if (nodes && nodes.length > 0) return nodes;
    
    // Synthesize visual nodes from findings if graph was minimal
    const list: GraphNode[] = [
      { id: "root_api", name: "FastAPI Gateway", kind: "endpoint", file: "main.py", line: 1 },
      { id: "auth_guard", name: "Security Gatekeeper", kind: "controller", file: "auth.py", line: 10 },
      { id: "data_access", name: "Repository Storage", kind: "model", file: "models.py", line: 25 },
    ];
    findings.forEach((f, idx) => {
      list.push({
        id: `finding_${idx}`,
        name: f.title.slice(0, 32),
        kind: f.category === "security" ? "vulnerability" : "gap",
        file: f.affected_file,
        line: f.line_number,
      });
    });
    return list;
  }, [nodes, findings]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 20, 85);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x38bdf8, 2, 200);
    pointLight1.position.set(40, 50, 40);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 2, 200);
    pointLight2.position.set(-40, -40, -30);
    scene.add(pointLight2);

    // 4. Background Starfield / Particle Cloud
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 300;
      starPositions[i + 1] = (Math.random() - 0.5) * 300;
      starPositions[i + 2] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.35,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Node Meshes Layout (Spherical & Spiral Layout)
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);
    nodeMeshesRef.current.clear();

    const nodeCoords = new Map<string, THREE.Vector3>();
    const total = effectiveNodes.length;
    const radius = 35;

    effectiveNodes.forEach((node, idx) => {
      // Golden Spiral Spherical coordinates
      const phi = Math.acos(-1 + (2 * idx) / Math.max(1, total));
      const theta = Math.sqrt(total * Math.PI) * phi;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      const pos = new THREE.Vector3(x, y, z);
      nodeCoords.set(node.id, pos);

      // Node Geometry based on kind
      let geometry: THREE.BufferGeometry;
      let color = 0x38bdf8; // Cyan default

      const k = (node.kind || "").toLowerCase();
      if (k.includes("vuln") || k.includes("sec") || k.includes("finding")) {
        geometry = new THREE.DodecahedronGeometry(2.4);
        color = 0xf43f5e; // Rose red
      } else if (k.includes("endpoint") || k.includes("route")) {
        geometry = new THREE.SphereGeometry(2.2, 16, 16);
        color = 0x38bdf8; // Cyan
      } else if (k.includes("model") || k.includes("database")) {
        geometry = new THREE.BoxGeometry(2.6, 2.6, 2.6);
        color = 0x10b981; // Emerald
      } else if (k.includes("gap")) {
        geometry = new THREE.TetrahedronGeometry(2.2);
        color = 0xa855f7; // Purple
      } else {
        geometry = new THREE.OctahedronGeometry(2.0);
        color = 0x818cf8; // Indigo
      }

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData = { node };
      nodeGroup.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);

      // Add a subtle outer glow halo for high-risk nodes
      if (color === 0xf43f5e) {
        const haloGeo = new THREE.SphereGeometry(3.6, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          wireframe: true,
          transparent: true,
          opacity: 0.25,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        mesh.add(halo);
      }
    });

    // 6. Edges / Dataflow lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.45,
    });

    if (edges && edges.length > 0) {
      edges.slice(0, 150).forEach((edge) => {
        const p1 = nodeCoords.get(edge.source);
        const p2 = nodeCoords.get(edge.target);
        if (p1 && p2) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const line = new THREE.Line(lineGeo, lineMat);
          scene.add(line);
        }
      });
    } else {
      // Connect nearby nodes to form a cohesive network visualization
      const keys = Array.from(nodeCoords.keys());
      for (let i = 0; i < keys.length; i++) {
        const next = keys[(i + 1) % keys.length];
        const p1 = nodeCoords.get(keys[i])!;
        const p2 = nodeCoords.get(next)!;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
      }
    }

    // 7. Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeGroup.children);

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node as GraphNode;
        setHoveredNode(node);
        container.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        container.style.cursor = "grab";
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeGroup.children);
      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node as GraphNode;
        setSelectedNode(node);
        if (onSelectNode) onSelectNode(node.name);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);

    // 8. Orbit Drag & Zoom handling
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

    // 9. Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotate && !isDragging) {
        nodeGroup.rotation.y += 0.0025;
        starField.rotation.y += 0.0006;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize observer
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
      renderer.dispose();
    };
  }, [effectiveNodes, edges, autoRotate]);

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 20, 85);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "540px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        background: "radial-gradient(circle at center, #0b1329 0%, #030712 100%)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
      }}
    >
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* Floating HUD Controls Overlay */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "8px 14px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Globe2 size={16} color="#38bdf8" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>
            ERCG 3D Consistency Map
          </span>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "9999px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              fontWeight: 700,
            }}
          >
            {effectiveNodes.length} Nodes
          </span>
        </div>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            background: autoRotate ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            color: "#f8fafc",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 500,
            backdropFilter: "blur(12px)",
          }}
        >
          {autoRotate ? <Pause size={14} color="#38bdf8" /> : <Play size={14} color="#38bdf8" />}
          {autoRotate ? "Pause Orbit" : "Resume Orbit"}
        </button>

        <button
          onClick={handleResetCamera}
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#94a3b8",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            backdropFilter: "blur(12px)",
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Legend Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "20px",
          display: "flex",
          gap: "12px",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          padding: "8px 14px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
          Route / API
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
          Controller
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          Database / Model
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", display: "inline-block" }} />
          Security Defect
        </div>
      </div>

      {/* Hovered Node Tooltip */}
      {hoveredNode && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "20px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "12px",
            padding: "14px 18px",
            maxWidth: "320px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                background:
                  hoveredNode.kind.includes("sec") || hoveredNode.kind.includes("vuln")
                    ? "rgba(244, 63, 94, 0.2)"
                    : "rgba(56, 189, 248, 0.2)",
                color:
                  hoveredNode.kind.includes("sec") || hoveredNode.kind.includes("vuln")
                    ? "#f43f5e"
                    : "#38bdf8",
              }}
            >
              {hoveredNode.kind}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Click to focus</span>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>
            {hoveredNode.name}
          </div>
          {hoveredNode.file && (
            <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>
              {hoveredNode.file} {hoveredNode.line ? `:${hoveredNode.line}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
