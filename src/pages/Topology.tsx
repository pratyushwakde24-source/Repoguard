import { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, Position, Handle } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

function ServiceNode({ data }: { data: { label: string; type: string; health: number; status: string; latency: string; incident?: string } }) {
  const isFailing = data.status === 'failing'
  const isFault = data.status === 'fault'
  return (
    <div className={`p-2.5 rounded-xl min-w-[120px] transition-all ${
      isFault ? 'bg-error-container shadow-[0_0_14px_rgba(147,0,10,0.5)]' :
      isFailing ? 'bg-surface-container-highest shadow-[0_0_18px_rgba(255,180,171,0.35)] ring-2 ring-error/80' :
      'bg-surface-container-high shadow-lg'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-surface-container-highest !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-surface-container-highest !w-2 !h-2 !border-0" />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isFailing || isFault ? 'bg-error animate-ping' : 'bg-tertiary shadow-[0_0_6px_#67df70]'}`} />
          <span className={`text-[9px] font-mono ${isFailing || isFault ? 'text-error font-bold' : 'text-tertiary'}`}>
            {isFault ? 'FAULT ORIGIN' : isFailing ? 'DEGRADED' : `${data.health}%`}
          </span>
        </div>
      </div>
      <div className={`text-code-sm font-medium truncate ${isFault ? 'text-on-error-container' : isFailing ? 'text-error font-semibold' : 'text-on-surface'}`}>{data.label}</div>
      <div className="flex items-center justify-between mt-0.5 text-[9px]">
        <span className={`${isFault ? 'text-on-error-container/80' : 'text-outline-variant'}`}>{data.type}</span>
        <span className={`font-mono ${isFailing || isFault ? 'text-error font-bold' : 'text-tertiary'}`}>{data.latency}</span>
      </div>
      {data.incident && (
        <div className="mt-1 flex items-center gap-1 text-[8px] bg-primary-container/20 text-primary-fixed px-1 rounded">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          <span>AST Repair 4/8</span>
        </div>
      )}
    </div>
  )
}

const nodeTypes = { service: ServiceNode }

const initialNodes: Node[] = [
  { id: 'checkout', type: 'service', position: { x: 50, y: 50 }, data: { label: 'checkout', type: 'web', health: 99.9, status: 'healthy', latency: '12ms' } },
  { id: 'gateway', type: 'service', position: { x: 250, y: 30 }, data: { label: 'api-gateway', type: 'kong-proxy', health: 99.4, status: 'healthy', latency: '4ms' } },
  { id: 'auth', type: 'service', position: { x: 50, y: 200 }, data: { label: 'auth-service', type: 'jwt-worker', health: 100, status: 'healthy', latency: '8ms' } },
  { id: 'inventory', type: 'service', position: { x: 500, y: 50 }, data: { label: 'inventory', type: 'grpc', health: 99.7, status: 'healthy', latency: '16ms' } },
  { id: 'payment', type: 'service', position: { x: 350, y: 180 }, data: { label: 'payment-service', type: 'INC-9281', health: 71.4, status: 'failing', latency: '240ms [ERR]', incident: 'INC-9281' } },
  { id: 'stripe', type: 'service', position: { x: 350, y: 340 }, data: { label: 'stripe-adapter', type: 'NullPointer', health: 0, status: 'fault', latency: '500 API' } },
  { id: 'billing', type: 'service', position: { x: 130, y: 340 }, data: { label: 'billing-pg', type: 'supabase', health: 100, status: 'healthy', latency: '2ms' } },
]

const initialEdges: Edge[] = [
  { id: 'e1', source: 'checkout', target: 'gateway', style: { stroke: '#67df70', strokeWidth: 2 }, animated: false },
  { id: 'e2', source: 'gateway', target: 'payment', style: { stroke: '#ffb4ab', strokeWidth: 2 }, animated: true },
  { id: 'e3', source: 'gateway', target: 'inventory', style: { stroke: '#31353c', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e4', source: 'checkout', target: 'auth', style: { stroke: '#31353c', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e5', source: 'payment', target: 'stripe', style: { stroke: '#ffb4ab', strokeWidth: 3 }, animated: true },
  { id: 'e6', source: 'auth', target: 'billing', style: { stroke: '#31353c', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e7', source: 'payment', target: 'billing', style: { stroke: '#31353c', strokeWidth: 1.5, strokeDasharray: '4 4' } },
]

export default function Topology() {
  const [nodes] = useState(initialNodes)
  const [edges] = useState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const onNodeClick = useCallback((_: unknown, node: Node) => setSelectedNode(node), [])

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 pb-0">
          <div className="text-code-sm text-outline uppercase tracking-wider mb-2">
            Engineering {'>'} <span className="text-primary-fixed">Repository Topology</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-label-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />1 DEGRADED PATH (INC-9281)
                </div>
                <span className="text-code-sm text-outline">7 NODES ACTIVE</span>
              </div>
              <h1 className="text-headline-md text-on-surface tracking-tight mt-1">Repository Topology</h1>
            </div>
            <div className="flex items-center gap-3 text-label-sm">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary" />Healthy (5)</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error" />Fault Path (2)</div>
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-xl mx-4 mb-4 bg-surface-container-lowest overflow-hidden shadow-2xl">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView
            style={{ background: '#0a0e14' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1c2026" gap={24} />
            <Controls className="!bg-surface-container !border-surface-container-highest !shadow-lg [&>button]:!bg-surface-container-high [&>button]:!border-surface-container-highest [&>button]:!text-on-surface-variant [&>button:hover]:!bg-surface-bright" />
          </ReactFlow>
        </div>
      </div>
      {/* Inspector Panel */}
      {selectedNode && (
        <div className="w-[280px] bg-surface-container border-l border-surface-container-highest/30 p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-headline-sm text-on-surface">{(selectedNode.data as { label: string }).label}</span>
            <button onClick={() => setSelectedNode(null)} className="material-symbols-outlined text-[18px] text-outline hover:text-on-surface">close</button>
          </div>
          {Object.entries(selectedNode.data as Record<string, unknown>).filter(([k]) => k !== 'label').map(([key, val]) => (
            <div key={key} className="flex flex-col gap-0.5 p-2 rounded-lg bg-surface-container-low">
              <span className="text-label-sm text-outline uppercase tracking-wider">{key}</span>
              <span className="text-code-sm text-on-surface">{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
