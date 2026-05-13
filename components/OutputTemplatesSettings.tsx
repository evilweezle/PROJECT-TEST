import React, { useState, useEffect } from 'react';
import { OutputTemplate } from '../types';
import { 
  FileTextIcon, 
  SparklesIcon, 
  Loader2Icon,
  SendIcon,
  ImageIcon,
  PaperclipIcon,
  XIcon
} from 'lucide-react';

import { GoogleGenAI } from "@google/genai";

interface OutputTemplatesSettingsProps {
  templates: OutputTemplate[];
  onUpdateTemplate: (template: OutputTemplate) => void;
  onAddTemplate: (template: Omit<OutputTemplate, 'id'>) => void;
}

const DEFAULT_TEMPLATES: Omit<OutputTemplate, 'id'>[] = [
  {
    name: 'Soumission Client',
    description: 'Modèle officiel pour les devis envoyés aux clients.',
    html: `
<div class="quote-container">
  <header>
    <h1>SOUMISSION #{{quoteNumber}}</h1>
    <div class="client-info">
      <strong>Client:</strong> {{clientName}}<br>
      <strong>Date:</strong> {{date}}
    </div>
  </header>
  
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qté</th>
        <th>Prix Unitaire</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}$</td>
        <td>{{total}}$</td>
      </tr>
      {{/items}}
    </tbody>
  </table>
  
  <footer class="totals">
    <div class="total-line">
      <strong>TOTAL:</strong> {{totalAmount}}$
    </div>
    <div class="notes">
      <p>{{notes}}</p>
    </div>
  </footer>
</div>`,
    css: `
.quote-container { font-family: sans-serif; max-width: 800px; margin: auto; padding: 40px; border: 1px solid #eee; }
header { display: flex; justify-content: space-between; margin-bottom: 40px; }
h1 { color: #1e293b; margin: 0; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
.items-table th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
.items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
.totals { text-align: right; border-top: 2px solid #1e293b; padding-top: 20px; }
.total-line { font-size: 24px; color: #1e293b; }
.notes { text-align: left; margin-top: 40px; color: #64748b; font-size: 14px; border-top: 1px dashed #cbd5e1; padding-top: 20px; }`,
    placeholders: ['quoteNumber', 'clientName', 'date', 'items', 'totalAmount', 'notes']
  },
  {
    name: 'Work Order Plancher',
    description: 'Feuille de route pour la production en atelier.',
    html: `
<div class="wo-container">
  <div class="wo-header">
    <div class="wo-badge">WORK ORDER {{workOrderNumber}}</div>
    <h1>{{name}}</h1>
  </div>
  
  <div class="wo-meta">
    <div><strong>Client:</strong> {{clientName}}</div>
    <div><strong>Date Limite:</strong> {{finishDate}}</div>
  </div>
  
  <div class="wo-sections">
    <section>
      <h3>PIÈCES À PRODUIRE</h3>
      <ul>
        {{#parts}}
        <li>{{name}} (Qté: {{quantity}}) - Status: {{status}}</li>
        {{/parts}}
      </ul>
    </section>
  </div>
</div>`,
    css: `
.wo-container { font-family: 'Inter', sans-serif; padding: 20px; background: white; }
.wo-header { border-bottom: 4px solid black; padding-bottom: 10px; margin-bottom: 20px; }
.wo-badge { background: black; color: white; display: inline-block; padding: 4px 12px; font-weight: 900; font-size: 12px; }
h1 { margin: 10px 0; font-size: 32px; font-weight: 900; }
.wo-meta { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
section h3 { background: #eee; padding: 8px; font-size: 14px; font-weight: 800; border-left: 4px solid black; }`,
    placeholders: ['workOrderNumber', 'name', 'clientName', 'finishDate', 'parts']
  }
];

export const OutputTemplatesSettings: React.FC<OutputTemplatesSettingsProps> = ({
  templates,
  onUpdateTemplate,
  onAddTemplate
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [chatInput, setChatInput] = useState('');
  const [inspirationImage, setInspirationImage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'ai', content: string, image?: string}[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Initialize templates if none
  useEffect(() => {
    if (templates.length === 0) {
      DEFAULT_TEMPLATES.forEach(t => onAddTemplate(t));
    }
  }, [templates.length, onAddTemplate]);

  // Update selection if templates load
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInspirationImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAiEdit = async () => {
    if ((!chatInput.trim() && !inspirationImage) || !selectedTemplate) return;
    
    setIsAiProcessing(true);
    const userPrompt = chatInput || "Analyse ce document et adapte mon modèle pour qu'il s'en inspire.";
    const currentImage = inspirationImage;
    setChatInput('');
    setInspirationImage(null);
    setAiHistory(prev => [...prev, { role: 'user', content: userPrompt, image: currentImage || undefined }]);

    const systemPrompt = `You are an expert Frontend Designer specialized in industrial document reports.
      You will receive a template (HTML and CSS), a user request, and potentially an image/document for inspiration.
      
      RULES:
      1. Always maintain the placeholders (the things in {{double_braces}}).
      2. Return ONLY a valid JSON object with "html" and "css" keys.
      3. Do NOT include any markdown formatting like \`\`\`json.
      4. Use professional industrial design: clean typography, clear hierarchy, high contrast.
      5. If an image is provided, try to replicate its layout, color palette, and visual style while keeping the template framework.
      
      CURRENT TEMPLATE HTML:
      ${selectedTemplate.html}
      
      CURRENT TEMPLATE CSS:
      ${selectedTemplate.css}
      
      PLACEHOLDERS TO PRESERVE:
      ${selectedTemplate.placeholders.join(', ')}
      `;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined. Please check your environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { 
          parts: [
            { text: userPrompt },
            ...(currentImage ? [{
              inlineData: {
                data: currentImage.split(',')[1],
                mimeType: currentImage.split(';')[0].split(':')[1]
              }
            }] : [])
          ] 
        },
        config: {
          systemInstruction: systemPrompt,
        }
      });

      if (!response.text) {
        throw new Error("L'IA n'a pas retourné de texte.");
      }

      const responseText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const updated = JSON.parse(responseText);
        onUpdateTemplate({
          ...selectedTemplate,
          html: updated.html || selectedTemplate.html,
          css: updated.css || selectedTemplate.css
        });
        setAiHistory(prev => [...prev, { role: 'ai', content: "Mise à jour complétée avec succès ! J'ai ajusté le design selon tes instructions." }]);
      } catch (e) {
        console.error("AI Response Parsing Error:", e, responseText);
        setAiHistory(prev => [...prev, { role: 'ai', content: "Désolé, j'ai eu un problème pour générer un format valide. Peux-tu réessayer avec des instructions plus précises ?" }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setAiHistory(prev => [...prev, { role: 'ai', content: "Erreur de connexion avec l'IA. Vérifie ta configuration." }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const getPreviewHtml = () => {
    if (!selectedTemplate) return '';
    
    // Inject CSS into a simple wrapper
    return `
      <html>
        <head>
          <style>${selectedTemplate.css}</style>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        </head>
        <body>
          ${selectedTemplate.html}
        </body>
      </html>
    `;
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar: Template List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-indigo-500" />
            Modèles d'Output
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Éditeur de documents</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${
                selectedTemplateId === t.id 
                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                : 'bg-white border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-slate-800">{t.name}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</div>
            </button>
          ))}
          
          <button 
            onClick={() => onAddTemplate({
              name: 'Nouveau Modèle',
              description: 'Nouveau modèle personnalisé.',
              html: '<div>Bonjour {{name}}</div>',
              css: 'div { color: red; }',
              placeholders: ['name']
            })}
            className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all text-sm font-bold flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Ajouter un modèle
          </button>
        </div>
      </div>

      {/* Main Area: Preview & AI Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedTemplate ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
            <FileTextIcon className="w-16 h-16 opacity-10" />
            <p className="font-medium italic">Sélectionnez un modèle pour commencer l'édition</p>
          </div>
        ) : (
          <>
            {/* Header Controls */}
            <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    APERÇU
                  </button>
                  <button 
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    CODE
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-400 font-medium">
                  Placeholders: <span className="text-indigo-500 font-black">{selectedTemplate.placeholders.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Workspace */}
              <div className="flex-1 flex flex-col bg-slate-50 p-6 overflow-hidden">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex-1 border border-slate-200 flex flex-col">
                  {activeTab === 'preview' ? (
                    <iframe 
                      title="Template Preview"
                      srcDoc={getPreviewHtml()} 
                      className="w-full h-full border-none bg-white"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">HTML</h4>
                        <textarea 
                          value={selectedTemplate.html}
                          onChange={e => onUpdateTemplate({...selectedTemplate, html: e.target.value})}
                          className="w-full h-[40%] bg-slate-900 text-indigo-300 p-4 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CSS</h4>
                        <textarea 
                          value={selectedTemplate.css}
                          onChange={e => onUpdateTemplate({...selectedTemplate, css: e.target.value})}
                          className="w-full h-[40%] bg-slate-900 text-cyan-300 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Jarviss AI Sidepanel */}
              <div className="w-[400px] border-l border-slate-200 flex flex-col bg-slate-50">
                <div className="p-6 bg-white border-b border-slate-200">
                  <h3 className="flex items-center gap-2 font-black text-slate-900 tracking-tight">
                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                    Assistant Design
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">IA Google Studio</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {aiHistory.length === 0 && (
                    <div className="p-6 text-center space-y-4 opacity-50 grayscale">
                      <SparklesIcon className="w-12 h-12 mx-auto text-indigo-500" />
                      <p className="text-xs font-medium text-slate-500">
                        "Eille Karl! Dis-moi ce que tu veux changer. On peut changer la couleur, ajouter un logo, ou refaire le layout au complet."
                      </p>
                    </div>
                  )}
                  {aiHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.image && (
                        <div className="mb-2 max-w-[80%] rounded-xl overflow-hidden border-2 border-slate-200">
                          <img src={msg.image} alt="Inspiration" className="w-full h-auto object-cover max-h-48" />
                        </div>
                      )}
                      <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isAiProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-3">
                        <Loader2Icon className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calcul design...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-200">
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                  />

                  {inspirationImage && (
                    <div className="mb-3 relative inline-block">
                      <div className="w-20 h-20 rounded-xl border-2 border-indigo-100 overflow-hidden bg-slate-50">
                        {inspirationImage.startsWith('data:image/') ? (
                          <img src={inspirationImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PaperclipIcon className="w-8 h-8 text-indigo-400" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setInspirationImage(null)}
                        className="absolute -top-2 -right-2 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 shadow-sm"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="relative group">
                    <textarea 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Eille Karl! Explique ta vision ou uploade un exemple..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-24 text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none h-24"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiEdit();
                        }
                      }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Uploader une inspiration"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleAiEdit}
                        disabled={isAiProcessing || (!chatInput.trim() && !inspirationImage)}
                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                      >
                        <SendIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PlusCircle: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
