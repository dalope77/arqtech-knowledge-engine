"use client";

import { motion } from 'framer-motion';
import { Database, MousePointer2, Search, Maximize2, Minimize2, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function KnowledgeExplorer() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    fetch('/graph_data.json')
      .then(res => res.json())
      .then(data => {
        // Assign random coordinates
        const colorMap: Record<string, string> = {
          'PROYECTO': 'bg-blue-500',
          'ZONA': 'bg-purple-500',
          'PARCELA': 'bg-amber-500',
          'INMUEBLE': 'bg-emerald-500'
        };
        const positionedNodes = data.nodes.map((n: any) => ({
          ...n,
          label: n.name,
          x: Math.random() * 800 + 100,
          y: Math.random() * 600 + 100,
          color: colorMap[n.type] || 'bg-gray-500'
        }));
        setNodes(positionedNodes);
        
        const mappedEdges = data.links.map((l: any) => ({
          source: l.source,
          target: l.target,
          label: l.type
        }));
        setEdges(mappedEdges);
      })
      .catch(console.error);
  }, []);

  
  return (
    <div className="flex flex-col h-full min-h-[800px] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Knowledge Explorer
          </h2>
          <p className="text-gray-400 text-sm mt-1">Interactive visualization of the knowledge graph.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search entities..." 
              className="pl-9 pr-4 py-2 bg-[#0F0F11] border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 border border-white/10 rounded-2xl bg-[#0F0F11] relative overflow-hidden flex">
        {/* Graph Area */}
        <div className="flex-1 relative bg-black/40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
          
          {/* Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shadow-lg">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shadow-lg">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shadow-lg mt-2">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge, i) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              const isHighlighted = selectedNode === edge.source || selectedNode === edge.target;
              
              return (
                <g key={i} className={`transition-all duration-300 ${isHighlighted ? 'opacity-100' : 'opacity-30'}`}>
                  <line 
                    x1={sourceNode.x} 
                    y1={sourceNode.y} 
                    x2={targetNode.x} 
                    y2={targetNode.y} 
                    stroke={isHighlighted ? "#60A5FA" : "#4B5563"} 
                    strokeWidth={isHighlighted ? 2 : 1}
                  />
                  {/* Label background */}
                  <rect 
                    x={(sourceNode.x + targetNode.x) / 2 - 45} 
                    y={(sourceNode.y + targetNode.y) / 2 - 10} 
                    width="90" 
                    height="20" 
                    fill="#0F0F11" 
                    rx="4"
                    stroke="#374151"
                  />
                  <text 
                    x={(sourceNode.x + targetNode.x) / 2} 
                    y={(sourceNode.y + targetNode.y) / 2 + 4} 
                    fill="#9CA3AF" 
                    fontSize="10" 
                    textAnchor="middle"
                    className="font-mono pointer-events-auto"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* DOM Nodes */}
          {nodes.map(node => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: parseInt(node.id) * 0.1 }}
              className="absolute group cursor-pointer z-10"
              style={{ left: node.x, top: node.y, x: '-50%', y: '-50%' }}
              onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
            >
              <div className={`
                flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 backdrop-blur-md shadow-xl transition-all duration-300
                ${selectedNode === node.id ? 'bg-white/10 ring-2 ring-white/20' : 'bg-black/60 hover:bg-white/5'}
                ${selectedNode && selectedNode !== node.id ? 'opacity-40' : 'opacity-100'}
              `}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner shadow-white/20 ${node.color}`}>
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white whitespace-nowrap">{node.label}</p>
                  <p className="text-[10px] text-gray-400 font-mono tracking-wider">{node.type}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar details */}
        {selectedNode && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl p-6 overflow-y-auto z-20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nodes.find(n => n.id === selectedNode)?.color}`}>
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">{nodes.find(n => n.id === selectedNode)?.label}</h3>
                <p className="text-xs text-gray-400 font-mono">{nodes.find(n => n.id === selectedNode)?.type}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Properties</h4>
                <div className="space-y-2 bg-white/5 border border-white/10 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">ID</span>
                    <span className="text-xs text-white font-mono">UUID-{selectedNode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Created</span>
                    <span className="text-xs text-white font-mono">2026-09-24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Confidence</span>
                    <span className="text-xs text-emerald-400 font-mono">1.0</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Relations</h4>
                <div className="space-y-2">
                  {edges.filter(e => e.source === selectedNode || e.target === selectedNode).map((e, i) => {
                    const isSource = e.source === selectedNode;
                    const otherNodeId = isSource ? e.target : e.source;
                    const otherNode = nodes.find(n => n.id === otherNodeId);
                    
                    return (
                      <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg flex flex-col gap-1">
                        <span className="text-xs text-gray-400 font-mono">{isSource ? '->' : '<-'} {e.label}</span>
                        <span className="text-sm text-white font-medium">{otherNode?.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {!selectedNode && (
          <div className="absolute top-6 right-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-start gap-3 max-w-xs backdrop-blur-md z-10">
            <MousePointer2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">Click on any node in the graph to view its properties and detailed relationships.</p>
          </div>
        )}
      </div>
    </div>
  );
}
