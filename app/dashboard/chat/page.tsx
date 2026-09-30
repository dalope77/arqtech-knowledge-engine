"use client";

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getThreads, createThread, getMessages, addMessage, Thread, Message } from '@/lib/chat/api';

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadThreads() {
    const data = await getThreads();
    setThreads(data);
    if (data.length > 0 && !activeThread) {
      setActiveThread(data[0]);
    }
  }

  async function handleNewThread() {
    const thread = await createThread();
    if (thread) {
      setThreads([thread, ...threads]);
      setActiveThread(thread);
      setMessages([]);
    }
  }

  async function loadMessages(threadId: string) {
    const data = await getMessages(threadId);
    setMessages(data);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !activeThread || isProcessing) return;

    const userText = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // 1. Add User Message
    const userMsg = await addMessage(activeThread.id, 'user', userText);
    if (userMsg) {
      setMessages(prev => [...prev, userMsg]);
    }

    // 2. Call the Orchestrator API (to be implemented next)
    try {
      const res = await fetch('/api/chat/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread.id, text: userText })
      });
      if (res.ok) {
        // Reload messages to get the orchestrator/agent responses
        await loadMessages(activeThread.id);
      }
    } catch (err) {
      console.error("Orchestrator error:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full text-white bg-black">
      
      {/* Sidebar - Threads */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-[#0A0A0C]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Conversaciones</h2>
          <button 
            onClick={handleNewThread}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            title="Nueva Conversación"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {threads.map(t => (
            <div 
              key={t.id} 
              onClick={() => setActiveThread(t)}
              className={`p-3 rounded-xl cursor-pointer transition-colors border ${activeThread?.id === t.id ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'}`}
            >
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-xs opacity-50 mt-1">{new Date(t.updated_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#050505]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Escribe un mensaje para comenzar la orquestación...
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : m.role === 'system'
                    ? 'bg-purple-900/30 border border-purple-500/30 text-purple-200'
                    : m.agent_id
                      ? 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'
                      : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}>
                {m.agent_id && (
                  <div className="text-xs font-bold mb-1 opacity-70 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    {m.agent_id}
                  </div>
                )}
                <div className="text-sm leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown>{m.content || ''}</ReactMarkdown>
                </div>
                {m.metadata?.wfs_data_used && (
                  <div className="mt-3 text-xs bg-black/40 p-2 rounded-lg text-green-400 border border-green-500/20 font-mono">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                      Validado con WFS en tiempo real
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-5 py-4 rounded-bl-none flex items-center gap-3 border border-gray-700">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-400 font-medium">Orquestando agentes...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0A0A0C] border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center max-w-5xl mx-auto">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={!activeThread || isProcessing}
              placeholder={activeThread ? "Escribe tu consulta urbana o financiera..." : "Selecciona o crea una conversación"}
              className="w-full bg-[#1A1A24] text-white rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-white/5 disabled:opacity-50 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-600">
            Los agentes colaboran para extraer normativas WFS, evaluar mercado y curar el Grafo de Conocimiento.
          </div>
        </div>
      </div>
    </div>
  );
}
