import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MicIcon, SendIcon, Loader2Icon, MicOffIcon } from 'lucide-react';

interface AiQuoteChatboxProps {
  quoteId: string;
  onUpdateQuote: (items: { name: string; quantity: number; unitPrice: number; type?: string; isAiGenerated?: boolean; aiStatus?: string }[]) => void;
  systemPrompt?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export const AiQuoteChatbox: React.FC<AiQuoteChatboxProps> = ({ onUpdateQuote, systemPrompt }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const DEFAULT_PROMPT = `Tu es Jarviss, l'expert IA du Groupe FMI. 
        Salue toujours l'utilisateur par son nom (Karl) avec une touche d'humour.
        Le but est d'aider Karl à créer des soumissions, incluant des "Soumissions Temps-Matériel" (Projets).
        Si l'utilisateur décrit des besoins sans matériel précis (ex: beaucoup de sucre, édulcorant), crée des items avec "type": "project".`;

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;
    
    const userMessage = { role: 'user' as const, text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
            { role: 'user', parts: [{ text: messageText }] }
        ],
        config: {
            systemInstruction: systemPrompt || DEFAULT_PROMPT,
            responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text);
      setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
      
      // Speak the AI response
      speak(data.message);
      
      if (data.action !== 'none') {
        onUpdateQuote(data.items);
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      const errorMsg = "Désolé, une erreur est survenue.";
      setMessages(prev => [...prev, { role: 'ai', text: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsAiLoading(false);
    }
  }, [DEFAULT_PROMPT, input, onUpdateQuote, speak, systemPrompt]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto-send after a short delay to let the user see the text
        setTimeout(() => handleSendMessage(transcript), 500);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
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

  return (
    <div className="flex flex-col h-96 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
      <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Assistant Vocal IA</span>
        </div>
        <div className="flex items-center gap-2">
          {isListening && (
            <span className="text-[10px] font-bold text-red-500 animate-pulse uppercase">À l'écoute...</span>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <MicIcon className="w-8 h-8 opacity-20" />
            <p className="text-xs">Cliquez sur le micro pour parler ou tapez votre message.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-center">
          <button 
            onClick={toggleListening}
            className={`p-3 rounded-full transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
          >
            {isListening ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? "Je vous écoute..." : "Décrivez vos pièces..."}
              className="w-full text-sm border-slate-200 rounded-full pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={isAiLoading || !input.trim()} 
              className="absolute right-1.5 top-1.5 p-1.5 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-30 transition-colors"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
