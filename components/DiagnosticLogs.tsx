
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { logService, LogEntry, MAX_LOGS } from '@/services/logService';
import { 
  Terminal, 
  Trash2, 
  X, 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Search
} from 'lucide-react';

const DiagnosticLogs: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>(logService.getLogs());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleUpdate = () => {
      setLogs([...logService.getLogs()]);
    };

    window.addEventListener('jarviss_log_added', handleUpdate);
    window.addEventListener('jarviss_logs_cleared', handleUpdate);
    
    return () => {
      window.removeEventListener('jarviss_log_added', handleUpdate);
      window.removeEventListener('jarviss_logs_cleared', handleUpdate);
    };
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="h-4 w-4 text-blue-400" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      default: return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const downloadLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `jarviss_logs_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Terminal className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Journal Diagnostic Jarviss</h2>
              <p className="text-xs text-gray-400">Suivi des événements et erreurs en temps réel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadLogs}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Télécharger les logs"
            >
              <Download className="h-5 w-5" />
            </button>
            <button 
              onClick={() => {
                if (confirm('Effacer tous les logs ?')) logService.clearLogs();
              }}
              className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              title="Effacer le journal"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-gray-900/30 border-b border-gray-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
            <span>{filteredLogs.length} entrées</span>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-500 italic">
              <Terminal className="h-10 w-10 mb-2 opacity-20" />
              <p>Aucun log trouvé</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div 
                key={log.id} 
                className={`border rounded-lg overflow-hidden transition-colors ${
                  expandedId === log.id ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-900/40 border-gray-800 hover:bg-gray-800/30'
                }`}
              >
                <div 
                  className="p-3 flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="mt-0.5">{getLevelIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-indigo-400 font-bold uppercase text-[10px]">
                        {log.source}
                      </span>
                    </div>
                    <p className={`truncate ${expandedId === log.id ? 'whitespace-normal text-gray-200' : 'text-gray-400'}`}>
                      {log.message}
                    </p>
                  </div>
                  <div>
                    {expandedId === log.id ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === log.id && log.details && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-gray-700"
                    >
                      <div className="p-3 bg-black/40 overflow-x-auto">
                        <pre className="text-indigo-300 whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-900 border-t border-gray-800 text-[10px] text-gray-500 flex justify-between">
          <span>Persisté dans LocalStorage</span>
          <span>Max {MAX_LOGS} entrées</span>
        </div>
      </motion.div>
    </div>
  );
};

export default DiagnosticLogs;
