import React, { useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  MarkerType,
  ConnectionLineType,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  WorkOrder, 
  Quote, 
  DeliveryNote, 
  Invoice, 
  Client, 
  Purchase,
  Operation
} from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { SparklesIcon, RotateCcwIcon, FilterIcon, SendIcon, SearchIcon } from 'lucide-react';

interface DataMindmapProps {
  clients: Client[];
  quotes: Quote[];
  workOrders: WorkOrder[];
  deliveryNotes: DeliveryNote[];
  invoices: Invoice[];
  purchases: Purchase[];
  operations: Operation[];
}

const nodeStyles = {
  client: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  quote: { background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  workOrder: { background: '#eef2ff', border: '2px solid #6366f1', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  purchase: { background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  operation: { background: '#f5f3ff', border: '2px solid #8b5cf6', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  subcontracting: { background: '#fff1f2', border: '2px solid #f43f5e', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  deliveryNote: { background: '#fdf4ff', border: '2px solid #d946ef', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  invoice: { background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px', padding: '12px', width: 200, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
};

export const DataMindmap: React.FC<DataMindmapProps> = ({
  clients,
  quotes,
  workOrders,
  deliveryNotes,
  invoices,
  purchases,
  operations
}) => {
  const [showOnlyInProgress, setShowOnlyInProgress] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const xOffset = 300;
    const yOffset = 120;

    // Filtering logic
    const filteredWorkOrders = showOnlyInProgress 
      ? workOrders.filter(wo => !wo.invoiceNumber) 
      : workOrders;
    
    const filteredQuotes = showOnlyInProgress
      ? quotes.filter(q => filteredWorkOrders.some(wo => wo.quoteId === q.id))
      : quotes;

    const filteredDeliveryNotes = showOnlyInProgress
      ? deliveryNotes.filter(dn => filteredWorkOrders.some(wo => wo.id === dn.workOrderId))
      : deliveryNotes;

    const filteredInvoices = showOnlyInProgress
      ? invoices.filter(inv => filteredWorkOrders.some(wo => wo.id === inv.workOrderId))
      : invoices;

    const filteredPurchases = showOnlyInProgress
      ? purchases.filter(p => filteredWorkOrders.some(wo => wo.id === p.workOrderId))
      : purchases;

    // 0. Clients
    const activeClientIds = new Set([
      ...filteredQuotes.map(q => q.clientId),
      ...filteredWorkOrders.map(wo => wo.clientId)
    ]);
    
    clients.filter(c => activeClientIds.has(c.id)).forEach((client, i) => {
      nodes.push({
        id: `client-${client.id}`,
        data: { 
          textLabel: `Client: ${client.name}`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</div>
              <div className="font-bold text-slate-800 truncate">{client.name}</div>
            </div>
          )
        },
        position: { x: 0, y: i * yOffset },
        style: nodeStyles.client,
      });
    });

    // 1. RFQ (Quotes)
    filteredQuotes.forEach((quote, i) => {
      nodes.push({
        id: `quote-${quote.id}`,
        data: { 
          textLabel: `RFQ: ${quote.quoteNumber} - ${quote.name}`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">RFQ</div>
              <div className="font-bold text-slate-800">{quote.quoteNumber}</div>
              <div className="text-[10px] text-slate-500 truncate">{quote.name}</div>
            </div>
          )
        },
        position: { x: xOffset, y: i * yOffset },
        style: nodeStyles.quote,
      });

      if (quote.clientId) {
        edges.push({
          id: `e-client-quote-${quote.id}`,
          source: `client-${quote.clientId}`,
          target: `quote-${quote.id}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    // 2. Work Orders (WO)
    filteredWorkOrders.forEach((wo, i) => {
      nodes.push({
        id: `wo-${wo.id}`,
        data: { 
          textLabel: `Work Order: ${wo.workOrderNumber} (${wo.status})`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Work Order</div>
              <div className="font-bold text-slate-800">{wo.workOrderNumber}</div>
              <div className={`text-[10px] font-bold mt-1 ${wo.status === 'Completed' ? 'text-green-600' : 'text-blue-600'}`}>
                {wo.status}
              </div>
            </div>
          )
        },
        position: { x: xOffset * 2, y: i * yOffset },
        style: nodeStyles.workOrder,
      });

      if (wo.quoteId) {
        edges.push({
          id: `e-quote-wo-${wo.id}`,
          source: `quote-${wo.quoteId}`,
          target: `wo-${wo.id}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      } else if (wo.clientId) {
        edges.push({
          id: `e-client-wo-${wo.id}`,
          source: `client-${wo.clientId}`,
          target: `wo-${wo.id}`,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    // 3. Purchases (ACHATS)
    filteredPurchases.forEach((p, i) => {
      nodes.push({
        id: `purchase-${p.id}`,
        data: { 
          textLabel: `Achat: ${p.purchaseNumber} (${p.status})`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Achat</div>
              <div className="font-bold text-slate-800">{p.purchaseNumber}</div>
              <div className="text-[10px] text-slate-500">{p.status}</div>
            </div>
          )
        },
        position: { x: xOffset * 3, y: i * yOffset },
        style: nodeStyles.purchase,
      });

      if (p.workOrderId) {
        edges.push({
          id: `e-wo-purchase-${p.id}`,
          source: `wo-${p.workOrderId}`,
          target: `purchase-${p.id}`,
          style: { stroke: '#f59e0b' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        });
      }
    });

    // 4. Operations & Subcontracting (OP / ST)
    let opIndex = 0;
    filteredWorkOrders.forEach((wo) => {
      // Operations from parts
      const uniqueOps = new Set<string>();
      wo.parts.forEach(p => {
        p.operations.forEach(op => {
          const opData = operations.find(o => o.id === op.operationId);
          if (opData && !uniqueOps.has(opData.id)) {
            uniqueOps.add(opData.id);
            const nodeId = `op-${wo.id}-${opData.id}`;
            nodes.push({
              id: nodeId,
              data: { 
                textLabel: `Opération: ${opData.name} (WO: ${wo.workOrderNumber})`,
                label: (
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Opération</div>
                    <div className="font-bold text-slate-800">{opData.name}</div>
                  </div>
                )
              },
              position: { x: xOffset * 4, y: opIndex * yOffset },
              style: nodeStyles.operation,
            });
            edges.push({
              id: `e-wo-op-${wo.id}-${opData.id}`,
              source: `wo-${wo.id}`,
              target: nodeId,
              style: { stroke: '#8b5cf6', strokeDasharray: '5,5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            });
            opIndex++;
          }
        });
      });

      // Subcontracting
      (wo.subcontractingItems || []).forEach((st, idx) => {
        const nodeId = `st-${wo.id}-${idx}`;
        nodes.push({
          id: nodeId,
          data: { 
            textLabel: `Sous-traitance: ${st.description} (WO: ${wo.workOrderNumber})`,
            label: (
              <div className="text-center">
                <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Sous-traitance</div>
                <div className="font-bold text-slate-800 truncate">{st.description}</div>
              </div>
            )
          },
          position: { x: xOffset * 4, y: opIndex * yOffset },
          style: nodeStyles.subcontracting,
        });
        edges.push({
          id: `e-wo-st-${wo.id}-${idx}`,
          source: `wo-${wo.id}`,
          target: nodeId,
          style: { stroke: '#f43f5e', strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
        });
        opIndex++;
      });
    });

    // 5. Delivery Notes (BDL)
    filteredDeliveryNotes.forEach((dn, i) => {
      nodes.push({
        id: `dn-${dn.id}`,
        data: { 
          textLabel: `Livraison: ${dn.deliveryNoteNumber} (${dn.date})`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-wider mb-1">Livraison</div>
              <div className="font-bold text-slate-800">{dn.deliveryNoteNumber}</div>
              <div className="text-[10px] text-slate-500">{dn.date}</div>
            </div>
          )
        },
        position: { x: xOffset * 5, y: i * yOffset },
        style: nodeStyles.deliveryNote,
      });

      if (dn.workOrderId) {
        edges.push({
          id: `e-wo-dn-${dn.id}`,
          source: `wo-${dn.workOrderId}`,
          target: `dn-${dn.id}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    // 6. Invoices (INV)
    filteredInvoices.forEach((inv, i) => {
      nodes.push({
        id: `inv-${inv.id}`,
        data: { 
          textLabel: `Facture: ${inv.invoiceNumber} ($${inv.totalAmount})`,
          label: (
            <div className="text-center">
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">Facture</div>
              <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
              <div className="text-[10px] text-slate-500 font-bold">${inv.totalAmount.toLocaleString()}</div>
            </div>
          )
        },
        position: { x: xOffset * 6, y: i * yOffset },
        style: nodeStyles.invoice,
      });

      if (inv.deliveryNoteId) {
        edges.push({
          id: `e-dn-inv-${inv.id}`,
          source: `dn-${inv.deliveryNoteId}`,
          target: `inv-${inv.id}`,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      } else if (inv.workOrderId) {
        edges.push({
          id: `e-wo-inv-${inv.id}`,
          source: `wo-${inv.workOrderId}`,
          target: `inv-${inv.id}`,
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [clients, quotes, workOrders, deliveryNotes, invoices, purchases, operations, showOnlyInProgress]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Apply highlighting
  const styledNodes = useMemo(() => {
    if (highlightedIds.length === 0) return nodes;
    return nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: highlightedIds.includes(node.id) ? 1 : 0.15,
        filter: highlightedIds.includes(node.id) ? 'none' : 'grayscale(50%)',
        transition: 'all 0.3s ease'
      }
    }));
  }, [nodes, highlightedIds]);

  const styledEdges = useMemo(() => {
    if (highlightedIds.length === 0) return edges;
    return edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: highlightedIds.includes(edge.source) && highlightedIds.includes(edge.target) ? 1 : 0.05,
        transition: 'all 0.3s ease'
      }
    }));
  }, [edges, highlightedIds]);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let response;
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `You are a data assistant for an ERP. Given the user query and the list of available nodes in a mindmap, return a JSON array of node IDs that should be highlighted.
            
            User Query: "${aiQuery}"
            
            Available Nodes:
            ${nodes.map(n => `${n.id}: ${n.data.textLabel}`).join('\n')}
            
            Rules:
            1. If the user asks for a specific Work Order (e.g. "WO-140426-01"), include its ID and all connected IDs (RFQ, BDL, INV, etc.).
            2. If the user asks for a client, include the client node and all their related documents.
            3. Return ONLY a JSON array of strings.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          });
          break; // success
        } catch (error: unknown) {
          const errorStr = error instanceof Error ? error.message : String(error);
          if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand')) {
            retries--;
            if (retries === 0) throw error;
            console.warn(`Retry ${retries} after ${delay}ms due to 503 error.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            throw error;
          }
        }
      }

      if (!response) throw new Error("AI failed to respond");
      const ids = JSON.parse(response.text);
      setHighlightedIds(ids);
    } catch (error) {
      console.error('AI Search Error:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetHighlight = () => {
    setHighlightedIds([]);
    setAiQuery('');
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header / Toolbar */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SearchIcon className="w-5 h-5 text-blue-600" />
            Explorateur de Flux
          </h2>
          <div className="h-6 w-px bg-slate-200" />
          <button
            onClick={() => setShowOnlyInProgress(!showOnlyInProgress)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showOnlyInProgress 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            {showOnlyInProgress ? 'En cours uniquement' : 'Tout afficher'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="Ex: 'Montre moi tout sur le client Alpha' ou 'Highlight WO-140426-01'..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <SparklesIcon className="absolute left-3 top-2.5 w-4 h-4 text-purple-500" />
          </div>
          <button
            onClick={handleAiSearch}
            disabled={isAiLoading || !aiQuery.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isAiLoading ? <RotateCcwIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={resetHighlight}
            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
            title="Réinitialiser"
          >
            <RotateCcwIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Flow Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={24} size={1} />
          <Controls />
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.style?.border) return (n.style.border as string).split(' ')[2];
              return '#eee';
            }}
            nodeColor={(n) => {
              if (n.style?.background) return n.style.background as string;
              return '#fff';
            }}
          />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 right-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl pointer-events-none max-w-xs">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Légende du Workflow</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Client', color: '#64748b' },
              { label: 'RFQ (Soumission)', color: '#0ea5e9' },
              { label: 'Work Order', color: '#6366f1' },
              { label: 'Achat (PO)', color: '#f59e0b' },
              { label: 'Opération / ST', color: '#8b5cf6' },
              { label: 'Livraison (BDL)', color: '#d946ef' },
              { label: 'Facture (INV)', color: '#22c55e' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
