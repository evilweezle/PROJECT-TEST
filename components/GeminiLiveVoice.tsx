import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { MicIcon, MicOffIcon, Loader2Icon, XIcon, MessageSquareIcon, SparklesIcon, CogIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

import { Quote, Part, WorkOrder, Client, View } from '../types';

interface GeminiLiveVoiceProps {
  systemInstruction?: string;
  quotes?: Quote[];
  parts?: Part[];
  workOrders?: WorkOrder[];
  clients?: Client[];
  setDetailedQuote?: (q: Quote | null) => void;
  setDetailedWorkOrder?: (wo: WorkOrder | null) => void;
  setEditingPart?: (p: Part | null) => void;
  setCurrentView?: (v: View) => void;
  updateQuote?: (quote: Quote) => void;
  onCreateBudgetaryQuote?: (data: { project_name: string; items: { name: string; quantity: number; description?: string }[]; client_name?: string }) => { status: string; message: string };
}

export const GeminiLiveVoice: React.FC<GeminiLiveVoiceProps> = ({ 
  systemInstruction: initialSystemInstruction = "Tu t'appelles Jarviss. Salue toujours Karl par son nom. Ajoute une phrase courte avec un brind'humour pour annoncer que tu es prêt et présent. Tu es un assistant expert en fabrication industrielle pour le Groupe FMI. Tu aides les utilisateurs à traiter des demandes de soumission, à analyser les pièces et à gérer l'atelier. Tu peux maintenant créer des 'Soumissions Temps-Matériel' (Budgétaires) pour des estimations rapides (ex: demandes de sucre, édulcorant, ou matériel vague sans détails techniques). Si l'utilisateur exprime un besoin sans pièces précises, propose de créer une soumission budgétaire. Tu as accès à des outils pour afficher des soumissions (view_quote), afficher des pièces (view_part), mettre à jour des statuts, ou créer une soumission budgétaire (create_budgetary_quote). Réponds de manière concise.",
  quotes = [],
  parts = [],
  workOrders = [],
  setDetailedQuote,
  setDetailedWorkOrder,
  setEditingPart,
  setCurrentView,
  updateQuote,
  onCreateBudgetaryQuote,
  clients = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const isAiSpeakingRef = useRef(false);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  const [systemInstruction, setSystemInstruction] = useState(initialSystemInstruction);
  const [selectedVoice, setSelectedVoice] = useState("Zephyr");
  const [showSettings, setShowSettings] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [volumeBar, setVolumeBar] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiSpeaking]);

  useEffect(() => {
    if (initialSystemInstruction) {
      setSystemInstruction(initialSystemInstruction);
    }
  }, [initialSystemInstruction]);

  const addLog = (msg: string) => {
    console.log("[GeminiLive]", msg);
    setLogMessages(prev => [msg, ...prev].slice(0, 5));
  };

  const isActiveRef = useRef(false);
  const quotesRef = useRef(quotes);
  const partsRef = useRef(parts);
  const workOrdersRef = useRef(workOrders);
  const clientsRef = useRef(clients);
  const setCurrentViewRef = useRef(setCurrentView);
  const setDetailedQuoteRef = useRef(setDetailedQuote);
  const setDetailedWorkOrderRef = useRef(setDetailedWorkOrder);
  const setEditingPartRef = useRef(setEditingPart);
  const onCreateRef = useRef(onCreateBudgetaryQuote);
  const updateQuoteRef = useRef(updateQuote);

  useEffect(() => { quotesRef.current = quotes; }, [quotes]);
  useEffect(() => { partsRef.current = parts; }, [parts]);
  useEffect(() => { workOrdersRef.current = workOrders; }, [workOrders]);
  useEffect(() => { clientsRef.current = clients; }, [clients]);
  useEffect(() => { setCurrentViewRef.current = setCurrentView; }, [setCurrentView]);
  useEffect(() => { setDetailedQuoteRef.current = setDetailedQuote; }, [setDetailedQuote]);
  useEffect(() => { setDetailedWorkOrderRef.current = setDetailedWorkOrder; }, [setDetailedWorkOrder]);
  useEffect(() => { setEditingPartRef.current = setEditingPart; }, [setEditingPart]);
  useEffect(() => { onCreateRef.current = onCreateBudgetaryQuote; }, [onCreateBudgetaryQuote]);
  useEffect(() => { updateQuoteRef.current = updateQuote; }, [updateQuote]);

  const [debugInfo, setDebugInfo] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const INPUT_SAMPLE_RATE = 16000;
  const OUTPUT_SAMPLE_RATE = 24000;
  const CHUNK_SIZE = 4096;

  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buffer;
  };

  const int16ToFloat32 = (int16Array: Int16Array): Float32Array => {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    return float32Array;
  };

  const playQueuedAudio = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) return;

    isPlayingRef.current = true;
    const ctx = audioContextRef.current;
    
    const playNext = () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsAiSpeaking(false);
        return;
      }

      const floatData = audioQueueRef.current.shift()!;
      const audioBuffer = ctx.createBuffer(1, floatData.length, OUTPUT_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      source.onended = playNext;
    };

    setIsAiSpeaking(true);
    playNext();
  }, []);

  const stopSession = useCallback(async () => {
    setIsActive(false);
    isActiveRef.current = false;
    setIsConnecting(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sessionRef.current) {
      try {
        const session = await sessionRef.current;
        session.close();
      } catch {
        console.error("Error closing session:", e);
      }
      sessionRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    isPlayingRef.current = false;
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = useCallback(async () => {
    if (isActive) return;
    
    setError(null);
    setIsConnecting(true);
    setDebugInfo("Initialisation...");
    addLog("Démarrage de la session...");
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      addLog("Accès micro...");
      setDebugInfo("Accès microphone...");
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE }); // eslint-disable-line @typescript-eslint/no-explicit-any
      
      // Explicitly resume on state suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      addLog("Connexion WebSocket...");
      setDebugInfo("Connexion WebSocket...");
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: "open_external_tab",
                description: "Ouvre une page spécifique dans un nouvel onglet pour que l'utilisateur puisse la consulter tout en continuant la discussion. Compatible avec les soumissions, bons de travail et pièces.",
                parameters: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["quote", "work-order", "part"], description: "Le type d'entité à ouvrir." },
                    id: { type: "string", description: "L'ID de l'entité." },
                    name: { type: "string", description: "Le nom ou numéro de l'entité (pour affichage)." }
                  },
                  required: ["type", "id"]
                }
              },
              {
                name: "view_work_order",
                description: "Affiche les détails d'un bon de travail spécifique.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Le numéro du bon de travail (ex: WO-X) ou son nom" }
                  },
                  required: ["query"]
                }
              },
              {
                name: "view_quote",
                description: "Affiche les détails d'une soumission (devis) spécifique.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Le numéro de soumission (ex: RFQ-X) ou le nom du client" }
                  },
                  required: ["query"]
                }
              },
              {
                name: "view_part",
                description: "Affiche les détails d'une pièce spécifique.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Le nom de la pièce ou son ID" }
                  },
                  required: ["query"]
                }
              },
              {
                name: "update_quote_status",
                description: "Change le statut d'une soumission.",
                parameters: {
                  type: "object",
                  properties: {
                    quote_id: { type: "string", description: "L'ID technique de la soumission" },
                    status: { type: "string", enum: ["Draft", "Sent", "Accepted", "Rejected"], description: "Le nouveau statut" }
                  },
                  required: ["quote_id", "status"]
                }
              },
              {
                name: "list_recent_entities",
                description: "Liste les dernières soumissions, pièces ou bons de travail.",
                parameters: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["quotes", "parts", "workOrders"], description: "Le type d'entité à lister" }
                  },
                  required: ["type"]
                }
              },
              {
                name: "search_entities",
                description: "Recherche des soumissions, pièces ou clients par nom ou numéro.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Le texte à rechercher" },
                    type: { type: "string", enum: ["quotes", "parts", "clients"], description: "Le type de recherche" }
                  },
                  required: ["query", "type"]
                }
              },
              {
                name: "create_budgetary_quote",
                description: "Crée une soumission de type Temps-Matériel (Budgétaire) sans détails de matériel précis. Utile pour des demandes vagues comme 'sucre, édulcorant' ou des estimations rapides.",
                parameters: {
                  type: "object",
                  properties: {
                    project_name: { type: "string", description: "Le nom du projet ou de la soumission" },
                    client_name: { type: "string", description: "Le nom du client (optionnel)" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Nom de l'item ou du besoin" },
                          quantity: { type: "number" },
                          description: { type: "string", description: "Description du besoin (ex: besoin de sucre liquide)" }
                        },
                        required: ["name", "quantity"]
                      }
                    }
                  },
                  required: ["project_name", "items"]
                }
              }
            ]
          }],
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setDebugInfo("En direct");
            addLog("Session ouverte !");
            
            console.log("Live session opened");
          },
          onmessage: async (message) => {
            const msg = message as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            
            // Handle ALL message roles for transcription/text
            const parts = msg.serverContent?.modelTurn?.parts || msg.serverContent?.userTurn?.parts || msg.transcription?.parts;
            const role = msg.serverContent?.modelTurn ? 'model' : (msg.serverContent?.userTurn || msg.transcription ? 'user' : null);
            
            if (role && parts) {
                parts.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (p.text) {
                    addLog(`${role === 'user' ? 'Toi' : 'Jarviss'}: ${p.text}`);
                    setMessages(prev => {
                      const last = prev[prev.length - 1];
                      if (last && last.role === role) {
                        // Append if same role, but don't append to tool status messages
                        if (role === 'model' && last.text.startsWith("🔧")) return [...prev, { role, text: p.text }];
                        return [...prev.slice(0, -1), { role, text: last.text + " " + p.text }];
                      }
                      return [...prev, { role, text: p.text }];
                    });
                  }
                });
            } else if (msg.transcription?.text) {
                const text = msg.transcription.text;
                addLog("Transcription: " + text);
                setMessages(prev => [...prev, { role: 'user', text }]);
            }

             if (msg.toolCall) {
                const callCount = msg.toolCall.functionCalls.length;
                addLog(`🛠️ Jarviss analyse ${callCount} outil(s)...`);
                setMessages(prev => [...prev, { role: 'model', text: "🔧 *Je consulte mes bases de données...*" }]);
                const calls = msg.toolCall.functionCalls;
                const responses = [];
 
                for (const call of calls) {
                  const { name, args, id } = call;
                  let result;
                  addLog(`👉 Appel outil: ${name}`);
                  console.log(`Tool Call [${id}]: ${name}`, args);
 
                   if (name === "open_external_tab") {
                    const baseUrl = window.location.origin;
                    const url = `${baseUrl}?view=${args.type}&id=${args.id}&external=true`;
                    try {
                      const win = window.open(url, '_blank');
                      if (win) {
                        result = { status: "success", message: `${args.name || args.type} ouvert dans un nouvel onglet.` };
                      } else {
                         result = { status: "warning", message: "Fenêtre bloquée par le navigateur." };
                         setMessages(prev => [...prev, { role: 'model', text: `J'ai préparé la vue, mais la fenêtre est bloquée. [Ouvrir ${args.name || args.type}](${url})` }]);
                      }
                    } catch {
                      result = { status: "error", message: "Erreur lors de l'ouverture de l'onglet." };
                    }
                  } else 

                 if (name === "view_quote") {
                   const quote = quotesRef.current.find((q: Quote) => 
                     q.id === args.query || 
                     q.quoteNumber === args.query ||
                     q.name?.toLowerCase().includes(args.query?.toLowerCase())
                   );
                   if (quote && setDetailedQuoteRef.current && setCurrentViewRef.current) {
                     setDetailedQuoteRef.current(quote);
                     setCurrentViewRef.current('quotes');
                     addLog(`📍 Soumission trouvée: ${quote.quoteNumber}`); result = { status: "success", message: `Soumission ${quote.quoteNumber} affichée.` };
                   } else {
                     result = { status: "error", message: "Soumission non trouvée." };
                   }
                 } else if (name === "view_work_order") {
                   const wo = workOrdersRef.current.find((w: WorkOrder) => 
                     w.id === args.query || 
                     w.workOrderNumber === args.query ||
                     w.name?.toLowerCase().includes(args.query?.toLowerCase())
                   );
                   if (wo && setDetailedWorkOrderRef.current && setCurrentViewRef.current) {
                     setDetailedWorkOrderRef.current(wo);
                     setCurrentViewRef.current('work-orders');
                     result = { status: "success", message: `Bon de travail ${wo.workOrderNumber} affiché.` };
                   } else {
                     result = { status: "error", message: "Bon de travail non trouvé." };
                   }
                 } else if (name === "view_part") {
                   const part = partsRef.current.find((p: Part) => 
                     p.id === args.query || 
                     p.name?.toLowerCase().includes(args.query?.toLowerCase())
                   );
                   if (part && setEditingPartRef.current && setCurrentViewRef.current) {
                     setEditingPartRef.current(part);
                     setCurrentViewRef.current('parts');
                     result = { status: "success", message: `Pièce ${part.name} affichée.` };
                   } else {
                     result = { status: "error", message: "Pièce non trouvée." };
                   }
                 } else if (name === "update_quote_status") {
                    if (updateQuoteRef.current) {
                      const quote = quotesRef.current.find((q: Quote) => q.id === args.quote_id);
                      if (quote) {
                        updateQuoteRef.current({ ...quote, status: args.status });
                        result = { status: "success", message: `Statut de la soumission mis à jour à ${args.status}.` };
                      } else {
                        result = { status: "error", message: "Soumission non trouvée." };
                      }
                    } else {
                      result = { status: "error", message: "Fonction de mise à jour indisponible." };
                    }
                 } else if (name === "list_recent_entities") {
                    if (args.type === 'quotes') {
                      result = { quotes: quotesRef.current.slice(-5).map((q: Quote) => ({ id: q.id, number: q.quoteNumber, client: q.clientId })) };
                    } else if (args.type === 'parts') {
                      result = { parts: partsRef.current.slice(-5).map((p: Part) => ({ id: p.id, name: p.name })) };
                    } else {
                      result = { workOrders: workOrdersRef.current.slice(-5).map((wo: WorkOrder) => ({ id: wo.id, number: wo.workOrderNumber })) };
                    }
                 } else if (name === "search_entities") {
                    const q = args.query.toLowerCase();
                    if (args.type === 'quotes') {
                      result = { results: quotesRef.current.filter((item: Quote) => 
                        item.quoteNumber?.toLowerCase().includes(q) || 
                        item.name?.toLowerCase().includes(q)
                      ).map((item: Quote) => ({ id: item.id, number: item.quoteNumber, name: item.name })) };
                    } else if (args.type === 'parts') {
                      result = { results: partsRef.current.filter((item: Part) => 
                        item.name?.toLowerCase().includes(q)
                      ).map((item: Part) => ({ id: item.id, name: item.name })) };
                    } else {
                      result = { results: clientsRef.current.filter((item: Client) => 
                        item.name?.toLowerCase().includes(q)
                      ).map((item: Client) => ({ id: item.id, name: item.name })) };
                    }
                 } else if (name === "create_budgetary_quote") {
                    if (onCreateRef.current) {
                       result = onCreateRef.current(args);
                    } else {
                       result = { status: "error", message: "Option de création indisponible." };
                    }
                 }

                 if (result === undefined) {
                   result = { status: "error", message: "Outil non supporté ou erreur interne." };
                 }

                 responses.push({
                   id: id,
                   response: result
                 });
               }

               sessionRef.current?.then((session: any) => { addLog("🚀 Jarviss génère sa réponse...");
                 session.sendRealtimeInput({
                   toolResponse: {
                     functionResponses: responses
                   }
                 });
               });
            }

            // Audio logic
            if (msg.serverContent?.modelTurn?.parts) {
              const audioParts = msg.serverContent.modelTurn.parts.filter((p: any) => p.inlineData); // eslint-disable-line @typescript-eslint/no-explicit-any
              if (audioParts.length > 0) {
                 if (audioContextRef.current?.state === 'suspended') {
                   audioContextRef.current.resume();
                 }
              }
              for (const part of audioParts) {
                const base64Audio = part.inlineData.data;
                const binary = atob(base64Audio);
                const bytes = new Int16Array(binary.length / 2);
                for (let i = 0; i < bytes.length; i++) {
                  bytes[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
                }
                audioQueueRef.current.push(int16ToFloat32(bytes));
                playQueuedAudio();
              }
            }

            if (msg.serverContent?.interrupted) {
                addLog("Message interrompu");
                audioQueueRef.current = [];
                isPlayingRef.current = false;
                setIsAiSpeaking(false);
                setDebugInfo("Interrompu");
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            const errMsg = err instanceof Error ? err.message : String(err);
            setError("Erreur API : " + errMsg);
            addLog("Erreur: " + errMsg);
            stopSession();
          },
          onclose: () => {
            console.log("Live session closed");
            setDebugInfo("Fermé");
            addLog("Session fermée");
            stopSession();
          }
        }
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      sessionRef.current = sessionPromise;

      setIsActive(true);
      isActiveRef.current = true;
      setIsConnecting(false);
      setDebugInfo("En ligne");
      addLog("Jarviss vous écoute");

      // Heartbeat every 30s to keep session hot
      heartbeatRef.current = setInterval(() => {
        if (isActiveRef.current) {
           sessionRef.current?.then(s => s.sendRealtimeInput({ text: "" })).catch(() => {});
        }
      }, 30000);

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1);
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (!isActiveRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visual feedback - more sensitive for mobile
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        setInputLevel(rms);
        setVolumeBar(Math.min(100, rms * 1000)); 

        // Local interruption: if user starts talking loud while AI is speaking
        if (rms > 0.15 && isAiSpeakingRef.current) {
           audioQueueRef.current = [];
           isPlayingRef.current = false;
           setIsAiSpeaking(false);
           addLog("Interruption locale (bruit/voix)");
        }

        const pcm16 = floatTo16BitPCM(inputData);
        
        // Fast conversion using TextDecoder for efficiency
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
        }
        const base64Data = btoa(binary);
        
        sessionRef.current?.then((session) => {
          if (session && isActiveRef.current) {
            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          }
        }).catch(err => {
          console.error("[GeminiLive] Fail to send audio:", err);
        });

        // Auto-resume if needed
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
      };

    } catch (err) {
      console.error("Failed to start Live session:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue lors du démarrage.");
      setIsConnecting(false);
      setDebugInfo("Échec");
    }
  }, [isActive, selectedVoice, systemInstruction, playQueuedAudio, stopSession]);

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.instruction) {
        setSystemInstruction(customEvent.detail.instruction);
      }
      if (customEvent.detail?.autoStart) {
        startSession();
      }
    };
    window.addEventListener('openGeminiLive', handleOpenEvent);
    return () => window.removeEventListener('openGeminiLive', handleOpenEvent);
  }, [startSession]);

  return (
    <>
      {/* Background Lock Overlay: Hand control to Jarviss */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[40] bg-slate-900/40 backdrop-blur-[2px] cursor-not-allowed pointer-events-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addLog("Écran verrouillé pendant la session Live");
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white flex flex-col items-center gap-4 bg-black/60 p-8 rounded-3xl border border-white/20">
             <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-fmi-red rounded-full blur-xl"
                />
                <MicIcon className="w-12 h-12 relative z-10" />
             </div>
             <p className="font-bold tracking-widest text-sm uppercase">Mode Jarviss Actif</p>
             <p className="text-xs opacity-80 text-center max-w-[200px]">L'application est pilotée par la voix. Jarviss s'occupe de l'affichage.</p>
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 sm:w-96 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-fmi-red p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight text-lg uppercase">JARVISS LIVE</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Performance Industrielle</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Paramètres"
                >
                  <CogIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="h-[450px] flex flex-col p-0 bg-slate-50">
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-white border-b border-slate-200 overflow-hidden shadow-inner"
                  >
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Voix de l'IA</label>
                        <div className="grid grid-cols-5 gap-1">
                          {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map(v => (
                            <button
                              key={v}
                              onClick={() => setSelectedVoice(v)}
                              className={`py-2 px-1 rounded-lg text-[10px] font-medium transition-all ${
                                selectedVoice === v 
                                  ? 'bg-fmi-red text-white shadow-md' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        {isActive && <p className="text-[9px] text-amber-600 mt-2 italic">* Redémarrez la session pour appliquer le changement de voix.</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instructions Système</label>
                        <textarea
                          value={systemInstruction}
                          onChange={(e) => setSystemInstruction(e.target.value)}
                          className="w-full h-24 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-all"
                          placeholder="Ex: Sois un expert en usinage CNC..."
                        />
                      </div>
                      <button 
                        onClick={() => setShowSettings(false)}
                        className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                      >
                        Enregistrer et Fermer
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-2 mb-2">
                {logMessages.length > 0 && (
                  <div className="flex-1 bg-slate-900/5 p-2 rounded-lg text-[8px] font-mono text-slate-500 overflow-hidden h-12">
                    {logMessages.map((log, i) => (
                      <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">[{i}] {log}</div>
                    ))}
                  </div>
                )}
                {isActive && (
                  <div className="w-4 bg-slate-200 rounded-lg overflow-hidden flex flex-col justify-end p-0.5">
                    <motion.div 
                      animate={{ height: `${volumeBar}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-full bg-green-500 rounded-sm"
                    />
                  </div>
                )}
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scroll-smooth">
                {messages.length === 0 && (
                  <div className="text-center mt-12 px-6">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquareIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-slate-500 text-sm italic">Commencez à parler pour interagir avec l'assistant en temps réel.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-fmi-red text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isAiSpeaking && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-0.5 bg-fmi-red rounded-full" />
                        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-0.5 bg-fmi-red rounded-full" />
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-0.5 bg-fmi-red rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={isActive ? stopSession : startSession}
                  disabled={isConnecting}
                  className={`relative group p-6 rounded-full transition-all transform active:scale-95 shadow-xl ${
                    isActive 
                      ? 'bg-slate-900 hover:bg-black' 
                      : 'bg-fmi-red hover:bg-red-700 active:bg-red-800'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2Icon className="w-8 h-8 text-white animate-spin" />
                  ) : isActive ? (
                    <MicOffIcon className="w-8 h-8 text-white" />
                  ) : (
                    <MicIcon className="w-8 h-8 text-white" />
                  )}
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 w-full h-full pointer-events-none">
                       <motion.div 
                        animate={{ scale: [1, 1.1 + inputLevel * 3], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute inset-0 rounded-full bg-red-400"
                      />
                    </div>
                  )}
                </button>
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-2 flex flex-col items-center">
                    <p className="text-red-600 text-[10px] font-bold text-center leading-tight">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 text-[9px] underline mt-1">Masquer</button>
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  {debugInfo || (isConnecting ? 'Connexion en cours...' : isActive ? 'En direct' : 'Appuyez pour parler')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-fmi-red hover:bg-red-700 text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 relative"
      >
        <SparklesIcon className="w-6 h-6" />
        {isActive && (
           <span className="absolute -top-1 -right-1 flex h-4 w-4">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
           </span>
        )}
      </button>
    </div>
    </>
  );
};
