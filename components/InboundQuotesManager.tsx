import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MailIcon, 
  SearchIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  XIcon, 
  SparklesIcon,
  CogIcon,
  UploadIcon,
  PlusIcon,
  MicIcon,
  MicOffIcon,
  SendIcon,
  Loader2Icon,
  MessageSquareIcon,
  CheckIcon,
  AlertCircleIcon,
  FileIcon,
  ChevronRightIcon,
  ShieldCheckIcon
} from './icons';
import type { InboundRequest, Quote, Client, Part, Material, Operation } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { logService } from '@/services/logService';

interface InboundQuotesManagerProps {
  inboundRequests: InboundRequest[];
  clients: Client[];
  parts: Part[];
  materials: Material[];
  operations: Operation[];
  onDeleteRequest: (id: string) => void;
  onUpdateRequest: (id: string, updates: Partial<InboundRequest>) => void;
  onAddRequest: (request: Omit<InboundRequest, 'id'>) => void;
  onAddQuote: (quote: Omit<Quote, 'id' | 'quoteNumber'>) => void;
}

export const InboundQuotesManager: React.FC<InboundQuotesManagerProps> = ({
  inboundRequests,
  onDeleteRequest,
  onUpdateRequest,
  onAddRequest,
  onAddQuote
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Modal State
  const [newRequestText, setNewRequestText] = useState('');
  const [newRequestFiles, setNewRequestFiles] = useState<File[]>([]);
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [isProcessingNew, setIsProcessingNew] = useState(false);

  // Chat/Vocal State
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionModule = (window as unknown as { SpeechRecognition: typeof SpeechRecognition }).SpeechRecognition || 
                                   (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognitionModule) {
      recognitionRef.current = new SpeechRecognitionModule();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'fr-FR';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setNewRequestText(prev => prev + ' ' + transcript);
          setIsListening(false);
        };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setRecognitionError(event.error);
        if (event.error === 'not-allowed') {
          alert('Accès au micro refusé. Veuillez autoriser l\'utilisation du microphone dans les paramètres de votre navigateur.');
        }
        setIsListening(false);
      };
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListening = () => {
    setRecognitionError(null);
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const filteredRequests = (inboundRequests || []).filter(r => 
    r.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.body.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedRequest = (inboundRequests || []).find(r => r.id === selectedRequestId);

  const handleCreateRequest = async () => {
    if (!newRequestText.trim() && newRequestFiles.length === 0) return;
    setIsProcessingNew(true);

    try {
      const attachments = await Promise.all(newRequestFiles.map(async file => {
        return {
          name: file.name,
          type: file.type,
          data: await fileToToBase64(file)
        };
      }));

      const newRequest: Omit<InboundRequest, 'id'> = {
        from: 'Utilisateur',
        subject: newRequestText.slice(0, 50) + (newRequestText.length > 50 ? '...' : ''),
        body: newRequestText,
        date: new Date().toISOString(),
        attachments: attachments,
        isProcessed: false,
        thread: []
      };

      onAddRequest(newRequest);
      setNewRequestText('');
      setNewRequestFiles([]);
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error creating request:", error);
    } finally {
      setIsProcessingNew(false);
    }
  };

  const fileToToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleBatchDelete = () => {
    if (confirm(`Supprimer ${selectedRequestIds.length} demandes ?`)) {
      selectedRequestIds.forEach(id => onDeleteRequest(id));
      setSelectedRequestIds([]);
    }
  };

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchAnalyze = async () => {
    setIsProcessingNew(true);
    for (const id of selectedRequestIds) {
      await handleAnalyzeRequest(id);
    }
    setIsProcessingNew(false);
    setSelectedRequestIds([]);
  };

  const handleCreateQuote = () => {
    if (!selectedRequest || !selectedRequest.analysis) return;
    
    onAddQuote({
      clientId: selectedRequest.analysis.suggestedItems.length > 0 ? '' : '', // Should ideally pick a client
      clientName: 'Client à définir',
      date: new Date().toISOString(),
      status: 'Draft',
      items: selectedRequest.analysis.suggestedItems.map(item => ({
        id: Math.random().toString(36).slice(2, 9),
        name: item.name,
        quantity: item.quantity,
        unitPrice: 0,
        type: 'part',
        isAiGenerated: true,
        aiStatus: 'Pending'
      })),
      totalAmount: 0,
      notes: `Généré à partir de la demande AI Inbound. ${selectedRequest.body}`
    });
    
    onUpdateRequest(selectedRequest.id, { isProcessed: true });
    alert("Soumission créée avec succès en tant que brouillon.");
  };

  const cleanAndParseJson = (text: string) => {
    try {
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        throw new Error("Invalid JSON format");
      }
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("Standard parse failed, trying recovery...", e);
      let cleaned = text.trim();
      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const lastIndex = Math.max(lastBrace, lastBracket);
      if (lastIndex !== -1) {
        cleaned = cleaned.substring(0, lastIndex + 1);
        try {
          return JSON.parse(cleaned);
        } catch (innerError) {
          console.error("Recovery failed:", innerError);
          throw e;
        }
      }
      throw e;
    }
  };

  const handleAnalyzeRequest = async (requestId: string) => {
    const request = (inboundRequests || []).find(r => r.id === requestId);
    if (!request) return;

    onUpdateRequest(requestId, { isProcessed: false }); // Show loading state
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      logService.addLog({
        level: 'info',
        source: 'InboundQuotes',
        message: `Analyse AI entrante: ${request.subject}`,
        details: { requestId: request.id }
      });
      
      const prompt = `Analyze this manufacturing request (Demande).
      TEXT: ${request.body}
      FILES: {(request.attachments || []).map(a => a.name).join(', ')}
      
      Tasks:
      1. Detect missing files. Always need a PDF. NEED DXF if you see "pliage/bending". NEED STEP if you see "usinage/machining".
      2. Detect operations mentioned.
      3. Extract items/parts with quantities.
      Important: Be concise and avoid long text fields that could truncate the JSON response.`;

      let response;
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  missingFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detectedOperations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestedItems: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        quantity: { type: Type.NUMBER }
                      },
                      required: ["name", "quantity"]
                    }
                  }
                },
                required: ["missingFiles", "detectedOperations", "suggestedItems"]
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

      if (!response || !response.text) throw new Error("No response from AI");
      const analysis = cleanAndParseJson(response.text);
      
      logService.addLog({
        level: 'success',
        source: 'InboundQuotes',
        message: `Analyse réussie pour ${request.subject}`,
        details: { analysis }
      });

      onUpdateRequest(requestId, { analysis });
    } catch (error) {
      console.error("AI Analysis Error:", error);
      const errorStr = error instanceof Error ? error.message : String(error);
      
      logService.addLog({
        level: 'error',
        source: 'InboundQuotes',
        message: `Erreur analyse AI: ${request.subject}`,
        details: { error: errorStr }
      });

      if (errorStr.toLowerCase().includes("spending cap") || errorStr.toLowerCase().includes("budget")) {
        alert("Attention Karl: Le plafond de dépenses mensuel de votre projet AI Studio a été atteint. Veuillez le gérer sur https://ai.studio/spend.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="bg-fmi-red p-2 rounded-xl shadow-lg shadow-red-100">
            <MailIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Inbound</h1>
            <p className="text-xs text-slate-500 font-medium">Gestion intelligente des demandes de soumission</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Rechercher une demande..."
              className="pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none w-64 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 bg-fmi-red hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-red-100 transition-all active:scale-95"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvelle Demande
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Request List */}
        <div className="w-full max-w-lg border-r border-slate-200 bg-white flex flex-col">
          {selectedRequestIds.length > 0 && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">{selectedRequestIds.length} sélectionné(s)</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleBatchAnalyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Analyser
                </button>
                <button 
                  onClick={handleBatchDelete}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {filteredRequests.map(r => (
              <div 
                key={r.id}
                onClick={() => setSelectedRequestId(r.id)}
                className={`group p-4 rounded-2xl transition-all cursor-pointer border ${
                  selectedRequestId === r.id 
                    ? 'bg-blue-50 border-blue-200 shadow-md translate-x-1' 
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleRequestSelection(r.id); }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      selectedRequestIds.includes(r.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selectedRequestIds.includes(r.id) && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(r.date).toLocaleDateString()}</p>
                      {r.analysis && (
                        <div className="flex gap-1">
                          {r.analysis.missingFiles.length > 0 ? (
                            <AlertCircleIcon className="w-3.5 h-3.5 text-orange-500" />
                          ) : (
                            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 truncate">{r.subject || 'Sans sujet'}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{r.body}</p>
                    <div className="flex gap-2 mt-2">
                       {r.attachments.length > 0 && (
                         <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-bold text-slate-500">
                           <FileIcon className="w-3 h-3" />
                           {r.attachments.length}
                         </div>
                       )}
                       {r.isProcessed && (
                         <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold uppercase">Traité</span>
                       )}
                    </div>
                  </div>
                  <ChevronRightIcon className={`w-5 h-5 text-slate-300 transition-transform ${selectedRequestId === r.id ? 'translate-x-1 text-blue-400' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail / Workspace */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
          {selectedRequest ? (
            <div className="flex flex-col h-full bg-white ml-2 rounded-tl-3xl shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedRequest.subject}</h2>
                  <p className="text-xs text-slate-400 font-medium">Reçu le {new Date(selectedRequest.date).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                   {!selectedRequest.analysis && (
                     <button 
                       onClick={() => handleAnalyzeRequest(selectedRequest.id)}
                       className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                     >
                       <SparklesIcon className="w-4 h-4" />
                       Analyser
                     </button>
                   )}
                   <button 
                     onClick={() => onDeleteRequest(selectedRequest.id)}
                     className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                   >
                     <TrashIcon className="w-5 h-5" />
                   </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex h-full">
                  {/* Left Column: Analysis & Context */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 border-r border-slate-50">
                    {selectedRequest.analysis ? (
                      <div className="space-y-8">
                        {/* Missing Files Check */}
                        <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                           <div className="flex items-center gap-2 mb-4">
                             <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                             <h3 className="font-bold text-slate-800">Évaluation des Documents</h3>
                           </div>
                           <div className="space-y-2">
                             <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                               <span className="text-sm font-medium">Format PDF (Mandatoire)</span>
                               {selectedRequest.attachments.some(a => a.name.toLowerCase().endsWith('.pdf')) ? (
                                 <CheckIcon className="w-5 h-5 text-green-500" />
                               ) : (
                                 <XIcon className="w-5 h-5 text-red-500" />
                               )}
                             </div>
                             {selectedRequest.analysis.detectedOperations.some(op => op.toLowerCase().includes('pli')) && (
                               <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                                 <span className="text-sm font-medium">Format DXF (Pliage détecté)</span>
                                 {selectedRequest.attachments.some(a => a.name.toLowerCase().endsWith('.dxf')) ? (
                                   <CheckIcon className="w-5 h-5 text-green-500" />
                                 ) : (
                                   <XIcon className="w-5 h-5 text-red-500" />
                                 )}
                               </div>
                             )}
                             {selectedRequest.analysis.detectedOperations.some(op => op.toLowerCase().includes('usin')) && (
                               <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                                 <span className="text-sm font-medium">Format STEP (Usinage détecté)</span>
                                 {selectedRequest.attachments.some(a => a.name.toLowerCase().endsWith('.step') || a.name.toLowerCase().endsWith('.stp')) ? (
                                   <CheckIcon className="w-5 h-5 text-green-500" />
                                 ) : (
                                   <XIcon className="w-5 h-5 text-red-500" />
                                 )}
                               </div>
                             )}
                           </div>
                           
                           {(selectedRequest.analysis.missingFiles || []).length > 0 && (
                             <div className="mt-4 p-3 bg-white  rounded-xl border-2 border-orange-100 flex items-start gap-3">
                                <AlertCircleIcon className="w-5 h-5 text-orange-500" />
                                <div className="text-xs">
                                  <p className="font-bold text-orange-700">Documents manquants:</p>
                                  <p className="text-slate-600">{(selectedRequest.analysis.missingFiles || []).join(', ')}</p>
                                </div>
                             </div>
                           )}
                        </div>

                        {/* Items & Ops */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Opérations Détectées</h4>
                             <div className="flex flex-wrap gap-2">
                               {(selectedRequest.analysis.detectedOperations || []).map(op => (
                                 <span key={op} className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1">
                                   <CogIcon className="w-3 h-3 text-blue-500" />
                                   {op}
                                 </span>
                               ))}
                             </div>
                           </div>
                           <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Items Identifiés</h4>
                             <div className="space-y-2">
                               {(selectedRequest.analysis.suggestedItems || []).map((item, idx) => (
                                 <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                   <span className="text-xs font-medium text-slate-700">{item.name}</span>
                                   <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">x{item.quantity}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                        </div>

                        {/* Attachments list with preview-style */}
                        <div className="space-y-3">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fichiers Joints</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {(selectedRequest.attachments || []).map((att, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors group shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs">
                                      {att.name.split('.').pop()?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                                      <p className="text-[10px] text-slate-400">{att.type}</p>
                                    </div>
                                  </div>
                                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-600 transition-all">
                                    <PlusIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                          <button 
                            onClick={handleCreateQuote}
                            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                             <CheckCircleIcon className="w-5 h-5" />
                             Créer et Lier à une Soumission
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-6">
                          <MessageSquareIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Contenu de la Demande</h3>
                        <div className="max-w-md bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-slate-600 text-sm whitespace-pre-wrap text-left">
                          {selectedRequest.body}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Chat/Contextual Conversation */}
                  <div className="w-80 border-l border-slate-50 flex flex-col bg-slate-50/20">
                     <div className="p-4 border-b border-slate-50 bg-white shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <SparklesIcon className="w-3.5 h-3.5 text-blue-500" />
                          Assistant Contextuel
                        </h3>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Thread messages will go here */}
                        <div className="bg-blue-50 p-3 rounded-2xl rounded-tl-none text-xs text-blue-700 leading-relaxed">
                          Bonjour! Je suis prêt à vous aider avec cette demande. J'ai accès au contenu de l'email et aux fichiers joints pour répondre à vos questions.
                        </div>
                        {selectedRequest.analysis && selectedRequest.analysis.missingFiles.length > 0 && (
                          <div className="bg-orange-50 p-3 rounded-2xl rounded-tl-none text-xs text-orange-700 leading-relaxed">
                            ⚠️ Note: Il manque certains fichiers critiques pour un devis complet ({selectedRequest.analysis.missingFiles.join(', ')}). Voulez-vous que je rédige un email de suivi pour le client?
                          </div>
                        )}
                     </div>
                     <div className="p-4 bg-white border-t border-slate-50">
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Discuter de la demande..."
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                          />
                          <button className="absolute right-2 top-1.2 p-1.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors">
                            <SendIcon className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-slate-100">
                 <MailIcon className="w-12 h-12 opacity-10" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 mb-2">Sélectionnez une demande</h2>
               <p className="max-w-xs mx-auto mb-8 font-medium">L'IA vous aidera à analyser les documents et extraire les informations pour la soumission.</p>
               <button 
                  onClick={() => setIsAddingNew(true)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 group"
               >
                 <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                 Créer une nouvelle demande
               </button>
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      <AnimatePresence>
        {isAddingNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessingNew && setIsAddingNew(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden shadow-blue-200/50"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-4">
                     <div className="bg-blue-100 p-3 rounded-2xl">
                       <SparklesIcon className="w-6 h-6 text-blue-600" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-extrabold text-slate-900">Nouvelle Demande</h2>
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Assistant Intelligent Inbound</p>
                     </div>
                   </div>
                   <button 
                    onClick={() => setIsAddingNew(false)}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                   >
                     <XIcon className="w-6 h-6" />
                   </button>
                </div>

                <div className="space-y-6">
                  {/* Vocal & Text Input */}
                  <div className="relative group">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2 block">
                      Description de la demande
                    </label>
                    <textarea 
                      value={newRequestText}
                      onChange={(e) => setNewRequestText(e.target.value)}
                      placeholder="Collez le texte du mail ici ou décrivez la demande..."
                      className="w-full h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-sm focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 transition-all outline-none resize-none shadow-inner"
                    />
                    {recognitionError && (
                      <div className="absolute top-12 left-4 right-4 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold border border-red-100 animate-in slide-in-from-top-2">
                        Erreur micro : {recognitionError}. Assurez-vous d'avoir autorisé l'accès au microphone.
                      </div>
                    )}
                    <div className="absolute right-4 bottom-4 flex gap-2">
                       <button 
                         onClick={() => {
                           // Trigger global event or just let user use the floating one
                           const event = new CustomEvent('openGeminiLive', { detail: { instruction: "Aide l'utilisateur à créer une nouvelle demande de fabrication. Analyse ce qu'il dit pour remplir les informations." } });
                           window.dispatchEvent(event);
                         }}
                         title="Assistant Gemini Live (Bidirectionnel)"
                         className="p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all border border-blue-500"
                       >
                         <SparklesIcon className="w-5 h-5" />
                       </button>
                       <button 
                         onClick={toggleListening}
                         title="Utiliser la reconnaissance vocale simple"
                         className={`p-3 rounded-2xl transition-all shadow-sm border ${
                            isListening 
                              ? 'bg-red-500 text-white animate-pulse border-red-400' 
                              : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-100'
                         }`}
                       >
                         {isListening ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                       </button>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2 block">
                      Documents et fichiers joints
                    </label>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingModal(true); }}
                      onDragLeave={() => setIsDraggingModal(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingModal(false);
                        setNewRequestFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                      }}
                      className={`relative p-8 border-3 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center text-center group/drop ${
                        isDraggingModal 
                          ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="file" 
                        multiple 
                        onChange={(e) => e.target.files && setNewRequestFiles(prev => [...prev, ...Array.from(e.target.files!)])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 transition-all shadow-sm border border-slate-100 ${isDraggingModal ? 'scale-110 rotate-12 bg-blue-50 border-blue-200' : 'group-hover/drop:scale-105 group-hover/drop:rotate-6'}`}>
                        <UploadIcon className={`w-7 h-7 ${isDraggingModal ? 'text-blue-500' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Glissez vos fichiers ou cliquez ici</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PDF, DXF, STEP, STEP, PNG...</p>
                      
                      {newRequestFiles.length > 0 && (
                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg mx-auto overflow-hidden">
                           {newRequestFiles.map((f, i) => (
                             <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-blue-100 text-[10px] font-bold text-slate-700 shadow-sm animate-in zoom-in group/item truncate">
                               <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                               <span className="truncate flex-1">{f.name}</span>
                               <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setNewRequestFiles(prev => prev.filter((_, idx) => idx !== i)); 
                                }} 
                                className="text-slate-300 hover:text-red-500 transition-colors"
                               >
                                 <XIcon className="w-4 h-4" />
                               </button>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button 
                    disabled={isProcessingNew}
                    onClick={() => setIsAddingNew(false)}
                    className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-3xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    disabled={isProcessingNew || (!newRequestText.trim() && newRequestFiles.length === 0)}
                    onClick={handleCreateRequest}
                    className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-3xl shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessingNew ? (
                      <>
                        <Loader2Icon className="w-5 h-5 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Créer la Demande
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
