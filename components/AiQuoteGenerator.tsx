import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { UploadIcon, XIcon, PlusIcon, CheckCircleIcon, MessageSquareIcon, FileIcon, AlertCircleIcon, MicIcon } from 'lucide-react';
import { Client, Part, Assembly, Material, Operation, Subcontracting, Quote, QuoteItem } from '../types';
import { extractDataFromDxf } from '../lib/dxfExtractor';
import { logService } from '@/services/logService';

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
  onAddSubcontracting?: (sub: Omit<Subcontracting, 'id' | 'subcontractingNumber'>) => Promise<string>;
  systemPrompt?: string;
  temperature?: number;
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
  rawJson?: string;
  isError?: boolean;
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
  subcontracting?: { name: string; cost: number }[];
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
  subcontractings,
  onQuoteGenerated,
  onClose,
  onAddPart,
  onAddSubcontracting,
  systemPrompt,
  temperature
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const [missingSubcontractings, setMissingSubcontractings] = useState<{name: string, cost: number}[]>([]);
  const [authorizedSubs, setAuthorizedSubs] = useState<string[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit per file for stability
  const MAX_TOTAL_FILES = 8;

  // Use useMemo to avoid re-initializing GoogleGenAI on every render
  const ai = React.useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsVoiceActive(customEvent.detail.active);
    };
    window.addEventListener('geminiLiveStatus', handleStatus);
    return () => window.removeEventListener('geminiLiveStatus', handleStatus);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    await processFiles(selectedFiles);
  };

  const processFiles = async (selectedFiles: File[]) => {
    setUploadErrors([]);
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)}MB): ${file.name}. Limite: 15MB.`);
      } else if (file.name.toLowerCase().endsWith('.exe') || file.name.toLowerCase().endsWith('.zip')) {
        errors.push(`Type de fichier non supporté: ${file.name}`);
      } else {
        validFiles.push(file);
      }
    });

    if (files.length + validFiles.length > MAX_TOTAL_FILES) {
      errors.push(`Limite de ${MAX_TOTAL_FILES} fichiers atteinte.`);
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
      // Limit processing to only allowed files if some were invalid
      if (files.length + validFiles.length > MAX_TOTAL_FILES) {
        validFiles.splice(MAX_TOTAL_FILES - files.length);
      }
    }

    const newFiles: FileWithPreview[] = await Promise.all(
      validFiles.map(async (file) => {
        const base64Raw = await fileToBase64(file);
        const base64 = base64Raw.split(',')[1];
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

        const preview = URL.createObjectURL(file);
        
        // For non-images that don't have previews, we use standard icons in UI
        // but for images we keep the object URL

        return {
          file,
          preview,
          type: mimeType || 'text/plain',
          base64: base64
        };
      })
    );
    setFiles(prev => [...prev, ...newFiles]);
  };

  const clearFiles = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadErrors([]);
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

  const cleanAndParseJson = (text: string) => {
    try {
      // Remove possible markdown blocks
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      // If it's empty or doesn't look like JSON, throw early
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        throw new Error("Invalid JSON format");
      }

      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("Standard parse failed, trying recovery...", e);
      
      // Basic recovery for truncated JSON (happens if maxOutputTokens is hit)
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
          throw e; // throw original error
        }
      }
      throw e;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && files.length === 0) return;

    const userMessage = inputValue.trim() || "Analyse ces fichiers pour générer une soumission.";
    
    logService.addLog({
      level: 'info',
      source: 'AiQuoteGenerator',
      message: `Démarrage analyse AI par Karl`,
      details: { message: userMessage, fileCount: files.length, fileNames: files.map(f => f.file.name) }
    });

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputValue('');
    setIsAnalyzing(true);
    setAnalysisStatus('Initialisation de Jarviss...');

    if (files.length > 5) {
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, je ne peux analyser que 5 fichiers à la fois pour éviter les erreurs de serveur. Veuillez en retirer quelques-uns." }]);
      setIsAnalyzing(false);
      setAnalysisStatus('');
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.base64.length, 0);
    if (totalSize > 15 * 1024 * 1024) { // ~15MB base64 limit
      setMessages(prev => [...prev, { role: 'model', text: "Désolé, le volume total des fichiers est trop important pour une seule analyse. Veuillez envoyer des fichiers plus petits ou en envoyer moins." }]);
      setIsAnalyzing(false);
      setAnalysisStatus('');
      return;
    }

    try {
      setAnalysisStatus('Extraction des données géométriques...');
      const nested_parts = await Promise.all(files.map(async f => {
        let extraInfo = "";
        
        // If it's a DXF, try to extract mathematical data to help the AI
        if (f.file.name.toLowerCase().endsWith('.dxf')) {
          setAnalysisStatus(`Extraction géométrique: ${f.file.name}...`);
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

        const isSupportedByGemini = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/heic',
          'image/heif'
        ].includes(f.type);

        const parts: any[] = [{ text: `Fichier: ${f.file.name}${extraInfo}` }]; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (isSupportedByGemini) {
          parts.push({
            inlineData: {
              mimeType: f.type,
              data: f.base64
            }
          });
        } else if (f.type.startsWith('text/') || f.file.name.toLowerCase().endsWith('.step') || f.file.name.toLowerCase().endsWith('.stp')) {
          // Send content as text if it's potentially short or a common text format
          // For STEP files, we just send a placeholder or snippet as they can be massive
          // and aren't natively understood as geometry by the model yet.
          if (f.base64.length < 50000) { // Limit text content to ~37KB
             try {
               const decoded = atob(f.base64);
               parts.push({ text: `[CONTENU TEXTUEL DU FICHIER]:\n${decoded}` });
             } catch {
               // ignore base64 errors
             }
          } else {
             parts.push({ text: `[FICHIER VOLUMINEUX]: Le contenu de ce fichier est trop long pour être inclus directement.` });
          }
        }

        return parts;
      }));
      const parts_data = nested_parts.flat();
      setAnalysisStatus('Envoi de la réflexion à Gemini (Vitesse éclair)...');

      const historyContents = messages
        .filter(m => !m.isError)
        .map(m => {
          if (m.role === 'model') {
            return { role: 'model', parts: [{ text: m.rawJson || JSON.stringify({ notes: m.text }) }] };
          }
          return { role: 'user', parts: [{ text: m.text }] };
        });

      const currentContent = { role: 'user', parts: [...parts_data, { text: userMessage }] };

      const defaultSystemInstruction = `
        Tu es Jarviss, l'expert en estimation pour Groupe FMI.
        Salue toujours l'utilisateur par son nom (Karl) et ajoute un brin d'humour pour annoncer que tu es prêt.
        IMPORTANT: Rédige tes réponses et observations en français québécois (vocabulaire corporatif du Québec).
        Analyse les fichiers fournis (courriels, PDF, DXF, STEP) pour extraire les informations d'une demande de soumission ou d'un PROJET.
        
        LISTE DES CLIENTS EXISTANTS POUR RÉFÉRENCE:
        ${clients.map(c => c.name).join(', ')}
        
        RECHERCHE DU CLIENT: 
        - Cherche le nom de l'entreprise cliente dans les signatures de courriels, les en-têtes de PDF, ou les noms de fichiers.
        - Si tu ne trouves pas de nom clair, cherche une adresse courriel ou un site web pour déduire l'entreprise.
        - Si le nom ressemble à un de ceux dans la LISTE DES CLIENTS EXISTANTS, utilise exactement ce nom.
        - Ne laisse pas "clientName" vide si tu as un indice.
        
        RECHERCHE DES PIÈCES:
        - Liste toutes les pièces trouvées. Si un fichier (DXF/STEP) est présent, c'est une pièce automatique.
        - Analyse le texte des PDF/emails pour trouver des listes de quantités et de noms de pièces.
        - Pour chaque pièce, cherche: Nom, Quantité (souvent à côté du nom), Matériel, Épaisseur.
        
        NOUVEAU: Tu peux créer 2 types de soumissions:
        1. STANDARDS: Pièces/Assemblages précis (fichiers DXF/STEP = pièce auto), avec opérations et matériaux (isProject: false).
        2. TEMPS&MATERIEL (Budgétaires): Estimations de temps/matériel sans détails techniques de pièces (isProject: true).
        
        RECHERCHE DES SOUS-TRAITANCES:
        - Identifie tout service externe requis (ex: Peinture, Galvanisation, Anodisation, Traitement thermique).
        - Même si le service ne semble pas exister dans ton catalogue, suggère-le dans le champ "subcontracting" de l'item avec un coût estimé.
        
        CORRECTION / CONTEXTE (TRÈS IMPORTANT):
        Si Karl demande une modification (ex: "ajoute 50 quantités", "modifie la matière", "ce n'est pas le bon client"), tu DOIS tenir compte du JSON que tu as généré lors de ton tour précédent. Applique les modifications demandées par Karl à la structure JSON existante au lieu de recommencer de zéro. Re-génère TOUJOURS la structure JSON complète et modifiée.
        
        IMPORTANT: Si des [DONNÉES GÉOMÉTRIQUES RÉELLES DU DXF] sont fournies, utilise ces valeurs exactes.
        SOIS CONCIS: Ne génère pas de descriptions ou de notes inutilement longues pour ne pas tronquer la réponse JSON.
        
        Format JSON STRICT:
        {
          "clientName": "Nom du client détecté",
          "quoteName": "Nom de la soumission (ex: Projet Laser, Réparation X)",
          "items": [
            {
              "name": "Nom de la pièce ou du projet",
              "isProject": true/false,
              "quantity": 1,
              "materialName": "Acier, Aluminium, Inox, etc.",
              "thickness": 0.125,
              "operations": ["Laser", "Pliage", "Soudure", "Peinture"],
              "subcontracting": [{"name": "Galvanisation", "cost": 50.0}],
              "suggestedUnitPrice": 0.0,
              "pdfFile": "nom.pdf",
              "dxfFile": "nom.dxf",
              "stepFile": "nom.step",
              "dimensionX": 0,
              "dimensionY": 0,
              "bendingSteps": 0
            }
          ],
          "notes": "Tes observations. Karl, je suis là et prêt à l'action !"
        }
      `;

      let response;
      let retries = 3;
      let delay = 2000;
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: [...historyContents, currentContent],
            config: {
              systemInstruction: systemPrompt || defaultSystemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  clientName: { type: Type.STRING, description: "Nom du client détecté" },
                  quoteName: { type: Type.STRING, description: "Nom de la soumission" },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        isProject: { type: Type.BOOLEAN },
                        quantity: { type: Type.NUMBER },
                        materialName: { type: Type.STRING },
                        thickness: { type: Type.NUMBER },
                        operations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        subcontracting: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              cost: { type: Type.NUMBER }
                            },
                            required: ["name", "cost"]
                          }
                        },
                        suggestedUnitPrice: { type: Type.NUMBER },
                        pdfFile: { type: Type.STRING },
                        dxfFile: { type: Type.STRING },
                        stepFile: { type: Type.STRING },
                        dimensionX: { type: Type.NUMBER },
                        dimensionY: { type: Type.NUMBER },
                        bendingSteps: { type: Type.NUMBER }
                      },
                      required: ["name", "isProject", "quantity"]
                    }
                  },
                  notes: { type: Type.STRING, description: "Observations de l'IA" }
                },
                required: ["clientName", "quoteName", "items", "notes"]
              },
              temperature: temperature !== undefined ? Number(temperature) : 0.2,
            }
          });
          break; // success
        } catch (error: unknown) {
          const errorStr = error instanceof Error ? error.message : String(error);
          if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand')) {
            retries--;
            if (retries === 0) throw error;
            setAnalysisStatus(`Demande élevée. Nouvelle tentative dans ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
          } else {
            throw error; // Other errors should fail immediately
          }
        }
      }

      if (!response) {
        throw new Error("L'IA n'a pas retourné de réponse après plusieurs tentatives.");
      }

      setAnalysisStatus('Structure reçue. Appariement des bases de données...');
      const text = response.text;
      if (!text) throw new Error("L'IA n'a pas retourné de réponse.");
      const result = cleanAndParseJson(text) as AiSuggestions;
      
      logService.addLog({
        level: 'success',
        source: 'AiQuoteGenerator',
        message: `Analyse AI réussie`,
        details: { clientDetected: result.clientName, itemsFound: result.items?.length }
      });
      
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

      // Clear previous missing subs
      setMissingSubcontractings([]);
      setAuthorizedSubs([]);

      setAiSuggestions(result);
      if (!result.items || result.items.length === 0) {
        setMessages(prev => [...prev, { role: 'model', text: "Karl, j'ai bien analysé les fichiers mais je n'ai pas détecté de pièces ou d'items clairs. Pourrais-tu me donner plus de détails ou vérifier les fichiers ?", rawJson: text }]);
      } else {
        // Detect missing subcontractings
        const missing: {name: string, cost: number}[] = [];
        result.items.forEach(item => {
          item.subcontracting?.forEach(sub => {
            const exists = subcontractings.find(s => s.name.toLowerCase() === sub.name.toLowerCase());
            if (!exists && !missing.some(m => m.name.toLowerCase() === sub.name.toLowerCase())) {
              missing.push(sub);
            }
          });
        });
        if (missing.length > 0) {
          setMissingSubcontractings(missing);
        }
        setMessages(prev => [...prev, { role: 'model', text: result.notes || "Analyse complétée. Voici mes suggestions.", rawJson: text }]);
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      let errorMessage = "Désolé, j'ai rencontré une erreur lors de l'analyse des fichiers.";
      const errorStr = error instanceof Error ? error.message : String(error);
      
      logService.addLog({
        level: 'error',
        source: 'AiQuoteGenerator',
        message: `Échec de l'analyse AI`,
        details: { error: errorStr }
      });
      
      if (errorStr.includes('500')) {
        errorMessage = "Le serveur AI a rencontré une erreur interne (500). Cela arrive souvent si les fichiers sont trop volumineux ou s'il y en a trop. Essayez de réduire la taille des fichiers ou d'en envoyer moins.";
      } else if (errorStr.toLowerCase().includes("spending cap") || errorStr.toLowerCase().includes("budget")) {
        errorMessage = "Désolé Karl, le plafond de dépenses mensuel (spending cap) de votre projet AI Studio a été atteint. Vous devez le gérer sur https://ai.studio/spend pour continuer.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage, isError: true }]);
      setAnalysisStatus('');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const createQuoteFromAi = async () => {
    if (!aiSuggestions || !aiSuggestions.items) return;

    setIsCreating(true);
    setAnalysisStatus('Préparation de la création de la soumission GEM...');

    // Try to find matching client
    const detectedName = aiSuggestions.clientName?.trim();
    const client = detectedName 
      ? clients.find(c => c.name.toLowerCase().includes(detectedName.toLowerCase())) 
      : null;
    
    const quoteItems: QuoteItem[] = [];
    let totalAmount = 0;
    const allFinalSubcontractings = [...subcontractings];

    try {
      // Create authorized new subcontractings first
      if (onAddSubcontracting) {
        for (const subName of authorizedSubs) {
          const subData = missingSubcontractings.find(m => m.name === subName);
          if (subData) {
            setAnalysisStatus(`Création du service externe: ${subData.name}...`);
            const newId = await onAddSubcontracting({
              name: subData.name,
              defaultCost: subData.cost,
              applyType: 'perUnit'
            });
            allFinalSubcontractings.push({ 
              id: newId, 
              name: subData.name, 
              defaultCost: subData.cost, 
              applyType: 'perUnit',
              subcontractingNumber: `SC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
            });
          }
        }
      }

      // Try to create parts for items if onAddPart is available
      if (onAddPart) {
        for (let idx = 0; idx < aiSuggestions.items.length; idx++) {
          const item = aiSuggestions.items[idx];
          setAnalysisStatus(`Traitement de l'item ${idx + 1}/${aiSuggestions.items.length}: ${item.name}...`);
          
          if (item.isProject) {
            const unitPrice = item.suggestedUnitPrice || 0;
            quoteItems.push({
              tempId: Math.random().toString(36).substring(2, 9),
              type: 'project',
              id: Math.random().toString(36).substring(2, 11),
              name: item.name,
              quantity: item.quantity,
              unitPrice: unitPrice
            });
            totalAmount += unitPrice * item.quantity;
            continue;
          }

          // Check if part already exists by name
          let partId = parts.find(p => p.name.toLowerCase() === item.name.toLowerCase())?.id;

          if (!partId) {
            setAnalysisStatus(`Création de la pièce technique: ${item.name}...`);
            // Find files - more robust matching
            let pdfF = files.find(f => f.file.name === item.pdfFile);
            if (!pdfF) pdfF = files.find(f => f.file.name.toLowerCase().includes(item.name.toLowerCase()) && f.type.includes('pdf'));

            let dxfF = files.find(f => f.file.name === item.dxfFile);
            if (!dxfF) dxfF = files.find(f => f.file.name.toLowerCase().includes(item.name.toLowerCase()) && f.file.name.toLowerCase().endsWith('.dxf'));

            let stepF = files.find(f => f.file.name === item.stepFile);
            if (!stepF) stepF = files.find(f => f.file.name.toLowerCase().includes(item.name.toLowerCase()) && (f.file.name.toLowerCase().endsWith('.step') || f.file.name.toLowerCase().endsWith('.stp')));

            // Handle suggested subcontracting for the part
            const suggestedSubItems: SubcontractingItem[] = [];
            item.subcontracting?.forEach(subSug => {
              const matchedSub = allFinalSubcontractings.find(s => s.name.toLowerCase() === subSug.name.toLowerCase());
              if (matchedSub) {
                suggestedSubItems.push({
                  subcontractingId: matchedSub.id,
                  description: `Suggéré par IA: ${subSug.name}`,
                  cost: subSug.cost,
                  applyType: 'perUnit'
                });
              }
            });

            // Create a new part
            const newPart: Omit<Part, 'id'> = {
              name: item.name,
              quantity: item.quantity,
              materialId: item.materialId,
              dimensionX: item.dimensionX,
              dimensionY: item.dimensionY,
              filePdf: pdfF ? `data:${pdfF.type};base64,${pdfF.base64}` : null,
              filePdfName: pdfF?.file.name || null,
              fileDxf: dxfF ? `data:${dxfF.type};base64,${dxfF.base64}` : null,
              fileDxfName: dxfF?.file.name || null,
              fileStep: stepF ? `data:${stepF.type};base64,${stepF.base64}` : null,
              fileStepName: stepF?.file.name || null,
              subcontractingItems: suggestedSubItems,
              operations: (item.operations || []).map(opName => {
                const matchedOp = operations.find(o => 
                  o.name.toLowerCase() === opName.toLowerCase() || 
                  o.name.toLowerCase().includes(opName.toLowerCase()) ||
                  opName.toLowerCase().includes(o.name.toLowerCase())
                );
                
                const opsLength = Math.max(1, (item.operations || []).length);
                const op: PartOperation = {
                  id: `op-${Math.random().toString(36).substring(2, 9)}`,
                  operationId: matchedOp?.id || operations[0]?.id || '',
                  estimatedTimeMinutes: Number(item.estimatedTime) ? (Number(item.estimatedTime) / opsLength) : 10,
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

      setAnalysisStatus('Assemblage de la soumission GEM Finale...');
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
      setAnalysisStatus('Ouverture de la soumission...');
    } catch (err) {
      console.error("Error creating quote from AI:", err);
      setMessages(prev => [...prev, { role: 'model', text: "Oups, Karl, j'ai eu un pépin lors de la création de la soumission. Vérifie les logs de diagnostic." }]);
    } finally {
      setIsCreating(false);
      setAnalysisStatus('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await processFiles(droppedFiles);
    }
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="flex flex-col h-[100dvh] md:h-[85vh] bg-white rounded-none md:rounded-xl overflow-hidden shadow-2xl border-0 md:border border-slate-200 w-full"
    >
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

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* Left Panel: Chat & Files */}
        <div className="flex-none md:flex-1 h-[50vh] md:h-auto flex flex-col border-r-0 md:border-r border-slate-200">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
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
                    <span className="text-sm font-bold text-indigo-700 italic">{analysisStatus || 'Analyse intelligente...'}</span>
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
                <PlusIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const event = new CustomEvent('openGeminiLive', { 
                    detail: { 
                      toggle: true,
                      background: true,
                      instruction: "L'utilisateur veut générer une soumission vocalement de manière interactive."
                    }
                  });
                  window.dispatchEvent(event);
                }}
                className={`p-2 rounded-lg transition-all ${isVoiceActive ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:text-fmi-red hover:bg-red-50'}`}
                title={isVoiceActive ? "Désactiver l'assistant vocal" : "Démarrer l'assistant vocal en arrière-plan"}
              >
                <MicIcon className="w-5 h-5" />
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
        <div className="flex-none md:flex-initial w-full md:w-96 bg-slate-50 flex flex-col border-t md:border-t-0 md:border-l border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              Édition de la Soumission IA
            </h3>
          </div>
          
          <div className="flex-1 overflow-visible md:overflow-y-auto p-4 space-y-6">
            {aiSuggestions ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Client Détecté</label>
                    <input 
                      type="text"
                      value={aiSuggestions.clientName}
                      onChange={e => setAiSuggestions({...aiSuggestions, clientName: e.target.value})}
                      className={`w-full mt-1 p-2 bg-white rounded border text-sm font-medium focus:ring-blue-500 focus:border-blue-500 ${!aiSuggestions.clientName ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
                      placeholder="Obligatoire"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nom de la Soumission</label>
                    <input 
                      type="text"
                      value={aiSuggestions.quoteName}
                      onChange={e => setAiSuggestions({...aiSuggestions, quoteName: e.target.value})}
                      className={`w-full mt-1 p-2 bg-white rounded border text-sm font-medium focus:ring-blue-500 focus:border-blue-500 ${!aiSuggestions.quoteName ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
                      placeholder="Obligatoire"
                    />
                  </div>
                </div>

                {missingSubcontractings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-tight">
                      <AlertCircleIcon className="w-4 h-4" />
                      Sous-traitance requise détectée
                    </div>
                    <p className="text-[10px] text-amber-700 leading-tight">Certains services externes suggérés n'existent pas encore dans votre base de données. Autorisez Jarviss à les créer :</p>
                    <div className="space-y-1">
                      {missingSubcontractings.map(sub => (
                        <div key={sub.name} className="flex items-center justify-between bg-white p-2 border border-amber-100 rounded shadow-sm">
                          <span className="text-xs font-semibold text-slate-700">{sub.name} <span className="text-slate-400 font-normal text-[10px]">(${sub.cost})</span></span>
                          <button 
                            onClick={() => {
                              if (authorizedSubs.includes(sub.name)) {
                                setAuthorizedSubs(authorizedSubs.filter(s => s !== sub.name));
                              } else {
                                setAuthorizedSubs([...authorizedSubs, sub.name]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              authorizedSubs.includes(sub.name) 
                                ? 'bg-green-600 text-white shadow-sm' 
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 uppercase'
                            }`}
                          >
                            {authorizedSubs.includes(sub.name) ? 'Autorisé' : 'Autoriser'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                            <option value="">{item.isProject ? "Temps-Matériel (Budgétaire)" : "Choisir un matériel..."}</option>
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
                          <label htmlFor={`isProject-${i}`} className="text-[10px] font-bold text-slate-600">Soumission Temps-Matériel (Budgétaire)</label>
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
              </div>
            ) : (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquareIcon className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-800">Prêt pour l'analyse</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Glissez vos plans (PDF, DXF, STEP) ou décrivez votre projet à Jarviss pour générer une soumission automatiquement.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Sélectionner des fichiers
                </button>
              </div>
            )}

            {/* File Management Section - ALWAYS VISIBLE */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Documents & Plans</label>
                    <div className="flex gap-2">
                      {files.length > 0 && (
                        <button 
                          onClick={clearFiles}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Tout effacer
                        </button>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {files.length}/{MAX_TOTAL_FILES}
                      </span>
                    </div>
                  </div>

                  {uploadErrors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1">
                      {uploadErrors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[10px] text-red-600 font-medium">
                          <AlertCircleIcon className="w-3 h-3 mt-0.5" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div 
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 translate-y-[-2px] shadow-lg' 
                        : 'border-slate-200 hover:border-blue-400 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
                      <UploadIcon className={`w-6 h-6 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 pointer-events-none">Déposer vos fichiers ici</p>
                    <p className="text-[10px] text-slate-400 mt-1 pointer-events-none">PDF, DXF, STEP, Images (Max 15MB)</p>
                  </div>

                  {files.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                       {files.map((f, i) => (
                        <div key={i} className="relative group p-2 bg-white rounded-lg border border-slate-200 flex items-center gap-2 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all text-left">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {f.type.startsWith('image/') ? (
                              <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
                            ) : f.type.includes('pdf') ? (
                              <FileIcon className="w-4 h-4 text-red-400" />
                            ) : f.file.name.toLowerCase().endsWith('.dxf') ? (
                              <FileIcon className="w-4 h-4 text-blue-400" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{f.file.name}</p>
                            <p className="text-[9px] text-slate-400">{(f.file.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                            className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            {aiSuggestions?.items?.some(item => !item.materialId && !item.isProject) && (
              <p className="text-[10px] text-red-500 font-bold mb-2 text-center animate-pulse">
                Certains items n'ont pas de matériel sélectionné (et ne sont pas marqués comme Temps-Matériel).
              </p>
            )}
            {aiSuggestions && (!aiSuggestions.clientName || !aiSuggestions.quoteName) && (
              <p className="text-[10px] text-amber-500 font-bold mb-2 text-center">
                Veuillez spécifier le nom du client et de la soumission.
              </p>
            )}
            <button 
              onClick={createQuoteFromAi}
              disabled={isCreating || !aiSuggestions || !aiSuggestions.items || !aiSuggestions.clientName || !aiSuggestions.quoteName || aiSuggestions.items.some(item => !item.materialId && !item.isProject)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Action en cours...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5" />
                  Créer Soumission GEM
                </>
              )}
            </button>
            {isCreating && (
              <p className="text-[10px] text-indigo-600 font-bold mt-2 text-center italic animate-pulse">
                {analysisStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
