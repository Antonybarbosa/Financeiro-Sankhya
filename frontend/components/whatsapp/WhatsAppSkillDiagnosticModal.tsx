'use client';

import { useState } from 'react';
import { useWhatsAppTestStore, WhatsAppLogEntry } from '@/store/whatsappTestStore';
import { whatsappBridge } from '@/lib/whatsappBridge';
import {
  Activity,
  Terminal,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  UserCheck,
  Search,
  Type,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';

interface WhatsAppSkillDiagnosticModalProps {
  open: boolean;
  onClose: () => void;
  iframeRef?: HTMLIFrameElement | null;
}

export function WhatsAppSkillDiagnosticModal({
  open,
  onClose,
  iframeRef,
}: WhatsAppSkillDiagnosticModalProps) {
  const { logs, clearLogs, extensionReady, lastHeartbeat, activeChat } = useWhatsAppTestStore();

  const [testPhone, setTestPhone] = useState('11999998888');
  const [testMessage, setTestMessage] = useState('Teste de automação da Skill WhatsApp Web');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  if (!open) return null;

  const runTest = async (action: string, payload?: any) => {
    setRunningAction(action);
    setLastResult(null);

    try {
      const res = await whatsappBridge.sendCommandAsync({ action, payload }, iframeRef);
      setLastResult({ success: true, action, data: res });
    } catch (err: any) {
      setLastResult({ success: false, action, error: err.message });
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Console de Testes & Diagnóstico da Skill WhatsApp
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full">
                  Manifest V3
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Teste passo a passo da comunicação e injeção semântica no DOM do WhatsApp Web
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-800 text-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0 border-b border-gray-700">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Extensão:</span>
              {extensionReady ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pronta
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Não detectada
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">Chat Ativo:</span>
              <span className="font-mono text-emerald-300 font-semibold">
                {activeChat || 'Nenhum'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">Último Heartbeat:</span>
              <span className="font-mono text-gray-300">
                {lastHeartbeat || 'Aguardando...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearLogs}
              className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1 rounded text-xs transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Limpar Logs
            </button>
          </div>
        </div>

        {/* Content Body (Grid 2 colunas) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-gray-50">
          {/* Coluna Esquerda: Ações de Teste (5 colunas) */}
          <div className="md:col-span-5 p-5 border-r border-gray-200 overflow-y-auto space-y-4 bg-white">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-emerald-600" />
                Habilidades Semânticas (Executar Teste)
              </h3>

              <div className="space-y-2">
                {/* 1. Status */}
                <button
                  type="button"
                  disabled={runningAction !== null}
                  onClick={() => runTest('status')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left text-xs font-semibold text-gray-800 group"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-bold">1. Testar Status da Sessão</p>
                      <p className="text-[11px] text-gray-500 font-normal">Verifica se o WhatsApp Web está conectado</p>
                    </div>
                  </div>
                  {runningAction === 'status' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* 2. Get Current Chat */}
                <button
                  type="button"
                  disabled={runningAction !== null}
                  onClick={() => runTest('get_current_chat')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left text-xs font-semibold text-gray-800 group"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-bold">2. Testar Conversa Atual</p>
                      <p className="text-[11px] text-gray-500 font-normal">Lê o nome e número no header do chat</p>
                    </div>
                  </div>
                  {runningAction === 'get_current_chat' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>
              </div>
            </div>

            {/* Inputs para Testes Dinâmicos */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Parâmetros para Teste de Envio
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Telefone / Nome para Busca:
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ex: 11999998888 ou Nome"
                  className="w-full text-xs font-mono px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Mensagem de Teste:
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                {/* 3. Find Contact */}
                <button
                  type="button"
                  disabled={runningAction !== null || !testPhone.trim()}
                  onClick={() => runTest('find_contact', { contact: testPhone })}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left text-xs font-semibold text-gray-800 group"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="font-bold">3. Testar Busca de Contato</p>
                      <p className="text-[11px] text-gray-500 font-normal">Foca barra de pesquisa e localiza o contato</p>
                    </div>
                  </div>
                  {runningAction === 'find_contact' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* 4. Type Message */}
                <button
                  type="button"
                  disabled={runningAction !== null || !testMessage.trim()}
                  onClick={() => runTest('type_message', { message: testMessage })}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all text-left text-xs font-semibold text-gray-800 group"
                >
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-bold">4. Testar Digitação sem Enviar</p>
                      <p className="text-[11px] text-gray-500 font-normal">Injeta o texto no chat aberto para conferência</p>
                    </div>
                  </div>
                  {runningAction === 'type_message' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* 5. Open & Send (Fluxo Completo) */}
                <button
                  type="button"
                  disabled={runningAction !== null || !testPhone.trim() || !testMessage.trim()}
                  onClick={() => runTest('open_chat', { phone: testPhone, message: testMessage })}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all text-left text-xs font-bold group"
                >
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-white" />
                    <div>
                      <p className="text-white">5. Testar Fluxo Completo (Abrir & Enviar)</p>
                      <p className="text-[11px] text-emerald-100 font-normal">Busca contato, abre chat e envia a mensagem</p>
                    </div>
                  </div>
                  {runningAction === 'open_chat' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>
              </div>
            </div>

            {/* Resultado do Último Teste */}
            {lastResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  lastResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {lastResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>
                    Resultado de `{lastResult.action}`:{' '}
                    {lastResult.success ? 'Sucesso' : 'Falha'}
                  </span>
                </div>
                <pre className="font-mono text-[10px] overflow-x-auto p-2 bg-white/70 rounded border border-black/5 mt-1 max-h-24">
                  {JSON.stringify(lastResult.data || lastResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Coluna Direita: Terminal de Logs em Tempo Real (7 colunas) */}
          <div className="md:col-span-7 flex flex-col h-full bg-gray-950 text-gray-300 font-mono text-xs overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 text-[11px] font-bold text-gray-400 border-b border-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                Terminal de Mensageria (Protocolo JSON)
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                {logs.length} eventos registrados
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 py-12">
                  <Terminal className="h-8 w-8 text-gray-700 mb-2" />
                  <p>Nenhum evento registrado ainda.</p>
                  <p className="text-[10px] text-gray-500">Execute um dos testes ao lado para ver o tráfego do protocolo.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-md bg-gray-900/80 border border-gray-800 text-[11px] space-y-1 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {log.direction === 'OUT' ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-bold">
                            ▲ OUT
                          </span>
                        ) : log.direction === 'IN' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                            ▼ IN
                          </span>
                        ) : log.direction === 'EVENT' ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold">
                            ● EVENT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                            ✕ SYS
                          </span>
                        )}

                        <span className="font-bold text-gray-100">{log.action || log.type}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        {log.durationMs !== undefined && (
                          <span className="text-amber-400 font-semibold">{log.durationMs}ms</span>
                        )}
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    {/* Payload / Data */}
                    {(log.payload || log.data || log.error) && (
                      <pre className="text-[10px] text-gray-300 bg-black/40 p-2 rounded overflow-x-auto border border-gray-800/80 max-h-32">
                        {JSON.stringify(log.error || log.data || log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
