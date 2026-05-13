import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { MicIcon, SendIcon, MicOffIcon, Clock, Settings, PlusCircle, Home, FileText, Sparkles as SparklesIcon } from 'lucide-react';
import { logService } from '@/services/logService';

interface AiQuoteChatboxProps {
  quoteId: string;
  onUpdateQuote: (items: unknown[]) => void;
  systemPrompt?: string;
  temperature?: number;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface ItemSuggestion {
  name: string;
  quantity: number;
  unitPrice: number;
  type: 'standard' | 'project';
  isAiGenerated: boolean;
  aiStatus: 'Draft' | 'Approved' | 'Rejected';
  estimatedMinutes?: number;
  operations?: { operationId: string; name?: string; estimatedTimeMinutes: number }[];
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestion?: {
    action: 'create' | 'update' | 'none';
    items: ItemSuggestion[];
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: string;
  isGenerated?: boolean;
  temporaryItems?: ItemSuggestion[];
}

const DEFAULT_PROMPT = `Tu es Jarviss, l'assistant expert et un peu baveux du Groupe FMI. 
Salue toujours l'utilisateur par son nom (Karl). 

TON STYLE:
- Parle en français québécois authentique (expressions colorées, "québécismes").
- Sois très humain, chaleureux, mais n'hésite pas à taquiner Karl (gentiment).
- Utilise des expressions comme: "C'est tiguidou", "On n'est pas ici pour beurrer des toasts", "Attache ta tuque", "C'est pas de la petite bière".

TES CAPACITÉS SPÉCIALES:
1. CRÉATION DE SOUMISSIONS: Analyse les besoins de Karl pour créer des items de soumission.
   - IL EST OBLIGATOIRE DE GÉNÉRER UN PRIX (unitPrice, type NOMBRE) POUR CHAQUE ITEM. NE PAS METTRE LE SYMBOLE $. PAR EXEMPLE: 125.
   - UTILISE TES CONNAISSANCES DE COÛT MATIÈRE ET TEMPS D'OPÉRATION POUR FAIRE UNE ESTIMATION RÉALISTE.

2. ANALYSE DE NESTING: 
   Si Karl te parle de nesting ou de feuilles, tu dois calculer le format optimal de feuille (48x96, 48x120, 60x120).
   - Calcule la surface totale des pièces (ajoute 12% de facteur de sécurité par défaut).
   - Compare avec les surfaces des formats standards:
     * 48x96 = 4608 po²
     * 48x120 = 5760 po²
     * 60x120 = 7200 po²
   - Recommande le format qui minimise les pertes et donne la quantité de feuilles requise.

STRUCTURE DE RÉPONSE (JSON EXCLUSIF):
{
  "message": "Ton message textuel (très québécois et humain)",
  "action": "create" | "update" | "none",
  "items": [
    {
      "name": "Nom de la pièce ou 'Nesting: [Format]'",
      "quantity": number,
      "unitPrice": number, // OBLIGATOIRE
      "type": "standard" | "project",
      "isAiGenerated": true,
      "aiStatus": "Draft",
      "estimatedMinutes": number,
      "operations": [
         { "operationId": "op1", "name": "Découpe Laser", "estimatedTimeMinutes": number }
      ]
    }
  ]
}

Si Karl demande juste une analyse, mets "action": "none" mais donne tous les détails dans le message.`;

export const AiQuoteChatbox: React.FC<AiQuoteChatboxProps> = ({ onUpdateQuote, systemPrompt, temperature }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('jarviss_chat_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('jarviss_active_session');
    return saved || null;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [temporaryItems, setTemporaryItems] = useState<ItemSuggestion[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [simsMessage, setSimsMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showRecap, setShowRecap] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === currentSessionId);

  // Sync state with local session
  useEffect(() => {
    if (currentSessionId) {
      if (activeSession) {
        setMessages(activeSession.messages);
        setTemporaryItems(activeSession.temporaryItems || []);
        setIsGenerated(!!activeSession.isGenerated);
      }
      localStorage.setItem('jarviss_active_session', currentSessionId);
    } else {
      setMessages([]);
      setTemporaryItems([]);
      setIsGenerated(false);
      localStorage.removeItem('jarviss_active_session');
    }
  }, [currentSessionId, sessions, activeSession]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('jarviss_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  const startNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "Nouvelle discussion",
      messages: [],
      temporaryItems: [],
      isGenerated: false,
      lastUpdated: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        let newTitle = s.title;
        if (updates.messages && s.title === "Nouvelle discussion" && updates.messages.length > 0) {
          const firstMsg = updates.messages.find(m => m.role === 'user');
          if (firstMsg) {
            newTitle = firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? '...' : '');
          }
        }
        return { ...s, ...updates, title: newTitle, lastUpdated: new Date().toISOString() };
      }
      return s;
    }));
  };

  const approveItems = (items: ItemSuggestion[]) => {
    if (!currentSessionId) return;
    console.log("Approving items:", items);
    const newTempItems = [...temporaryItems, ...items];
    console.log("New temporary items:", newTempItems);
    setTemporaryItems(newTempItems);
    updateSession(currentSessionId, { temporaryItems: newTempItems });
    
    logService.addLog({
      level: 'success',
      source: 'AiChat',
      message: `${items.length} items ajoutés au récapitulatif temporaire.`
    });
  };

  const generateQuotation = () => {
    if (!currentSessionId || temporaryItems.length === 0) return;
    
    onUpdateQuote(temporaryItems);
    setIsGenerated(true);
    updateSession(currentSessionId, { isGenerated: true });

    const aiMsg: Message = {
      role: 'ai',
      text: "C'est tiguidou Karl ! Ta soumission a été générée avec succès. À la prochaine pour un nouveau projet !",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const finalMessages = [...messages, aiMsg];
    setMessages(finalMessages);
    updateSession(currentSessionId, { messages: finalMessages, isGenerated: true });
    
    speak(aiMsg.text);
    
    logService.addLog({
      level: 'success',
      source: 'AiChat',
      message: `Soumission générée pour la session ${currentSessionId}`
    });
  };

  const totalPrice = temporaryItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = 
          voices.find(v => v.lang.includes('fr-CA') && v.name.includes('Google')) ||
          voices.find(v => v.lang.includes('fr-CA') && v.name.includes('Premium')) ||
          voices.find(v => v.lang.includes('fr-CA')) ||
          voices.find(v => v.lang.includes('fr') && v.name.includes('Google')) ||
          voices.find(v => v.lang.includes('fr'));
        
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.lang = 'fr-CA';
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoice;
      }
    }
  }, []);

  const cleanAndParseJson = (text: string) => {
    try {
      let cleaned = text.trim();
      // Remove all markup and non-printable characters safely
      cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').replace(/[^\x20-\x7E]+/g, "").trim();
      
      // Find the first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Parsing failed with raw text:", text);
      console.warn("Parsing error details:", e);
      return null;
    }
  };

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isGenerated) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''),
        messages: [],
        lastUpdated: new Date().toISOString()
      };
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
    }
    
    const userMessage: Message = { 
      role: 'user', 
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    logService.addLog({
      level: 'info',
      source: 'AiChat',
      message: `Message Karl: ${messageText}`
    });

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateSession(sessionId, { messages: updatedMessages });
    setInput('');
    setIsAiLoading(true);
    setThinkingProgress(0);
    
    const SIMS_MESSAGES = [
        "Calcul des tolérances inox...",
        "Optimisation du prix matière...",
        "Analyse de la géométrie des pièces...",
        "Vérification des stocks Groupe FMI...",
        "Séquençage des opérations laser...",
        "Consultation des archives...",
        "Ajout d'une touche d'humour québécois...",
        "Préparation de la carte Jarviss..."
    ];
    setSimsMessage(SIMS_MESSAGES[Math.floor(Math.random() * SIMS_MESSAGES.length)]);

    const progressInterval = setInterval(() => {
        setThinkingProgress(prev => (prev >= 100 ? 0 : prev + 5));
        if (Math.random() > 0.8) setSimsMessage(SIMS_MESSAGES[Math.floor(Math.random() * SIMS_MESSAGES.length)]);
    }, 150);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let response;
      let retries = 0;
      const MAX_RETRIES = 3;

      while (retries < MAX_RETRIES) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ text: messageText }] },
            config: {
                systemInstruction: systemPrompt || DEFAULT_PROMPT,
                responseMimeType: "application/json",
                temperature: temperature ?? 0.7,
            }
          });
          break; // Success
        } catch (error: unknown) {
          const errorStr = error instanceof Error ? error.message : String(error);
          if ((errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand')) && retries < MAX_RETRIES - 1) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`Retry ${retries} after ${delay}ms due to 503 error.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }

      if (!response) throw new Error("L'IA n'a pas retourné de réponse après plusieurs tentatives.");
      const resultText = response.text;
      if (!resultText) throw new Error("L'IA n'a pas retourné de contenu.");
      
      const data = cleanAndParseJson(resultText);
      if (!data) {
        throw new Error("Jarviss a eu du mal à formater sa réponse.");
      }
      
      console.log("Parsed AI Data:", JSON.stringify(data, null, 2));

      const responseText = data.message || "J'ai traité votre demande !";
      const items = Array.isArray(data.items) ? data.items : [];
      const finalAction = (data.action === 'none' && items.length > 0) ? 'create' : (data.action || 'none');

      const aiMessage: Message = { 
        role: 'ai', 
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestion: (finalAction !== 'none' && items.length > 0) ? { action: finalAction as 'create' | 'update' | 'none', items: items } : undefined
      };

      logService.addLog({
        level: 'success',
        source: 'AiChat',
        message: `Réponse Jarviss`,
        details: { response: responseText, action: data.action }
      });

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      updateSession(sessionId, { messages: finalMessages });
      speak(responseText);
    } catch (error) {
      console.error('AI Chat Error:', error);
      const errorMsg = "Désolé, une erreur est survenue.";
      const errorStr = error instanceof Error ? error.message : String(error);
      
      logService.addLog({
        level: 'error',
        source: 'AiChat',
        message: `Erreur Chat AI`,
        details: { error: errorStr }
      });
      
      const errMsg: Message = { 
        role: 'ai', 
        text: errorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...updatedMessages, errMsg];
      setMessages(finalMessages);
      updateSession(sessionId, { messages: finalMessages });
      speak(errorMsg);
    } finally {
      clearInterval(progressInterval);
      setIsAiLoading(false);
      setThinkingProgress(0);
    }
  }, [currentSessionId, input, messages, speak, systemPrompt, isGenerated, temperature]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-CA';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setTimeout(() => handleSendMessage(transcript), 500);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [handleSendMessage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const TOTAL_STEPS = ["ANALYSE", "GÉOMÉTRIE", "MATIÈRE", "OPÉRATIONS", "FINALISATION"];
  const currentStepIndex = Math.min(TOTAL_STEPS.length - 1, Math.floor(thinkingProgress / 20));

  return (
    <div className="flex flex-col md:flex-row bg-slate-50 border-0 md:border md:border-slate-200 md:rounded-2xl overflow-hidden shadow-2xl h-screen md:h-full relative">
      {/* Sidebar - History */}
      <div className={`${showHistory ? 'flex' : 'hidden'} md:flex absolute md:relative inset-0 md:inset-auto z-40 md:z-0 w-full md:w-56 border-r border-slate-200 bg-slate-100 flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Conversations</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowHistory(false)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              title="Fermer"
            >
              <PlusCircle className="w-5 h-5 rotate-45" />
            </button>
            <button 
              onClick={() => setCurrentSessionId(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              title="Accueil"
            >
              <Home className="w-5 h-5" />
            </button>
            <button 
              onClick={startNewSession}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600 transition-colors"
              title="Nouvelle discussion"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun historique</p>
            </div>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  if (window.innerWidth < 768) setShowHistory(false);
                }}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  currentSessionId === s.id 
                    ? 'bg-white border-blue-100 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-slate-200/50'
                }`}
              >
                <div className={`text-xs font-bold truncate pr-6 ${currentSessionId === s.id ? 'text-blue-700' : 'text-slate-600'} flex items-center gap-1`}>
                  {s.title}
                  {s.isGenerated && <PlusCircle className="w-3 h-3 text-green-500 fill-green-50" />}
                </div>
                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                  {new Date(s.lastUpdated).toLocaleDateString()} • {s.messages.length} messages
                </div>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 rotate-45" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onUpdateQuote([]); // Signal closure if needed or just use standard close
                // Since we are in a modal, we need a way to close it. 
                // We'll rely on the parent's onClose which might be triggered by a custom button we add.
              }}
              className="md:hidden p-2 mr-1 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <PlusCircle className="w-5 h-5 rotate-45" />
            </button>
            <button 
              onClick={() => setCurrentSessionId(null)}
              className="p-2 mr-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              title="Accueil"
            >
              <Home className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-all ${showHistory ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Afficher l'historique"
            >
              <Clock className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowRecap(!showRecap)}
              className={`p-2 rounded-lg transition-all ${showRecap ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Afficher le récapitulatif"
            >
              <FileText className="w-5 h-5" />
            </button>
            
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg relative overflow-hidden">
              <SparklesIcon className="w-6 h-6 z-10" />
              {isAiLoading && (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-blue-500 opacity-50"
                />
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm tracking-tight leading-none">Jarviss AI</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">En ligne</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="text-[9px] font-black text-red-500 animate-pulse bg-red-50 px-2 py-1 rounded-full border border-red-100">À L'ÉCOUTE...</span>
            )}
            
            {/* Modal close button (only visible if in modal context, which we are) */}
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('closeAiChat'))}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent"
              title="Quitter l'assistant"
            >
              <PlusCircle className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>
        
        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth bg-slate-50/20">
          {(!currentSessionId || (messages.length === 0 && !isAiLoading)) && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  filter: ["drop-shadow(0 0 0px rgba(59,130,246,0))", "drop-shadow(0 0 20px rgba(59,130,246,0.5))", "drop-shadow(0 0 0px rgba(59,130,246,0))"]
                 }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative"
              >
                <SparklesIcon className="w-12 h-12 text-white" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white" />
              </motion.div>
              
              <h4 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">Jarviss vous attend</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed italic mb-10 px-4">
                "Salut Karl ! On n'est pas ici pour beurrer des toasts. Dis-moi ce que tu veux bâtir aujourd'hui !"
              </p>
              
              <div className="grid grid-cols-1 gap-3 w-full">
                <button onClick={() => handleSendMessage("Nesting pour 5 plaques 1/4 inox")} className="group p-4 text-[11px] font-black text-slate-600 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-left flex items-center justify-between shadow-sm">
                  <span>Nesting pour 5 plaques 1/4 inox</span>
                  <PlusCircle className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
                <button onClick={() => handleSendMessage("Compare les formats 48x120 et 60x120")} className="group p-4 text-[11px] font-black text-slate-600 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all text-left flex items-center justify-between shadow-sm">
                  <span>Comparer les formats de feuilles...</span>
                  <PlusCircle className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
              </div>
            </div>
          )}

          {currentSessionId && messages.map((m, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm font-medium leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none ring-1 ring-slate-200/50'
                }`}>
                  {m.text}
                </div>
                <span className="text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{m.timestamp}</span>
              </div>
              
              {m.suggestion && m.suggestion.items && m.suggestion.items.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="max-w-[90%] w-full bg-white rounded-2xl border border-blue-100 shadow-xl shadow-blue-500/5 overflow-hidden mt-2 ring-1 ring-blue-50"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-white px-5 py-3 border-b border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <SparklesIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Carte Jarviss</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black text-blue-400 tracking-tighter">PRÊT POUR APPROBATION</span>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {m.suggestion.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-slate-800 tracking-tight">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">QTÉ: {item.quantity}</span>
                              <span className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shadow-sm">{item.unitPrice}$/u</span>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            item.type === 'project' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.type}
                          </div>
                        </div>
                        
                        {item.operations && item.operations.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workflow de production</p>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              {item.operations.map((op, opIdx) => (
                                <React.Fragment key={opIdx}>
                                  <div className="flex flex-col items-center min-w-[70px] group/op">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover/op:border-blue-300 transition-colors">
                                      <Settings className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <p className="text-[8px] font-black text-slate-600 mt-1 uppercase truncate w-full text-center tracking-tighter">{op.name}</p>
                                    <p className="text-[7px] text-slate-400 font-bold">{op.estimatedTimeMinutes}m</p>
                                  </div>
                                  {opIdx < item.operations.length - 1 && (
                                    <div className="min-w-[12px] h-[1px] bg-slate-200 mt-[-16px]" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {item.estimatedMinutes && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-black bg-white px-3 py-2 rounded-lg border border-slate-200/50 shadow-inner">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>ESTIMATION TOTALE : <span className="text-blue-600 underline decoration-blue-200 decoration-2 underline-offset-2">{item.estimatedMinutes} MINUTES</span></span>
                          </div>
                        )}
                      </div>
                    ))}

                    <button 
                      onClick={() => {
                        if (m.suggestion) {
                          approveItems(m.suggestion.items);
                          setMessages(prev => prev.map((msg, idx) => 
                            idx === i ? { ...msg, suggestion: undefined } : msg
                          ));
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all font-black text-xs uppercase tracking-widest ring-offset-2 hover:ring-2 hover:ring-blue-500 active:scale-[0.98]"
                    >
                      <PlusCircle className="w-5 h-5" />
                      Ajouter au récapitulatif
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          {isAiLoading && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start items-start gap-4"
            >
              <div className="w-10 h-10 rounded-[1.25rem] bg-blue-600 flex items-center justify-center text-white shadow-lg shrink-0 relative overflow-hidden ring-4 ring-blue-50/50">
                <SparklesIcon className="w-5 h-5 z-10" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-blue-400"
                />
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-[85%] w-full ring-1 ring-slate-100 ring-offset-4 ring-offset-slate-50/50 relative">
                {/* Thinking Pulse Tag */}
                <div className="absolute -top-3 left-6 flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  Réflexion de Jarviss...
                </div>

                <div className="mb-4 mt-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{simsMessage}</span>
                    <span className="text-[10px] font-black text-slate-300 tabular-nums">{thinkingProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${thinkingProgress}%` }}
                    />
                  </div>
                </div>

                {/* Structural Workflow Steps */}
                <div className="flex justify-between items-center px-1 py-1">
                  {TOTAL_STEPS.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                       <motion.div 
                         animate={{ 
                           scale: idx === currentStepIndex ? [1, 1.2, 1] : 1,
                           backgroundColor: idx <= currentStepIndex ? '#3b82f6' : '#e2e8f0',
                           boxShadow: idx === currentStepIndex ? "0 0 10px rgba(59,130,246,0.4)" : "none"
                         }}
                         transition={{ duration: 0.5, repeat: idx === currentStepIndex ? Infinity : 0 }}
                         className="w-3 h-3 rounded-full" 
                       />
                       <span className={`text-[8px] font-black uppercase tracking-widest ${idx <= currentStepIndex ? 'text-blue-500' : 'text-slate-300'}`}>
                         {step}
                       </span>
                    </div>
                  ))}
                </div>

                {/* Subtle thought indicators */}
                <div className="mt-4 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 0.6, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 rounded-full bg-blue-200"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-100 bg-white/80 backdrop-blur-md">
          <div className="flex gap-3 items-center max-w-4xl mx-auto">
            <button 
              onClick={toggleListening}
              className={`p-4 rounded-2xl transition-all duration-300 transform active:scale-95 ${
                isListening 
                  ? 'bg-red-500 text-white shadow-2xl shadow-red-200 ring-4 ring-red-100' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              }`}
              title={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
            >
              {isListening ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
            </button>
            
            <div className="flex-1 relative group">
              <input
                type="text"
                value={input}
                disabled={isGenerated}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isGenerated ? "Soumission terminée pour cette discussion." : (isListening ? "Parle-moi Karl, je t'écoute..." : "Écris tes pièces ici...")}
                className="w-full text-sm font-bold border-slate-200 bg-slate-50/50 rounded-2xl pl-5 pr-14 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button 
                onClick={() => handleSendMessage()} 
                disabled={isAiLoading || !input.trim()} 
                className="absolute right-2 top-2 p-2.5 bg-blue-600 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:shadow-none"
              >
                <SendIcon className="w-5 h-5 translate-x-px -translate-y-px" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Recap Summary */}
      <div className={`${showRecap ? 'flex' : 'hidden'} md:flex absolute md:relative inset-0 md:inset-auto z-40 md:z-0 w-full md:w-1/4 max-w-[450px] min-w-[320px] border-l border-slate-200 bg-white flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Récapitulatif Temporaire</span>
          </div>
          <button 
            onClick={() => setShowRecap(false)}
            className="p-1 hover:bg-slate-200 rounded text-slate-400"
          >
            <PlusCircle className="w-4 h-4 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {temporaryItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
              <PlusCircle className="w-12 h-12 opacity-20 mb-4" />
              <p className="text-[10px] font-bold uppercase">Aucun item approuvé</p>
            </div>
          ) : (
            temporaryItems.map((item, idx) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx} 
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 truncate leading-none uppercase">{item.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    {item.quantity} x {item.unitPrice}$
                  </p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-xs font-black text-blue-600">{(item.quantity * item.unitPrice).toFixed(2)}$</p>
                  <button 
                    onClick={() => {
                      const newItems = temporaryItems.filter((_, i) => i !== idx);
                      setTemporaryItems(newItems);
                      if (currentSessionId) updateSession(currentSessionId, { temporaryItems: newItems });
                    }}
                    className={`text-[8px] font-black text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ${isGenerated ? 'hidden' : ''}`}
                  >
                    RETIRER
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimé</span>
            <span className="text-xl font-black text-blue-700 tabular-nums">{totalPrice.toFixed(2)}$</span>
          </div>

          {!isGenerated ? (
            <button 
              disabled={temporaryItems.length === 0}
              onClick={generateQuotation}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-white/50" />
              Générer la soumission
            </button>
          ) : (
            <div className="w-full py-4 bg-slate-100 text-green-600 rounded-xl font-black text-xs uppercase tracking-widest border border-green-200 flex items-center justify-center gap-2">
              <PlusCircle className="w-5 h-5" />
              Soumission Générée
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
