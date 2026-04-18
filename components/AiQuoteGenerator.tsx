import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { UploadIcon, XIcon, PlusIcon, CheckCircleIcon, MessageSquareIcon, FileIcon } from 'lucide-react';
import { Client, Part, Assembly, Material, Operation, Subcontracting, Quote, QuoteItem } from '../types';
import { extractDataFromDxf } from '../lib/dxfExtractor';

interface AiQuoteGeneratorProps {
  clients: Client[];
  parts: Part[];
  assemblies: Assembly[];
  materials: Material[];
  operations: Operation[];
  subcontractings: Subcontracting[];
  onQuoteGenerated: (quote: Omit<Quote, 'id' | 'quoteNumber'> & { isAiGenerated: boolean }) => void;
  onClose: () => void;
  onAddPart?: (part: Omit<Part, 'id'>) => Promise<string>;
  systemPrompt?: string;
}

interface FileWithPreview {
  file: File;
  preview: string;
  type: string;
  base64: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AiItemSuggestion {
  name: string;
  quantity: number;
  materialName?: string;
  thickness?: number;
  dimensionX?: number;
  dimensionY?: number;
  bendingSteps?: number;
  bendingSetups?: number;
  laserCutLength?: number;
  laserPierces?: number;
  estimatedTime?: number;
  operations: string[];
  suggestedUnitPrice: number;
  materialId?: string;
  pdfFile?: string;
  dxfFile?: string;
  stepFile?: string;
  isProject?: boolean;
}

interface AiSuggestions {
  clientName: string;
  quoteName: string;
  items: AiItemSuggestion[];
  notes: string;
}

export const AiQuoteGenerator: React.FC<AiQuoteGeneratorProps> = ({
  clients,
  parts,
  materials,
  operations,
  onQuoteGenerated,
  onClose,
  onAddPart,
  systemPrompt
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    await processFiles(selectedFiles);
  };

  const processFiles = async (selectedFiles: File[]) => {
    const newFiles: FileWithPreview[] = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        let mimeType = file.type;
        
        // Improve MIME type detection for manufacturing files
        if (!mimeType || mimeType === 'application/octet-stream') {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'dxf' || ext === 'step' || ext === 'stp') {
            mimeType = 'text/plain'; // Try treating as text for AI analysis
          } else if (ext === 'pdf') {
            mimeType = 'application/pdf';
          }
        }

        return {
          file,
          preview: URL.createObjectURL(file),
          type: mimeType || 'text/plain',
          base64: base64.split(',')[1]
        };
      })
    );
    setFiles(prev => [...prev, ...newFiles]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && files.length === 0) return;

    const userMessage = inputValue.trim() || "Analyse ces fichiers pour générer une soumission.";
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputValue('');
    setIsAnalyzing(true);

    if (files.length > 5) {
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, je ne peux analyser que 5 fichiers à la fois pour éviter les erreurs de serveur. Veuillez en retirer quelques-uns." }]);
      setIsAnalyzing(false);
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.base64.length, 0);
    if (totalSize > 15 * 1024 * 1024) { // ~15MB base64 limit
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, le volume total des fichiers est trop important pour une seule analyse. Veuillez envoyer des fichiers plus petits ou en envoyer moins." }]);
      setIsAnalyzing(false);
      return;
    }

    try {
      const parts_data = await Promise.all(files.map(async f => {
        let extraInfo = "";
        
        // If it's a DXF, try to extract mathematical data to help the AI
        if (f.file.name.toLowerCase().endsWith('.dxf')) {
          try {
            const dxfString = atob(f.base64);
            const mathData = extractDataFromDxf(dxfString, 0.284, 0.125);
            extraInfo = `\n[DONNÉES GÉOMÉTRIQUES RÉELLES DU DXF]:
- Longueur de coupe: ${mathData.cutLength.toFixed(3)} po
- Nombre de perçages: ${mathData.pierces}
- Nombre de coins vifs: ${mathData.sharpCorners}
- Aire réelle (sans trous): ${mathData.realSurface.toFixed(3)} po²
- Dimensions du blank (le plus fit): ${mathData.blankX.toFixed(3)} x ${mathData.blankY.toFixed(3)} po
- Nombre de plis estimés (lignes pointillées): ${mathData.bends}
UTILISE CES VALEURS PRIORITAIREMENT.` ;
          } catch (e) {
            console.warn("Could not pre-extract DXF data for AI:", e);
          }
        }

        return [
          { text: `Fichier: ${f.file.name}${extraInfo}` },
          {
            inlineData: {
              mimeType: f.type,
              data: f.base64
            }
          }
        ];
      }));

      const defaultSystemInstruction = `
        Tu es Jarviss, l'expert en estimation pour Groupe FMI.
        Salue toujours l'utilisateur par son nom (Karl) et ajoute un brin d'humour pour annoncer que tu es prêt.
        Analyse les fichiers fournis (courriels, PDF, DXF, STEP) pour extraire les informations d'une demande de soumission ou d'un PROJET.
        
        NOUVEAU: Tu peux créer des "Soumissions Temps-Matériel" (Budgétaires). 
        Si l'utilisateur demande une estimation rapide, un "T&M", ou un projet budgétaire basé sur des quantités approximatives de temps/matériel (sans détails de pièces), marque l'item avec "isProject": true.
        
        IMPORTANT: Si des [DONNÉES GÉOMÉTRIQUES RÉELLES DU DXF] sont fournies, utilise ces valeurs exactes.
        
        Format JSON STRICT:
        {
          "clientName": "Nom du client",
          "quoteName": "Nom de la soumission",
          "items": [
            {
              "name": "Nom de la pièce ou du projet",
              "isProject": true/false,
              "quantity": 1,
              "materialName": "Acier, etc. (optionnel si projet)",
              "thickness": 0.125,
              "operations": ["Laser", "Pliage"],
              "suggestedUnitPrice": 0.0,
              "pdfFile": "nom.pdf",
              "dxfFile": "nom.dxf",
              "stepFile": "nom.step"
            }
          ],
          "notes": "Tes observations. Karl, je suis là et prêt à l'action !"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Using a more robust preview model
        contents: [
          { role: 'user', parts: [...parts_data, { text: userMessage }] }
        ],
        config: {
          systemInstruction: systemPrompt || defaultSystemInstruction,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) throw new Error("L'IA n'a pas retourné de réponse.");
      
      // Sanitize JSON response (sometimes Gemini adds markdown block even with responseMimeType)
      const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleanJson) as AiSuggestions;
      
      // Try to pre-match materials
      if (result.items) {
        result.items = result.items.map(item => ({
          ...item,
          materialId: materials.find(m => 
            (item.materialName && m.description.toLowerCase().includes(item.materialName.toLowerCase())) ||
            (item.thickness && item.thickness > 0 && Math.abs(m.thickness - item.thickness) < 0.001)
          )?.id || ''
        }));
      }

      setAiSuggestions(result);
      setMessages(prev => [...prev, { role: 'model', text: result.notes || "Analyse complétée. Voici mes suggestions." }]);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      let errorMessage = "Désolé, j'ai rencontré une erreur lors de l'analyse des fichiers.";
      if (error instanceof Error && error.message.includes('500')) {
        errorMessage = "Le serveur AI a rencontré une erreur interne (500). Cela arrive souvent si les fichiers sont trop volumineux ou s'il y en a trop. Essayez de réduire la taille des fichiers ou d'en envoyer moins.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createQuoteFromAi = async () => {
    if (!aiSuggestions) return;

    // Try to find matching client
    const client = clients.find(c => c.name.toLowerCase().includes(aiSuggestions.clientName?.toLowerCase() || ''));
    
    const quoteItems: QuoteItem[] = [];
    let totalAmount = 0;

    // Try to create parts for items if onAddPart is available
    if (onAddPart) {
      for (const item of aiSuggestions.items) {
        // Check if part already exists by name
        let partId = parts.find(p => p.name.toLowerCase() === item.name.toLowerCase())?.id;

        if (!partId) {
          // Find files
          const pdfF = files.find(f => f.file.name === item.pdfFile);
          const dxfF = files.find(f => f.file.name === item.dxfFile);
          const stepF = files.find(f => f.file.name === item.stepFile);

          // Create a new part
          const newPart: Omit<Part, 'id'> = {
            name: item.name,
            quantity: item.quantity,
            materialId: item.materialId,
            dimensionX: item.dimensionX,
            dimensionY: item.dimensionY,
            filePdf: pdfF ? `data:${pdfF.type};base64,${pdfF.base64}` : undefined,
            filePdfName: pdfF?.file.name,
            fileDxf: dxfF ? `data:${dxfF.type};base64,${dxfF.base64}` : undefined,
            fileDxfName: dxfF?.file.name,
            fileStep: stepF ? `data:${stepF.type};base64,${stepF.base64}` : undefined,
            fileStepName: stepF?.file.name,
            operations: item.operations.map(opName => {
              const matchedOp = operations.find(o => 
                o.name.toLowerCase() === opName.toLowerCase() || 
                o.name.toLowerCase().includes(opName.toLowerCase()) ||
                opName.toLowerCase().includes(o.name.toLowerCase())
              );
              
              const op: PartOperation = {
                id: `op-${Math.random().toString(36).substring(2, 9)}`,
                operationId: matchedOp?.id || operations[0]?.id || '',
                estimatedTimeMinutes: Number(item.estimatedTime) ? (Number(item.estimatedTime) / item.operations.length) : 10,
                dependencies: [],
                delayDays: 0
              };
              
              const lowerOpName = opName.toLowerCase();
              if ((lowerOpName.includes('pliage') || lowerOpName.includes('bending')) && item.bendingSteps) {
                op.bendingParams = {
                  numberOfSetups: item.bendingSetups || 1,
                  numberOfBends: item.bendingSteps,
                  numberOfReverses: 0,
                  areaSqIn: (item.dimensionX || 0) * (item.dimensionY || 0),
                  weightLbs: 0,
                  useNeoprene: false,
                  quantity: item.quantity
                };
              }

              if (lowerOpName.includes('laser') || lowerOpName.includes('découpe')) {
                op.laserParams = {
                  cutLengthInches: item.laserCutLength || 0,
                  yieldPercentage: 80,
                  powerkW: 6,
                  blankAreaSqIn: (item.dimensionX || 0) * (item.dimensionY || 0),
                  numberOfPierces: item.laserPierces || 0
                };
              }
              
              return op;
            }),
            isAiGenerated: true
          };
          partId = await onAddPart(newPart);
        }

        const unitPrice = item.suggestedUnitPrice || 0;
        quoteItems.push({
          tempId: Math.random().toString(36).substring(2, 9),
          type: 'part',
          id: partId,
          quantity: item.quantity,
          unitPrice: unitPrice
        });
        totalAmount += unitPrice * item.quantity;
      }
    }

    const quoteData: Omit<Quote, 'id' | 'quoteNumber'> & { isAiGenerated: boolean } = {
      name: aiSuggestions.quoteName || "Soumission IA",
      clientId: client?.id || '',
      status: 'AI_Draft',
      date: new Date().toISOString().split('T')[0],
      items: quoteItems,
      totalAmount: totalAmount,
      notes: aiSuggestions.notes,
      isAiGenerated: true,
      aiSuggestions: JSON.stringify(aiSuggestions)
    };

    onQuoteGenerated(quoteData);
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageSquareIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Générateur de Soumission IA</h2>
            <p className="text-xs text-slate-400">Propulsé par Gemini</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Chat & Files */}
        <div className="flex-1 flex flex-col border-r border-slate-200">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <UploadIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Commencez ici</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Déposez vos fichiers (PDF, DXF, STEP, Courriels) et demandez à l'IA de générer la soumission.
                  </p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm space-y-3 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full"
                    />
                    <span className="text-sm font-bold text-indigo-700 italic">Analyse intelligente...</span>
                  </div>
                  <div className="flex gap-1.5">
                    {files.map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-4 h-5 bg-indigo-50 rounded border border-indigo-100"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Extraction géométrique & IA</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* File List (Horizontal scroll) */}
          {files.length > 0 && (
            <div className="p-2 bg-white border-t border-slate-200 flex gap-2 overflow-x-auto">
              {files.map((f, i) => (
                <div key={i} className="relative group flex-shrink-0">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                    <FileIcon className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-600 truncate w-full px-1">{f.file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <PlusIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input 
                type="file" 
                multiple 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Ajouter des fichiers"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
              <input 
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Posez une question ou demandez l'analyse..."
                className="flex-1 border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isAnalyzing || (!inputValue.trim() && files.length === 0)}
                className="bg-fmi-red text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Suggestions & Actions */}
        <div className="w-96 bg-slate-50 flex flex-col border-l border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              Édition de la Soumission IA
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!aiSuggestions ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm italic">En attente d'analyse...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Client Détecté</label>
                    <input 
                      type="text"
                      value={aiSuggestions.clientName}
                      onChange={e => setAiSuggestions({...aiSuggestions, clientName: e.target.value})}
                      className="w-full mt-1 p-2 bg-white rounded border border-slate-200 text-sm font-medium focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nom de la Soumission</label>
                    <input 
                      type="text"
                      value={aiSuggestions.quoteName}
                      onChange={e => setAiSuggestions({...aiSuggestions, quoteName: e.target.value})}
                      className="w-full mt-1 p-2 bg-white rounded border border-slate-200 text-sm font-medium focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between items-center">
                    Items ({aiSuggestions.items?.length || 0})
                    <button 
                      onClick={() => {
                        const newItem: AiItemSuggestion = {
                          name: "Nouvelle pièce",
                          quantity: 1,
                          materialName: "",
                          thickness: 0,
                          operations: ["Laser"],
                          suggestedUnitPrice: 0,
                          materialId: materials[0]?.id || ''
                        };
                        setAiSuggestions({...aiSuggestions, items: [...aiSuggestions.items, newItem]});
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter
                    </button>
                  </label>
                  <div className="space-y-4">
                    {aiSuggestions.items?.map((item, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 text-xs shadow-sm space-y-3 relative group">
                        <button 
                          onClick={() => {
                            const newItems = [...aiSuggestions.items];
                            newItems.splice(i, 1);
                            setAiSuggestions({...aiSuggestions, items: newItems});
                          }}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold">Nom de la pièce</label>
                          <input 
                            type="text"
                            value={item.name}
                            onChange={e => {
                              const newItems = [...aiSuggestions.items];
                              newItems[i].name = e.target.value;
                              setAiSuggestions({...aiSuggestions, items: newItems});
                            }}
                            className="w-full p-1 border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Quantité</label>
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].quantity = parseInt(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Prix Unitaire ($)</label>
                            <input 
                              type="number"
                              value={item.suggestedUnitPrice}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].suggestedUnitPrice = parseFloat(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className={`text-[9px] uppercase font-bold ${(!item.materialId && !item.isProject) ? 'text-red-500' : 'text-slate-400'}`}>
                            Matériel (Sélectionner) {(!item.materialId && !item.isProject) && '* Requis pour les pièces'}
                          </label>
                          <select 
                            value={item.materialId || ''}
                            onChange={e => {
                              const newItems = [...aiSuggestions.items];
                              newItems[i].materialId = e.target.value;
                              setAiSuggestions({...aiSuggestions, items: newItems});
                            }}
                            className={`w-full p-1 border rounded text-[10px] ${(!item.materialId && !item.isProject) ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                          >
                            <option value="">{item.isProject ? "Pas de matériel (Projet)" : "Choisir un matériel..."}</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.description} ({m.thickness}")</option>
                            ))}
                          </select>
                          {item.materialName && (
                            <div className="text-[9px] text-slate-400 italic mt-0.5">Détecté: {item.materialName} {item.thickness ? `${item.thickness}"` : ''}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 py-1">
                          <input 
                            type="checkbox"
                            id={`isProject-${i}`}
                            checked={item.isProject || false}
                            onChange={e => {
                              const newItems = [...aiSuggestions.items];
                              newItems[i].isProject = e.target.checked;
                              setAiSuggestions({...aiSuggestions, items: newItems});
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`isProject-${i}`} className="text-[10px] font-bold text-slate-600">Est un Projet (Pas de matériel requis)</label>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Dim X</label>
                            <input 
                              type="number"
                              step="0.001"
                              value={item.dimensionX || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].dimensionX = parseFloat(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Dim Y</label>
                            <input 
                              type="number"
                              step="0.001"
                              value={item.dimensionY || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].dimensionY = parseFloat(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Plis</label>
                            <input 
                              type="number"
                              value={item.bendingSteps || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].bendingSteps = parseInt(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Setups Pli</label>
                            <input 
                              type="number"
                              value={item.bendingSetups || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].bendingSetups = parseInt(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Coupe Laser</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={item.laserCutLength || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].laserCutLength = parseFloat(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Perçages</label>
                            <input 
                              type="number"
                              value={item.laserPierces || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].laserPierces = parseInt(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Temps Est. (min)</label>
                            <input 
                              type="number"
                              value={item.estimatedTime || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].estimatedTime = parseInt(e.target.value) || 0;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">PDF</label>
                            <select 
                              value={item.pdfFile || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].pdfFile = e.target.value;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded text-[9px]"
                            >
                              <option value="">Aucun</option>
                              {files.filter(f => f.type === 'application/pdf').map(f => (
                                <option key={f.file.name} value={f.file.name}>{f.file.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">DXF</label>
                            <select 
                              value={item.dxfFile || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].dxfFile = e.target.value;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded text-[9px]"
                            >
                              <option value="">Aucun</option>
                              {files.filter(f => f.file.name.toLowerCase().endsWith('.dxf')).map(f => (
                                <option key={f.file.name} value={f.file.name}>{f.file.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">STEP</label>
                            <select 
                              value={item.stepFile || ''}
                              onChange={e => {
                                const newItems = [...aiSuggestions.items];
                                newItems[i].stepFile = e.target.value;
                                setAiSuggestions({...aiSuggestions, items: newItems});
                              }}
                              className="w-full p-1 border-slate-200 rounded text-[9px]"
                            >
                              <option value="">Aucun</option>
                              {files.filter(f => f.file.name.toLowerCase().endsWith('.step') || f.file.name.toLowerCase().endsWith('.stp')).map(f => (
                                <option key={f.file.name} value={f.file.name}>{f.file.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold">Opérations</label>
                          <div className="flex flex-wrap gap-1">
                            {item.operations?.map((op: string, j: number) => (
                              <span key={j} className="px-1 bg-blue-50 text-blue-600 rounded-[2px] text-[9px] uppercase font-bold flex items-center gap-1">
                                {op}
                                <button onClick={() => {
                                  const newItems = [...aiSuggestions.items];
                                  newItems[i].operations.splice(j, 1);
                                  setAiSuggestions({...aiSuggestions, items: newItems});
                                }}><XIcon className="w-2 h-2" /></button>
                              </span>
                            ))}
                            <button 
                              onClick={() => {
                                const op = prompt("Nom de l'opération:");
                                if (op) {
                                  const newItems = [...aiSuggestions.items];
                                  newItems[i].operations.push(op);
                                  setAiSuggestions({...aiSuggestions, items: newItems});
                                }
                              }}
                              className="px-1 border border-dashed border-slate-300 text-slate-400 rounded text-[9px] hover:border-blue-300 hover:text-blue-500"
                            >
                              + Op
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes de l'IA</label>
                  <textarea 
                    value={aiSuggestions.notes}
                    onChange={e => setAiSuggestions({...aiSuggestions, notes: e.target.value})}
                    rows={3}
                    className="w-full p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800 leading-relaxed italic focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            {aiSuggestions && aiSuggestions.items.some(item => !item.materialId && !item.isProject) && (
              <p className="text-[10px] text-red-500 font-bold mb-2 text-center animate-pulse">
                Certains items n'ont pas de matériel sélectionné (et ne sont pas marqués comme projet).
              </p>
            )}
            <button 
              onClick={createQuoteFromAi}
              disabled={!aiSuggestions || aiSuggestions.items.some(item => !item.materialId && !item.isProject)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Créer Soumission GEM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
