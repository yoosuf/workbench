import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Table as TableIcon,
  Key,
  Link2,
  ChevronDown,
  ChevronUp,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitFork,
  Boxes,
  FolderTree,
  MousePointer,
  FolderPlus,
  Layers,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import dagre from 'dagre';
import { RelationshipKind } from './AddRelationshipModal';

export interface DiagramColumnData {
  name: string;
  nativeType: string;
  dataKind: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface TableNodeItem {
  id: string;
  tableName: string;
  schema: string;
  positionX: number;
  positionY: number;
  columns: DiagramColumnData[];
}

export interface DiagramEdgeItem {
  id: string;
  source: string;
  target: string;
  sourceColumn: string;
  targetColumn: string;
  relationName?: string;
  cardinality?: RelationshipKind;
}

export interface DiagramContainerItem {
  id: string;
  title: string;
  color: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

export type WorkbenchToolMode =
  | 'SELECT'
  | 'REL_1_N'
  | 'REL_IDENTIFYING'
  | 'REL_1_1'
  | 'REL_N_M'
  | 'ADD_CONTAINER';

interface InteractiveDiagramCanvasProps {
  nodes: TableNodeItem[];
  edges: DiagramEdgeItem[];
  containers?: DiagramContainerItem[];
  onNodesChange?: (updatedNodes: TableNodeItem[]) => void;
  onContainersChange?: (updatedContainers: DiagramContainerItem[]) => void;
  onAddColumn?: (tableName: string) => void;
  onConnectRelationship?: (
    sourceTable: string,
    targetTable: string,
    kind: RelationshipKind,
  ) => void;
}

const TABLE_WIDTH = 260;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 28;

const CONTAINER_COLORS = [
  { name: 'Sky Blue', border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.05)' },
  { name: 'Emerald', border: '#3fb950', bg: 'rgba(63, 185, 80, 0.05)' },
  { name: 'Purple', border: '#bc8cff', bg: 'rgba(188, 140, 255, 0.05)' },
  { name: 'Amber', border: '#d29922', bg: 'rgba(210, 153, 34, 0.05)' },
  { name: 'Coral', border: '#f85149', bg: 'rgba(248, 81, 73, 0.05)' },
];

export const InteractiveDiagramCanvas: React.FC<InteractiveDiagramCanvasProps> = ({
  nodes,
  edges,
  containers: initialContainers = [],
  onNodesChange,
  onContainersChange,
  onAddColumn,
  onConnectRelationship,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Workbench Tool Mode
  const [activeTool, setActiveTool] = useState<WorkbenchToolMode>('SELECT');
  const [connectingSourceTable, setConnectingSourceTable] = useState<string | null>(null);

  // Viewport transformation state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Nodes & Containers State
  const [localNodes, setLocalNodes] = useState<TableNodeItem[]>(nodes);
  const [localContainers, setLocalContainers] = useState<DiagramContainerItem[]>(initialContainers);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggingContainerId, setDraggingContainerId] = useState<string | null>(null);
  const [resizingContainerId, setResizingContainerId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [collapsedTables, setCollapsedTables] = useState<Record<string, boolean>>({});
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Container Title Edit
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
  const [editingContainerTitle, setEditingContainerTitle] = useState('');

  // Sync external nodes
  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  // Sync external containers
  useEffect(() => {
    if (initialContainers) setLocalContainers(initialContainers);
  }, [initialContainers]);

  // Toggle Table Collapse
  const toggleCollapse = (tableId: string) => {
    setCollapsedTables((prev) => ({
      ...prev,
      [tableId]: !prev[tableId],
    }));
  };

  // Node position map for fast edge endpoint lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, TableNodeItem>();
    for (const node of localNodes) {
      map.set(node.id, node);
      map.set(node.tableName, node);
    }
    return map;
  }, [localNodes]);

  // Active highlighted tables & columns based on selected / hovered edge
  const activeEdge = useMemo(() => {
    const targetId = hoveredEdgeId || selectedEdgeId;
    return edges.find((e) => e.id === targetId) || null;
  }, [edges, hoveredEdgeId, selectedEdgeId]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 80, y: 80 });
  };

  // Fit all nodes into view
  const handleFitView = useCallback(() => {
    if (localNodes.length === 0 || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of localNodes) {
      const colCount = collapsedTables[node.id] ? 0 : node.columns.length;
      const height = HEADER_HEIGHT + colCount * ROW_HEIGHT;
      minX = Math.min(minX, node.positionX);
      minY = Math.min(minY, node.positionY);
      maxX = Math.max(maxX, node.positionX + TABLE_WIDTH);
      maxY = Math.max(maxY, node.positionY + height);
    }

    for (const box of localContainers) {
      minX = Math.min(minX, box.positionX);
      minY = Math.min(minY, box.positionY);
      maxX = Math.max(maxX, box.positionX + box.width);
      maxY = Math.max(maxY, box.positionY + box.height);
    }

    const contentWidth = Math.max(200, maxX - minX + 160);
    const contentHeight = Math.max(200, maxY - minY + 160);

    const scaleX = container.width / contentWidth;
    const scaleY = container.height / contentHeight;
    const newZoom = Math.min(1.5, Math.max(0.3, Math.min(scaleX, scaleY)));

    setZoom(+newZoom.toFixed(2));
    setPan({
      x: (container.width - (maxX + minX) * newZoom) / 2,
      y: (container.height - (maxY + minY) * newZoom) / 2,
    });
  }, [localNodes, localContainers, collapsedTables]);

  // Auto-fit on initial node population
  const hasFittedRef = useRef<boolean>(false);
  useEffect(() => {
    if (localNodes.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      const t = setTimeout(() => {
        handleFitView();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [localNodes.length, handleFitView]);

  // Auto Layout with Dagre
  const handleAutoLayout = () => {
    if (localNodes.length === 0) return;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 140 });
    g.setDefaultEdgeLabel(() => ({}));

    localNodes.forEach((node) => {
      const colCount = collapsedTables[node.id] ? 0 : node.columns.length;
      const height = HEADER_HEIGHT + colCount * ROW_HEIGHT;
      g.setNode(node.id, { width: TABLE_WIDTH, height });
    });

    edges.forEach((edge) => {
      const sNode = nodeMap.get(edge.source);
      const tNode = nodeMap.get(edge.target);
      if (sNode && tNode) {
        g.setEdge(sNode.id, tNode.id);
      }
    });

    dagre.layout(g);

    const layoutedNodes = localNodes.map((node) => {
      const nodePos = g.node(node.id);
      return {
        ...node,
        positionX: nodePos ? Math.round(nodePos.x - TABLE_WIDTH / 2) : node.positionX,
        positionY: nodePos
          ? Math.round(
              nodePos.y -
                (HEADER_HEIGHT + (collapsedTables[node.id] ? 0 : node.columns.length * ROW_HEIGHT)) /
                  2,
            )
          : node.positionY,
      };
    });

    setLocalNodes(layoutedNodes);
    onNodesChange?.(layoutedNodes);
  };

  // Add Container Layer
  const handleAddContainer = (clickCanvasX: number, clickCanvasY: number) => {
    const colorTheme = CONTAINER_COLORS[localContainers.length % CONTAINER_COLORS.length];
    const newContainer: DiagramContainerItem = {
      id: `container_${Date.now()}`,
      title: `Container Layer ${localContainers.length + 1}`,
      color: colorTheme.border,
      positionX: Math.round(clickCanvasX - 200),
      positionY: Math.round(clickCanvasY - 150),
      width: 400,
      height: 300,
    };
    const updated = [...localContainers, newContainer];
    setLocalContainers(updated);
    onContainersChange?.(updated);
    setActiveTool('SELECT');
  };

  // Delete Container Layer
  const handleDeleteContainer = (id: string) => {
    const updated = localContainers.filter((c) => c.id !== id);
    setLocalContainers(updated);
    onContainersChange?.(updated);
  };

  // Canvas Mouse Down (Panning or Add Container)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.table-card')) return;
    if ((e.target as HTMLElement).closest('.container-box-header')) return;
    if ((e.target as HTMLElement).closest('.container-resize-handle')) return;

    if (activeTool === 'ADD_CONTAINER') {
      const mouseCanvasX = (e.clientX - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - pan.y) / zoom;
      handleAddContainer(mouseCanvasX, mouseCanvasY);
      return;
    }

    if (activeTool !== 'SELECT') {
      setConnectingSourceTable(null);
      return;
    }

    setSelectedEdgeId(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Canvas Mouse Move (Panning / Dragging Node / Dragging Container)
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const mouseCanvasX = (e.clientX - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - pan.y) / zoom;

    if (draggingNodeId) {
      const newX = Math.round(mouseCanvasX - dragOffset.x);
      const newY = Math.round(mouseCanvasY - dragOffset.y);

      setLocalNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, positionX: newX, positionY: newY } : n)),
      );
    } else if (draggingContainerId) {
      const newX = Math.round(mouseCanvasX - dragOffset.x);
      const newY = Math.round(mouseCanvasY - dragOffset.y);

      setLocalContainers((prev) =>
        prev.map((c) => (c.id === draggingContainerId ? { ...c, positionX: newX, positionY: newY } : c)),
      );
    } else if (resizingContainerId) {
      setLocalContainers((prev) =>
        prev.map((c) => {
          if (c.id !== resizingContainerId) return c;
          const newW = Math.max(200, Math.round(mouseCanvasX - c.positionX));
          const newH = Math.max(150, Math.round(mouseCanvasY - c.positionY));
          return { ...c, width: newW, height: newH };
        }),
      );
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (draggingNodeId) {
      setDraggingNodeId(null);
      onNodesChange?.(localNodes);
    }
    if (draggingContainerId) {
      setDraggingContainerId(null);
      onContainersChange?.(localContainers);
    }
    if (resizingContainerId) {
      setResizingContainerId(null);
      onContainersChange?.(localContainers);
    }
  };

  // Canvas Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.2, +(z * zoomFactor).toFixed(2))));
  };

  // Start Node Dragging or Relationship Selection
  const handleTableCardClick = (e: React.MouseEvent, node: TableNodeItem) => {
    if (activeTool === 'SELECT') {
      e.stopPropagation();
      setDraggingNodeId(node.id);
      const mouseCanvasX = (e.clientX - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - pan.y) / zoom;
      setDragOffset({
        x: mouseCanvasX - node.positionX,
        y: mouseCanvasY - node.positionY,
      });
      return;
    }

    // Relationship drawing tools
    e.stopPropagation();
    if (!connectingSourceTable) {
      setConnectingSourceTable(node.tableName);
    } else {
      const source = connectingSourceTable;
      const target = node.tableName;
      setConnectingSourceTable(null);

      let kind: RelationshipKind = 'ONE_TO_MANY';
      if (activeTool === 'REL_1_1') kind = 'ONE_TO_ONE';
      else if (activeTool === 'REL_IDENTIFYING') kind = 'IDENTIFYING_CONTAINER';
      else if (activeTool === 'REL_N_M') kind = 'MANY_TO_MANY';

      onConnectRelationship?.(source, target, kind);
      setActiveTool('SELECT');
    }
  };

  // Compute Professional Workbench Orthogonal & Bezier Curved Connectors
  const renderedEdges = useMemo(() => {
    return edges.map((edge) => {
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);

      if (!srcNode || !tgtNode) return null;

      const srcColIdx = srcNode.columns.findIndex((c) => c.name === edge.sourceColumn);
      const tgtColIdx = tgtNode.columns.findIndex((c) => c.name === edge.targetColumn);

      const srcIsCollapsed = collapsedTables[srcNode.id];
      const tgtIsCollapsed = collapsedTables[tgtNode.id];

      // Calculate table centers for smart horizontal port docking
      const srcCenterX = srcNode.positionX + TABLE_WIDTH / 2;
      const tgtCenterX = tgtNode.positionX + TABLE_WIDTH / 2;
      const isTargetToRight = tgtCenterX >= srcCenterX;

      // Source Port (Child table FK)
      const startX = isTargetToRight ? srcNode.positionX + TABLE_WIDTH : srcNode.positionX;
      const startY = srcIsCollapsed
        ? srcNode.positionY + HEADER_HEIGHT / 2
        : srcNode.positionY +
          HEADER_HEIGHT +
          (srcColIdx >= 0 ? srcColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : ROW_HEIGHT / 2);

      // Target Port (Parent table PK)
      const endX = isTargetToRight ? tgtNode.positionX : tgtNode.positionX + TABLE_WIDTH;
      const endY = tgtIsCollapsed
        ? tgtNode.positionY + HEADER_HEIGHT / 2
        : tgtNode.positionY +
          HEADER_HEIGHT +
          (tgtColIdx >= 0 ? tgtColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 : ROW_HEIGHT / 2);

      // Smart Curvature & Tangent Routing
      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);

      let cp1X: number;
      const cp1Y = startY;
      let cp2X: number;
      const cp2Y = endY;

      if (isTargetToRight && endX >= startX + 40) {
        // Direct clean horizontal S-curve
        const curvature = Math.max(40, dx * 0.45);
        cp1X = startX + curvature;
        cp2X = endX - curvature;
      } else if (!isTargetToRight && endX <= startX - 40) {
        // Direct clean leftward S-curve
        const curvature = Math.max(40, dx * 0.45);
        cp1X = startX - curvature;
        cp2X = endX + curvature;
      } else {
        // Loop-around curve when tables are vertically stacked or overlapping
        const loopOffset = Math.max(60, dy * 0.35 + 40);
        if (isTargetToRight) {
          cp1X = startX + loopOffset;
          cp2X = endX - loopOffset;
        } else {
          cp1X = startX - loopOffset;
          cp2X = endX + loopOffset;
        }
      }

      const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      const isSelected = selectedEdgeId === edge.id;
      const isHovered = hoveredEdgeId === edge.id;
      const isIdentifying = edge.cardinality === 'IDENTIFYING_CONTAINER';
      const isOneToOne = edge.cardinality === 'ONE_TO_ONE';
      const isManyToMany = edge.cardinality === 'MANY_TO_MANY';

      // Theme Colors
      const strokeColor = isSelected
        ? '#58a6ff'
        : isHovered
        ? '#38bdf8'
        : isIdentifying
        ? '#3fb950'
        : isOneToOne
        ? '#bc8cff'
        : isManyToMany
        ? '#d29922'
        : '#38bdf8';

      return (
        <g
          key={edge.id}
          onMouseEnter={() => setHoveredEdgeId(edge.id)}
          onMouseLeave={() => setHoveredEdgeId(null)}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEdgeId(edge.id);
          }}
          className="diagram-edge group cursor-pointer"
        >
          {/* Thick invisible hit area for easy mouse interactions */}
          <path
            d={pathData}
            fill="none"
            stroke="transparent"
            strokeWidth={18}
            className="pointer-events-auto"
          />

          {/* Outer Neon Glow / Selection Halo */}
          {(isSelected || isHovered) && (
            <path
              d={pathData}
              fill="none"
              stroke={strokeColor}
              strokeWidth={7}
              strokeOpacity={isSelected ? 0.35 : 0.2}
              strokeLinecap="round"
            />
          )}

          {/* Main Connector Wire */}
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isIdentifying || isSelected ? 2.5 : 2}
            strokeDasharray={isIdentifying || isOneToOne ? 'none' : '5 4'}
            strokeLinecap="round"
            className="transition-all duration-150"
          />

          {/* Source Port Docking Pin */}
          <circle
            cx={startX}
            cy={startY}
            r={isSelected ? 4.5 : 3.5}
            fill={strokeColor}
            stroke="#0d1117"
            strokeWidth={1.5}
            className="shadow-md"
          />

          {/* Target Port Docking Pin */}
          <circle
            cx={endX}
            cy={endY}
            r={isSelected ? 4.5 : 3.5}
            fill={strokeColor}
            stroke="#0d1117"
            strokeWidth={1.5}
            className="shadow-md"
          />

          {/* Floating Relationship Pill Badge */}
          <g
            transform={`translate(${midX}, ${midY})`}
            className="pointer-events-auto transition-transform group-hover:scale-105"
          >
            <rect
              x="-68"
              y="-13"
              width="136"
              height="26"
              rx="13"
              fill="#161b22"
              stroke={strokeColor}
              strokeWidth={isSelected || isHovered ? 1.8 : 1}
              className="shadow-2xl"
            />

            {/* Cardinality Icon Badge */}
            <g transform="translate(-56, -6)">
              {isIdentifying ? (
                <FolderTree className="w-3 h-3 text-[#3fb950]" />
              ) : isOneToOne ? (
                <Link2 className="w-3 h-3 text-[#bc8cff]" />
              ) : isManyToMany ? (
                <Boxes className="w-3 h-3 text-[#d29922]" />
              ) : (
                <GitFork className="w-3 h-3 text-[#38bdf8]" />
              )}
            </g>

            {/* Column Mapping Text */}
            <text
              textAnchor="middle"
              x="6"
              y="3.5"
              fill={isSelected || isHovered ? '#ffffff' : '#c9d1d9'}
              fontSize="10"
              fontFamily="monospace"
              fontWeight={isSelected ? 'bold' : '500'}
            >
              {edge.sourceColumn}
              <tspan fill={strokeColor} fontWeight="bold">
                {isOneToOne ? ' 1:1 ' : isIdentifying ? ' ⫰ ' : ' 1:N '}
              </tspan>
              {edge.targetColumn}
            </text>
          </g>
        </g>
      );
    });
  }, [edges, nodeMap, collapsedTables, selectedEdgeId, hoveredEdgeId]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
      className={`w-full h-full relative overflow-hidden bg-[#0d1117] select-none ${
        activeTool !== 'SELECT'
          ? 'cursor-crosshair'
          : isPanning
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      {/* Background Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="diagram-grid"
            width={24 * zoom}
            height={24 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (24 * zoom)}, ${pan.y % (24 * zoom)})`}
          >
            <circle cx="1" cy="1" r="1" fill="#30363d" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagram-grid)" />
      </svg>

      {/* Viewport Layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* Visual Schema Containers / Layers */}
        {localContainers.map((box) => {
          const isEditing = editingContainerId === box.id;

          return (
            <div
              key={box.id}
              style={{
                position: 'absolute',
                left: `${box.positionX}px`,
                top: `${box.positionY}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                borderColor: box.color,
                backgroundColor: `${box.color}08`,
              }}
              className="rounded-2xl border-2 border-dashed pointer-events-auto flex flex-col justify-between group/container transition-colors shadow-sm"
            >
              {/* Container Header Bar */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingContainerId(box.id);
                  const mouseCanvasX = (e.clientX - pan.x) / zoom;
                  const mouseCanvasY = (e.clientY - pan.y) / zoom;
                  setDragOffset({
                    x: mouseCanvasX - box.positionX,
                    y: mouseCanvasY - box.positionY,
                  });
                }}
                className="container-box-header px-3.5 py-2 flex items-center justify-between bg-[#161b22]/90 backdrop-blur-sm rounded-t-xl border-b border-[#30363d] cursor-move select-none"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5" style={{ color: box.color }} />
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={editingContainerTitle}
                        onChange={(e) => setEditingContainerTitle(e.target.value)}
                        className="bg-[#0d1117] border border-[#58a6ff] rounded px-1.5 py-0.5 text-xs text-white font-semibold focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const updated = localContainers.map((c) =>
                            c.id === box.id ? { ...c, title: editingContainerTitle.trim() || c.title } : c,
                          );
                          setLocalContainers(updated);
                          onContainersChange?.(updated);
                          setEditingContainerId(null);
                        }}
                        className="p-1 rounded text-[#3fb950] hover:bg-[#21262d]"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-white tracking-wide">{box.title}</span>
                  )}
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover/container:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingContainerId(box.id);
                      setEditingContainerTitle(box.title);
                    }}
                    className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d]"
                    title="Edit Layer Title"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContainer(box.id);
                    }}
                    className="p-1 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#f85149]/10"
                    title="Remove Layer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Resize Handle (Bottom Right) */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setResizingContainerId(box.id);
                }}
                className="container-resize-handle self-end p-2 cursor-se-resize text-[#8b949e] hover:text-white transition-colors"
                title="Drag to resize container layer"
              >
                <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-[#8b949e] rounded-br-sm" />
              </div>
            </div>
          );
        })}

        {/* SVG Live Foreign Key Connectors */}
        <svg
          style={{ overflow: 'visible' }}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {renderedEdges}
        </svg>

        {/* Interactive Table Cards */}
        {localNodes.map((node) => {
          const isCollapsed = !!collapsedTables[node.id];
          const pkCount = node.columns.filter((c) => c.isPrimaryKey).length;
          const fkCount = node.columns.filter((c) => c.isForeignKey).length;
          const isConnectingSource = connectingSourceTable === node.tableName;

          const isConnectedToActiveEdge =
            activeEdge &&
            (activeEdge.source === node.tableName ||
              activeEdge.target === node.tableName ||
              activeEdge.source === node.id ||
              activeEdge.target === node.id);

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: `${node.positionX}px`,
                top: `${node.positionY}px`,
                width: `${TABLE_WIDTH}px`,
              }}
              onMouseDown={(e) => handleTableCardClick(e, node)}
              className={`table-card pointer-events-auto rounded-2xl border transition-all select-none group/card text-[#c9d1d9] font-sans ${
                isConnectingSource
                  ? 'border-[#38bdf8] ring-4 ring-[#38bdf8]/20 shadow-2xl bg-[#161b22]'
                  : isConnectedToActiveEdge
                  ? 'border-[#58a6ff] ring-2 ring-[#58a6ff]/30 shadow-2xl bg-[#161b22]'
                  : activeTool !== 'SELECT'
                  ? 'border-[#30363d] bg-[#161b22] hover:border-[#38bdf8] hover:scale-[1.01] cursor-pointer shadow-xl'
                  : 'border-[#30363d] bg-[#161b22] shadow-2xl hover:border-[#58a6ff] hover:shadow-[#58a6ff]/10'
              }`}
            >
              {/* Table Header */}
              <div className="px-3.5 py-2.5 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between cursor-move rounded-t-2xl">
                <div className="flex items-center space-x-2 truncate">
                  <div className="p-1 rounded-md bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                    <TableIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] font-mono text-[#8b949e] leading-none">
                      {node.schema}
                    </div>
                    <div className="text-xs font-bold text-white font-mono truncate">
                      {node.tableName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {onAddColumn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddColumn(node.tableName);
                      }}
                      className="p-1 text-[#8b949e] hover:text-[#3fb950] rounded hover:bg-[#21262d] transition-colors"
                      title="Add Column"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {pkCount > 0 && (
                    <span
                      className="px-1 py-0.5 rounded bg-[#d29922]/20 text-[#d29922] text-[9px] font-bold border border-[#d29922]/30"
                      title={`${pkCount} Primary Key`}
                    >
                      PK
                    </span>
                  )}
                  {fkCount > 0 && (
                    <span
                      className="px-1 py-0.5 rounded bg-[#00758f]/20 text-[#38bdf8] text-[9px] font-bold border border-[#00758f]/30"
                      title={`${fkCount} Foreign Key`}
                    >
                      FK
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(node.id);
                    }}
                    className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Columns List */}
              {!isCollapsed && (
                <div className="py-1 divide-y divide-[#21262d] max-h-72 overflow-y-auto font-mono text-xs">
                  {node.columns.map((col) => {
                    const isColHighlighted =
                      activeEdge &&
                      ((activeEdge.source === node.tableName && activeEdge.sourceColumn === col.name) ||
                        (activeEdge.target === node.tableName && activeEdge.targetColumn === col.name));

                    return (
                      <div
                        key={col.name}
                        className={`px-3.5 py-1.5 flex items-center justify-between transition-colors ${
                          isColHighlighted
                            ? 'bg-[#1f6feb]/20 text-white font-semibold'
                            : 'hover:bg-[#21262d]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {col.isPrimaryKey ? (
                            <Key className="w-3 h-3 text-[#d29922] flex-shrink-0" />
                          ) : col.isForeignKey ? (
                            <Link2 className="w-3 h-3 text-[#38bdf8] flex-shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#30363d] inline-block flex-shrink-0 scale-75" />
                          )}
                          <span
                            className={`truncate ${
                              col.isPrimaryKey
                                ? 'text-[#d29922] font-semibold'
                                : col.isForeignKey
                                ? 'text-[#38bdf8] font-medium'
                                : 'text-[#c9d1d9]'
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>

                        <span className="text-[10px] text-[#8b949e] ml-2 flex-shrink-0">
                          {col.nativeType}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Workbench Visual Modeling Tool Palette (Floating Left Toolbar) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-1 p-1.5 rounded-2xl bg-[#161b22]/95 border border-[#30363d] shadow-2xl backdrop-blur-md text-[#c9d1d9]">
        {/* Select Mode */}
        <button
          onClick={() => {
            setActiveTool('SELECT');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'SELECT'
              ? 'bg-[#1f6feb] text-white shadow-md'
              : 'hover:bg-[#21262d] text-[#8b949e] hover:text-white'
          }`}
          title="Pointer / Select & Drag Mode (V)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-[#30363d] my-0.5" />

        {/* 1:N Non-Identifying Relationship Tool */}
        <button
          onClick={() => {
            setActiveTool('REL_1_N');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'REL_1_N'
              ? 'bg-[#38bdf8] text-black font-bold shadow-md'
              : 'hover:bg-[#21262d] text-[#38bdf8]'
          }`}
          title="1:N Non-Identifying Relationship Tool (Click Source then Target table)"
        >
          <GitFork className="w-4 h-4" />
        </button>

        {/* 1:N Identifying Container Relationship Tool */}
        <button
          onClick={() => {
            setActiveTool('REL_IDENTIFYING');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'REL_IDENTIFYING'
              ? 'bg-[#3fb950] text-black font-bold shadow-md'
              : 'hover:bg-[#21262d] text-[#3fb950]'
          }`}
          title="1:N Identifying / Container Relationship Tool (Cascade Parent-Child)"
        >
          <FolderTree className="w-4 h-4" />
        </button>

        {/* 1:1 Relationship Tool */}
        <button
          onClick={() => {
            setActiveTool('REL_1_1');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'REL_1_1'
              ? 'bg-[#bc8cff] text-black font-bold shadow-md'
              : 'hover:bg-[#21262d] text-[#bc8cff]'
          }`}
          title="1:1 Unique Relationship Tool"
        >
          <Link2 className="w-4 h-4" />
        </button>

        {/* N:M Many-to-Many Tool */}
        <button
          onClick={() => {
            setActiveTool('REL_N_M');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'REL_N_M'
              ? 'bg-[#d29922] text-black font-bold shadow-md'
              : 'hover:bg-[#21262d] text-[#d29922]'
          }`}
          title="N:M Many-to-Many Tool (Creates Junction / Bridge Table)"
        >
          <Boxes className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-[#30363d] my-0.5" />

        {/* Add Schema Container Box Tool */}
        <button
          onClick={() => {
            setActiveTool('ADD_CONTAINER');
            setConnectingSourceTable(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'ADD_CONTAINER'
              ? 'bg-[#e3b341] text-black font-bold shadow-md'
              : 'hover:bg-[#21262d] text-[#8b949e] hover:text-white'
          }`}
          title="Add Schema Container / Layer Box"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Active Relationship Prompt Banner */}
      {activeTool !== 'SELECT' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-[#161b22]/95 border border-[#38bdf8]/50 shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs font-mono text-white animate-pulse">
          <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <span>
            {connectingSourceTable
              ? `Selected "${connectingSourceTable}". Click target table to complete ${
                  activeTool === 'REL_1_1'
                    ? '1:1'
                    : activeTool === 'REL_IDENTIFYING'
                    ? '1:N Identifying'
                    : activeTool === 'REL_N_M'
                    ? 'N:M'
                    : '1:N'
                } link...`
              : `Workbench Tool Active: Click first table to begin ${
                  activeTool === 'REL_1_1'
                    ? '1:1'
                    : activeTool === 'REL_IDENTIFYING'
                    ? '1:N Identifying'
                    : activeTool === 'REL_N_M'
                    ? 'N:M Many-to-Many'
                    : activeTool === 'ADD_CONTAINER'
                    ? 'Container Layer'
                    : '1:N'
                } connection`}
          </span>
          <button
            onClick={() => {
              setActiveTool('SELECT');
              setConnectingSourceTable(null);
            }}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Canvas Controls (Bottom Right) */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center space-x-1.5 p-1.5 rounded-xl bg-[#161b22]/90 border border-[#30363d] shadow-2xl backdrop-blur-sm text-[#c9d1d9]">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg hover:bg-[#21262d] hover:text-white transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg hover:bg-[#21262d] hover:text-white transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-[#30363d]" />
        <button
          onClick={handleFitView}
          className="p-1.5 rounded-lg hover:bg-[#21262d] hover:text-white transition-colors"
          title="Fit All Tables to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg hover:bg-[#21262d] hover:text-white transition-colors text-xs font-mono px-2"
          title="Reset Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  );
};
