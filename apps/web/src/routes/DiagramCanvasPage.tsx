import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  GitGraph,
  Save,
  LayoutGrid,
  AlertCircle,
  Loader2,
  Database,
  Trash2,
  FolderOpen,
  GitFork,
  Table as TableIcon,
  RefreshCw,
  Boxes,
  Link2,
  FolderTree,
  UserPlus,
  Share2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import dagre from 'dagre';
import { LIST_CONNECTIONS_QUERY } from '../graphql/connections';
import { CONNECTION_SCHEMAS_QUERY } from '../graphql/schema';
import {
  GENERATE_DIAGRAM_MUTATION,
  GET_DIAGRAM_QUERY,
  LIST_DIAGRAMS_QUERY,
  SAVE_DIAGRAM_LAYOUT_MUTATION,
  DELETE_DIAGRAM_MUTATION,
} from '../graphql/diagrams';
import {
  InteractiveDiagramCanvas,
  TableNodeItem,
  DiagramEdgeItem,
  DiagramContainerItem,
} from '../components/diagram/InteractiveDiagramCanvas';
import { AddTableModal } from '../components/diagram/AddTableModal';
import { AddColumnModal } from '../components/diagram/AddColumnModal';
import { AddRelationshipModal, RelationshipKind } from '../components/diagram/AddRelationshipModal';
import { InviteCollaboratorModal } from '../components/diagram/InviteCollaboratorModal';
import { CreateSchemaDrawer } from '../components/schema/CreateSchemaDrawer';
import { SchemaPermissionsDrawer } from '../components/schema/SchemaPermissionsDrawer';
import { useDiagramStore } from '../stores/diagramStore';

interface ConnectionItem {
  id: string;
  name: string;
  engine: string;
  database: string;
}

interface DiagramSummaryItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const DiagramCanvasPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConnectionId = searchParams.get('connectionId') || '';
  const initialSchema = searchParams.get('schema') || '';
  const initialDiagramId = searchParams.get('diagramId') || '';

  // 1. Fetch Connections
  const { data: connData } = useQuery(LIST_CONNECTIONS_QUERY);
  const connections: ConnectionItem[] = useMemo(() => connData?.listConnections || [], [connData]);

  // Selected State
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(initialConnectionId);
  const [selectedSchema, setSelectedSchema] = useState<string>(initialSchema);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(initialDiagramId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);
  const [addColModalOpen, setAddColModalOpen] = useState(false);
  const [targetTableForCol, setTargetTableForCol] = useState('');
  const [addRelModalOpen, setAddRelModalOpen] = useState(false);
  const [relSourceTable, setRelSourceTable] = useState('');
  const [relTargetTable, setRelTargetTable] = useState('');
  const [relKind, setRelKind] = useState<RelationshipKind>('ONE_TO_MANY');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createSchemaOpen, setCreateSchemaOpen] = useState(false);
  const [permSchemaOpen, setPermSchemaOpen] = useState(false);

  const isDirty = useDiagramStore((state) => state.isDirty);
  const setDirty = useDiagramStore((state) => state.setDirty);

  // Canvas Nodes, Edges & Containers State
  const [nodes, setNodes] = useState<TableNodeItem[]>([]);
  const [edges, setEdges] = useState<DiagramEdgeItem[]>([]);
  const [containers, setContainers] = useState<DiagramContainerItem[]>([]);

  // Synchronize URL Query Parameters whenever selection changes
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedConnectionId) params.connectionId = selectedConnectionId;
    if (selectedSchema) params.schema = selectedSchema;
    if (selectedDiagramId) params.diagramId = selectedDiagramId;

    setSearchParams(params, { replace: true });
  }, [selectedConnectionId, selectedSchema, selectedDiagramId, setSearchParams]);

  // 2. Fetch Schemas for selected connection
  const { data: schemasData } = useQuery(CONNECTION_SCHEMAS_QUERY, {
    variables: { connectionId: selectedConnectionId },
    skip: !selectedConnectionId,
  });
  const schemas: { name: string }[] = useMemo(() => schemasData?.connectionSchemas || [], [schemasData]);

  // 3. Fetch Diagrams list for selected connection
  const { data: diagramsData, refetch: refetchDiagrams } = useQuery(LIST_DIAGRAMS_QUERY, {
    variables: { connectionId: selectedConnectionId },
    skip: !selectedConnectionId,
    fetchPolicy: 'cache-and-network',
  });
  const savedDiagrams: DiagramSummaryItem[] = useMemo(() => diagramsData?.listDiagrams || [], [diagramsData]);

  // 4. Fetch Active Diagram via declarative useQuery
  const { data: activeDiagramData, loading: loadingDiagram } = useQuery(GET_DIAGRAM_QUERY, {
    variables: { id: selectedDiagramId },
    skip: !selectedDiagramId,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [generateDiagram, { loading: generating }] = useMutation(GENERATE_DIAGRAM_MUTATION);
  const [saveLayout, { loading: saving }] = useMutation(SAVE_DIAGRAM_LAYOUT_MUTATION);
  const [deleteDiagram] = useMutation(DELETE_DIAGRAM_MUTATION);

  // Sync initial connection selection
  useEffect(() => {
    if (connections.length > 0 && !selectedConnectionId) {
      const target = initialConnectionId || connections[0].id;
      setSelectedConnectionId(target);
    }
  }, [connections, selectedConnectionId, initialConnectionId]);

  // Sync default schema selection
  useEffect(() => {
    if (schemas.length > 0) {
      if (initialSchema && schemas.some((s) => s.name === initialSchema)) {
        setSelectedSchema(initialSchema);
      } else if (!selectedSchema) {
        const def = schemas.find((s) => s.name === 'public' || s.name === 'sample_ecommerce') || schemas[0];
        if (def) setSelectedSchema(def.name);
      }
    }
  }, [schemas, initialSchema, selectedSchema]);

  // Sync selected diagram when diagrams list changes or defaults
  useEffect(() => {
    if (savedDiagrams.length > 0) {
      if (!selectedDiagramId || !savedDiagrams.some((d) => d.id === selectedDiagramId)) {
        // If URL requested an initial diagram that exists, prefer it
        const match = initialDiagramId && savedDiagrams.find((d) => d.id === initialDiagramId);
        setSelectedDiagramId(match ? match.id : savedDiagrams[0].id);
      }
    } else {
      setSelectedDiagramId('');
      setNodes([]);
      setEdges([]);
    }
  }, [savedDiagrams, selectedDiagramId, initialDiagramId]);

  // Transform GraphQL DiagramView to Canvas Nodes and Edges
  const loadDiagramData = useCallback((diagramView: any) => {
    if (!diagramView || !diagramView.nodes) return;

    const formattedNodes: TableNodeItem[] = diagramView.nodes.map((n: any) => ({
      id: n.id,
      tableName: n.tableName,
      schema: n.schema,
      positionX: Number(n.positionX) || 100,
      positionY: Number(n.positionY) || 100,
      columns: n.columns || [],
    }));

    const formattedEdges: DiagramEdgeItem[] = (diagramView.edges || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceColumn: e.sourceColumn,
      targetColumn: e.targetColumn,
      relationName: e.relationName,
      cardinality: 'ONE_TO_MANY',
    }));

    setNodes(formattedNodes);
    setEdges(formattedEdges);
    setDirty(false);
  }, [setDirty]);

  // When active diagram data arrives, load into canvas
  useEffect(() => {
    if (activeDiagramData?.diagram) {
      loadDiagramData(activeDiagramData.diagram);
    }
  }, [activeDiagramData, loadDiagramData]);

  // Handle Generate / Reverse Engineer New Diagram
  const handleGenerate = useCallback(async () => {
    if (!selectedConnectionId || !selectedSchema) return;
    setErrorMessage(null);
    try {
      const res = await generateDiagram({
        variables: {
          input: {
            connectionId: selectedConnectionId,
            schema: selectedSchema,
            name: `${selectedSchema} Schema ER (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          },
        },
      });

      if (res.data?.generateDiagram) {
        setSelectedDiagramId(res.data.generateDiagram.id);
        loadDiagramData(res.data.generateDiagram);
        await refetchDiagrams();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate diagram');
      console.error('Error generating diagram:', err);
    }
  }, [selectedConnectionId, selectedSchema, generateDiagram, loadDiagramData, refetchDiagrams]);

  // Open Column Modal Handler
  const handleOpenAddColumn = useCallback((tableName: string) => {
    setTargetTableForCol(tableName);
    setAddColModalOpen(true);
  }, []);

  // Handle Save Layout
  const handleSaveLayout = async () => {
    if (!selectedDiagramId || nodes.length === 0) return;
    try {
      const positions = nodes.map((n) => ({
        nodeId: n.id,
        x: Math.round(n.positionX),
        y: Math.round(n.positionY),
      }));

      await saveLayout({
        variables: {
          input: {
            diagramId: selectedDiagramId,
            positions,
          },
        },
      });

      setDirty(false);
    } catch (err: any) {
      alert(`Failed to save layout: ${err.message}`);
    }
  };

  // Auto-layout with Dagre
  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 140 });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      const height = 42 + (node.columns?.length || 5) * 28;
      g.setNode(node.id, { width: 260, height });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodePos = g.node(node.id);
      return {
        ...node,
        positionX: nodePos ? Math.round(nodePos.x - 130) : node.positionX,
        positionY: nodePos ? Math.round(nodePos.y - (42 + node.columns.length * 28) / 2) : node.positionY,
      };
    });

    setNodes(layoutedNodes);
    setDirty(true);
  };

  // Delete current diagram
  const handleDeleteDiagram = async () => {
    if (!selectedDiagramId) return;
    if (window.confirm('Are you sure you want to delete this diagram layout?')) {
      try {
        await deleteDiagram({ variables: { id: selectedDiagramId } });
        setSelectedDiagramId('');
        setNodes([]);
        setEdges([]);
        await refetchDiagrams();
      } catch (err: any) {
        alert(`Failed to delete diagram: ${err.message}`);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] overflow-hidden relative select-none font-sans text-[#c9d1d9]">
      {/* Top Diagram Toolbar */}
      <div className="h-12 border-b border-[#30363d] bg-[#161b22] px-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Connection Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#8b949e] font-medium flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#58a6ff]" />
            </span>
            <select
              value={selectedConnectionId}
              onChange={(e) => {
                setSelectedConnectionId(e.target.value);
                setSelectedDiagramId('');
              }}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-medium"
            >
              {connections.map((c: ConnectionItem) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.engine})
                </option>
              ))}
            </select>
          </div>

          {/* Schema Picker & Management */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-[#8b949e] font-medium flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5 text-[#d29922]" />
            </span>
            <select
              value={selectedSchema}
              onChange={(e) => {
                setSelectedSchema(e.target.value);
                setSelectedDiagramId('');
              }}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono"
            >
              {schemas.map((s: { name: string }) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setCreateSchemaOpen(true)}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#58a6ff] transition-colors"
              title="Create New Schema"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPermSchemaOpen(true)}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#58a6ff] transition-colors"
              title={`Manage Schema & User Permissions for "${selectedSchema}"`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Saved Diagrams Selector */}
          {savedDiagrams.length > 0 && (
            <div className="flex items-center space-x-2 border-l border-[#30363d] pl-3">
              <span className="text-xs text-[#8b949e]">Saved ERD:</span>
              <select
                value={selectedDiagramId}
                onChange={(e) => {
                  setSelectedDiagramId(e.target.value);
                }}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-medium"
              >
                {savedDiagrams.map((d: DiagramSummaryItem) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Unsaved indicator */}
          {isDirty && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#d29922]/10 border border-[#d29922]/30 text-[#d29922] text-[10px] font-semibold">
              <AlertCircle className="w-3 h-3" />
              <span>Unsaved Layout</span>
            </div>
          )}

          {/* Invite Collaborator / Share Button */}
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 text-xs font-semibold shadow-sm transition-all"
            title="Invite collaborators to team & share diagram"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Team</span>
          </button>

          {/* Add Table Button */}
          <button
            onClick={() => setAddTableModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-white border border-[#30363d] transition-colors"
            title="Create a new table on this schema"
          >
            <TableIcon className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>+ Add Table</span>
          </button>

          {/* Relationship Buttons (1:N, 1:1, Identifying, N:M) */}
          <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={() => {
                setRelSourceTable(nodes[0]?.tableName || '');
                setRelTargetTable(nodes[1]?.tableName || nodes[0]?.tableName || '');
                setRelKind('ONE_TO_MANY');
                setAddRelModalOpen(true);
              }}
              disabled={nodes.length < 2}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#21262d] text-xs font-semibold text-[#38bdf8] transition-colors disabled:opacity-40"
              title="Add 1:N Foreign Key"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>1:N</span>
            </button>

            <button
              onClick={() => {
                setRelSourceTable(nodes[0]?.tableName || '');
                setRelTargetTable(nodes[1]?.tableName || nodes[0]?.tableName || '');
                setRelKind('IDENTIFYING_CONTAINER');
                setAddRelModalOpen(true);
              }}
              disabled={nodes.length < 2}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#21262d] text-xs font-semibold text-[#3fb950] transition-colors disabled:opacity-40"
              title="Add 1:N Identifying Container Relationship"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>1:N (Cont)</span>
            </button>

            <button
              onClick={() => {
                setRelSourceTable(nodes[0]?.tableName || '');
                setRelTargetTable(nodes[1]?.tableName || nodes[0]?.tableName || '');
                setRelKind('ONE_TO_ONE');
                setAddRelModalOpen(true);
              }}
              disabled={nodes.length < 2}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#21262d] text-xs font-semibold text-[#bc8cff] transition-colors disabled:opacity-40"
              title="Add 1:1 Unique Relationship"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>1:1</span>
            </button>

            <button
              onClick={() => {
                setRelSourceTable(nodes[0]?.tableName || '');
                setRelTargetTable(nodes[1]?.tableName || nodes[0]?.tableName || '');
                setRelKind('MANY_TO_MANY');
                setAddRelModalOpen(true);
              }}
              disabled={nodes.length < 2}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#21262d] text-xs font-semibold text-[#d29922] transition-colors disabled:opacity-40"
              title="Add N:M Many-to-Many via Junction Table"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>N:M</span>
            </button>
          </div>

          {/* Auto-Layout (Dagre) */}
          <button
            onClick={handleAutoLayout}
            disabled={nodes.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-[#c9d1d9] border border-[#30363d] transition-colors disabled:opacity-40"
            title="Auto-arrange tables hierarchically using Dagre"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#bc8cff]" />
            <span>Auto-Layout</span>
          </button>

          {/* Save Layout Action */}
          <button
            onClick={handleSaveLayout}
            disabled={!isDirty || saving || !selectedDiagramId}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              isDirty
                ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white shadow-sm'
                : 'bg-[#21262d] text-[#8b949e] border border-[#30363d] cursor-not-allowed opacity-60'
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Layout</span>
          </button>

          {/* Reverse Engineer Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="Re-scan database schema and generate ERD"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Reverse Engineer</span>
          </button>

          {/* Delete Diagram */}
          {selectedDiagramId && (
            <button
              onClick={handleDeleteDiagram}
              className="p-1 text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded transition-colors"
              title="Delete diagram"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#2b0f14] border border-[#f85149]/40 text-[#ff7b72] text-xs font-mono rounded-lg shadow-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-2 underline hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {generating || (loadingDiagram && nodes.length === 0) ? (
          <div className="absolute inset-0 z-20 bg-[#0d1117]/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#58a6ff] animate-spin" />
            <p className="text-xs text-[#c9d1d9] font-mono">
              Introspecting tables, extracting live foreign keys & calculating Dagre layout...
            </p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#0d1117] text-[#8b949e]">
            <div className="w-14 h-14 rounded-2xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30 flex items-center justify-center mb-3">
              <GitGraph className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Tables in Schema "{selectedSchema || 'public'}"</h3>
            <p className="text-xs text-[#8b949e] max-w-sm mt-1 mb-4">
              Reverse-engineer the schema to discover existing database tables, or visually create new tables.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-xs font-semibold text-white shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reverse Engineer Schema</span>
              </button>
              <button
                onClick={() => setAddTableModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-white border border-[#30363d] transition-all"
              >
                <TableIcon className="w-4 h-4 text-[#58a6ff]" />
                <span>+ Create Table</span>
              </button>
            </div>
          </div>
        ) : (
          <InteractiveDiagramCanvas
            nodes={nodes}
            edges={edges}
            containers={containers}
            onNodesChange={(updatedNodes) => {
              setNodes(updatedNodes);
              setDirty(true);
            }}
            onContainersChange={(updatedContainers) => {
              setContainers(updatedContainers);
              setDirty(true);
            }}
            onAddColumn={handleOpenAddColumn}
            onConnectRelationship={(src, tgt, kind) => {
              setRelSourceTable(src);
              setRelTargetTable(tgt);
              setRelKind(kind);
              setAddRelModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Invite Collaborator / Team Modal */}
      <InviteCollaboratorModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        connectionId={selectedConnectionId}
        schema={selectedSchema}
        diagramId={selectedDiagramId}
      />

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={addTableModalOpen}
        onClose={() => setAddTableModalOpen(false)}
        connectionId={selectedConnectionId}
        schema={selectedSchema}
        diagramId={selectedDiagramId}
        onTableCreated={(view) => {
          loadDiagramData(view);
          void refetchDiagrams();
        }}
      />

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={addColModalOpen}
        onClose={() => {
          setAddColModalOpen(false);
          setTargetTableForCol('');
        }}
        connectionId={selectedConnectionId}
        schema={selectedSchema}
        tableName={targetTableForCol}
        diagramId={selectedDiagramId}
        onColumnAdded={(view) => {
          loadDiagramData(view);
        }}
      />

      {/* Add Relationship Modal */}
      <AddRelationshipModal
        isOpen={addRelModalOpen}
        onClose={() => {
          setAddRelModalOpen(false);
          setRelSourceTable('');
          setRelTargetTable('');
        }}
        connectionId={selectedConnectionId}
        schema={selectedSchema}
        initialSourceTable={relSourceTable}
        initialTargetTable={relTargetTable}
        initialKind={relKind}
        tables={nodes.map((n) => ({
          id: n.id,
          tableName: n.tableName,
          schema: n.schema,
          columns: n.columns.map((c) => ({
            name: c.name,
            nativeType: c.nativeType,
            isPrimaryKey: c.isPrimaryKey,
          })),
        }))}
        diagramId={selectedDiagramId}
        onRelationshipCreated={(view) => {
          loadDiagramData(view);
        }}
      />

      {/* Create Schema Drawer */}
      <CreateSchemaDrawer
        isOpen={createSchemaOpen}
        onClose={() => setCreateSchemaOpen(false)}
        connectionId={selectedConnectionId}
        onSchemaCreated={(newSchema) => {
          setSelectedSchema(newSchema);
          setSelectedDiagramId('');
        }}
      />

      {/* Schema Permissions & Security Drawer */}
      <SchemaPermissionsDrawer
        isOpen={permSchemaOpen}
        onClose={() => setPermSchemaOpen(false)}
        connectionId={selectedConnectionId}
        schema={selectedSchema}
        onSchemaDropped={() => {
          setSelectedSchema('public');
          setSelectedDiagramId('');
          setPermSchemaOpen(false);
        }}
      />
    </div>
  );
};
