import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import {
  UploadCloud,
  SparklesIcon,
  CheckIcon,
  SendIcon,
  MicIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ComponentItem {
  label: string;
  description: string;
  points: [number, number][];
  properties?: {
    dimensions?: string;
    thickness?: string;
    material?: string;
    quantity?: string;
  };
}

interface JarvissVisionScannerProps {
  onScanComplete?: (items: ComponentItem[]) => void;
  onSelectBox?: (item: ComponentItem) => void;
  initialSessions?: Partial<ScanSession>[];
  onChange?: (sessions: Partial<ScanSession>[]) => void;
}

export interface ScanSession {
  id: string;
  file?: File;
  src: string;
  isScanning: boolean;
  items: ComponentItem[];
  selectedItem: number | null;
  chatHistory: { role: "user" | "model"; text: string }[];
  isChatting: boolean;
}

export const JarvissVisionScanner: React.FC<JarvissVisionScannerProps> = ({
  onScanComplete,
  onSelectBox,
  initialSessions,
  onChange
}) => {
  const [sessions, setSessions] = useState<ScanSession[]>(initialSessions || []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessions && initialSessions.length > 0 ? initialSessions[0].id : null);

  useEffect(() => {
    if (onChange) {
      // Only emit safely serializable fields
      const safeSessions = sessions.map(s => ({
         id: s.id,
         src: s.src,
         items: s.items,
         selectedItem: s.selectedItem,
         chatHistory: s.chatHistory
      }));
      onChange(safeSessions);
    }
  }, [sessions]);

  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [draggingPoint, setDraggingPoint] = useState<{
    itemIdx: number;
    pointIdx: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const activeSessionIndex = sessions.findIndex(
    (s) => s.id === activeSessionId,
  );
  const activeSession =
    activeSessionIndex >= 0 ? sessions[activeSessionIndex] : null;

  const updateActiveSession = (
    updater: (session: ScanSession) => Partial<ScanSession>,
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, ...updater(s) };
        }
        return s;
      }),
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newSession: ScanSession = {
          id: Math.random().toString(),
          file,
          src: base64,
          isScanning: false,
          items: [],
          selectedItem: null,
          chatHistory: [],
          isChatting: false,
        };
        setSessions((prev) => [...prev, newSession]);
        setActiveSessionId(newSession.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSession = (idToRemove: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== idToRemove);
      if (activeSessionId === idToRemove) {
        setActiveSessionId(
          filtered.length > 0 ? filtered[filtered.length - 1].id : null,
        );
      }
      return filtered;
    });
  };

  const analyzeImage = async () => {
    if (!activeSession) return;
    updateActiveSession(() => ({ isScanning: true }));
    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        // @ts-expect-error vite env
        import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error("API key non trouvée");
        alert("Veuillez configurer GEMINI_API_KEY");
        updateActiveSession(() => ({ isScanning: false }));
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      let base64Img = "";
      let mimeType = "image/jpeg";
      if (activeSession.src && activeSession.src.startsWith("data:")) {
        const parts = activeSession.src.split(",");
        base64Img = parts[1];
        mimeType = parts[0].split(":")[1].split(";")[0];
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            text: `Identifie STRICTEMENT TOUS LES ÉLÉMENTS INDIVIDUELS ET SOUS-COMPOSANTES (chaque marche, chaque main courante, chaque montant, chaque plaque, chaque pièce découpée, chaque tube, profilé structurel, ou quincaillerie...) SÉPARÉMENT dans cette image pour la préparation d'une soumission très détaillée. Ne groupe pas l'assemblage principal ensemble; tu dois le décomposer en toutes ses sous-pièces visibles. Au lieu d'une boîte, tu dois fournir un contour polygone précis ("points") permettant de détourer la forme exacte de chaque pièce individuelle, comme un lasso. Fournis au moins 10 à 20 points formant un contour fermé [y, x] en entiers de 0 à 1000 selon la taille de l'image.`,
          },
          {
            inlineData: {
              data: base64Img,
              mimeType: mimeType,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: {
                      type: Type.STRING,
                      description: "Nom court de l'item",
                    },
                    description: {
                      type: Type.STRING,
                      description:
                        "Description détaillée incluant l'évaluation des dimensions approximatives, l'épaisseur, la longueur, la quantité, et le matériel détecté.",
                    },
                    properties: {
                      type: Type.OBJECT,
                      description: "Propriétés techniques estimées de la pièce",
                      properties: {
                        dimensions: { type: Type.STRING, description: "Dimension générale ex: 100x100" },
                        thickness: { type: Type.STRING, description: "Épaisseur estimée ex: 1/4\"" },
                        material: { type: Type.STRING, description: "Type de matériau ex: Acier, Aluminium" },
                        quantity: { type: Type.STRING, description: "Quantité apparente" },
                      }
                    },
                    points: {
                      type: Type.ARRAY,
                      description:
                        "Contour de la forme exacte. Liste de coordonnées [y, x] de 0 à 1000",
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                      },
                    },
                  },
                  required: ["label", "description", "points"],
                },
              },
            },
            required: ["items"],
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.items) {
          updateActiveSession(() => ({ items: data.items }));
          if (onScanComplete) {
            onScanComplete(data.items);
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'analyse par Jarviss");
    } finally {
      updateActiveSession(() => ({ isScanning: false }));
    }
  };

  const sendMessageToJarviss = async (text: string) => {
    if (!text.trim() || !activeSession) return;

    const newChatHistory = [
      ...activeSession.chatHistory,
      { role: "user" as const, text },
    ];
    updateActiveSession(() => ({
      chatHistory: newChatHistory,
      isChatting: true,
    }));
    setChatMessage("");

    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        // @ts-expect-error vite env
        import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) return;
      const ai = new GoogleGenAI({ apiKey });

      let context =
        "Tu es Jarviss, un expert pour analyser des images d'ingénierie et de soumission T-M. ";

      const selectedIdx = activeSession.selectedItem;
      if (selectedIdx !== null && activeSession.items[selectedIdx]) {
        const selected = activeSession.items[selectedIdx];
        context += `\n\n[CONTEXTE ACTUEL FOCUS]: L'utilisateur a présentement sélectionné la sous-composante #${selectedIdx + 1} de l'image: "${selected.label}". Description détectée initialement: "${selected.description}". Tu dois aider l'utilisateur à extraire et raffiner les informations (matériaux, dimensions, épaisseur, longueur, quantité) spécifiquement pour CE composant afin d'affiner la soumission.`;
      } else {
        context += `\n\n[CONTEXTE GLOBAL]: L'utilisateur regarde l'image, comprenant ${activeSession.items.length} composants détectés.`;
      }

      const contents = newChatHistory.map((msg) => ({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));
      contents[0].parts[0].text = context + "\n\n" + contents[0].parts[0].text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response_text: {
                type: Type.STRING,
                description: "La réponse à afficher à l'utilisateur.",
              },
              properties: {
                type: Type.OBJECT,
                description: "Les informations techniques mises à jour pour CE composant SEULEMENT s'il est sélectionné.",
                properties: {
                  dimensions: { type: Type.STRING, description: "Dimension générale ex: 100x100" },
                  thickness: { type: Type.STRING, description: "Épaisseur estimée ex: 1/4\"" },
                  material: { type: Type.STRING, description: "Type de matériau ex: Acier, Aluminium" },
                  quantity: { type: Type.STRING, description: "Quantité apparente" },
                }
              }
            },
            required: ["response_text"],
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        updateActiveSession((prev) => {
          const updatedItems = [...prev.items];
          if (selectedIdx !== null && data.properties) {
            updatedItems[selectedIdx] = {
              ...updatedItems[selectedIdx],
              properties: {
                ...updatedItems[selectedIdx].properties,
                ...data.properties
              }
            };
          }

          return {
            items: updatedItems,
            chatHistory: [
              ...prev.chatHistory,
              { role: "model", text: data.response_text },
            ],
          };
        });
      }
    } catch (err) {
      console.error(err);
      updateActiveSession((prev) => ({
        chatHistory: [
          ...prev.chatHistory,
          { role: "model", text: "Erreur de communication avec Jarviss." },
        ],
      }));
    } finally {
      updateActiveSession(() => ({ isChatting: false }));
    }
  };

  const startVoiceLive = () => {
    if (!activeSession) return;
    let instruction =
      "Tu es Jarviss. Tu aides l'utilisateur à créer et quantifier un item pour une soumission 'Temps et Matériel'.";

    const selectedIdx = activeSession.selectedItem;
    if (selectedIdx !== null && activeSession.items[selectedIdx]) {
      const selected = activeSession.items[selectedIdx];
      instruction += `\nL'utilisateur vient de scanner/sélectionner spécifiquement la composante #${selectedIdx + 1}: "${selected.label} - ${selected.description}". Assiste-le DANS LE CONTEXTE DE CETTE SOUS-COMPOSANTE pour évaluer le temps de travail, les dimensions, épaisseurs, longueurs, le bon matériel, et le coût. Pose-lui des questions ciblées si des informations manquent.`;
    } else {
      instruction += `\nL'utilisateur regarde une vue d'ensemble avec ${activeSession.items.length} items détectés. Guide-le pour analyser et ajouter ces éléments à la soumission.`;
    }

    try {
      window.dispatchEvent(
        new CustomEvent("openGeminiLive", {
          detail: {
            toggle: true,
            instruction,
          },
        }),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const drawShapesOnCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !activeSession) return;

    // Utilize intrinsic dimensions so CSS w-full shapes exactly the pixels over the image
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeSession.selectedItem !== null) {
      ctx.filter = "blur(6px) brightness(40%)";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
    }

    const validItems = activeSession.items.filter(
      (item) => item.points && item.points.length > 2,
    );

    validItems.forEach((item, idx) => {
      const isSelected = activeSession.selectedItem === idx;

      const path = new Path2D();
      item.points.forEach(([y, x], i) => {
        const realX = (x / 1000) * canvas.width;
        const realY = (y / 1000) * canvas.height;
        if (i === 0) path.moveTo(realX, realY);
        else path.lineTo(realX, realY);
      });
      path.closePath();

      if (activeSession.selectedItem === null || isSelected) {
        ctx.save();

        if (activeSession.selectedItem !== null) {
          ctx.clip(path);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = isSelected
          ? "rgba(59, 130, 246, 0.3)"
          : "rgba(34, 197, 94, 0.15)";
        ctx.fill(path);

        ctx.strokeStyle = isSelected ? "#3b82f6" : "#22c55e";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke(path);

        // Draw manipulation nodes if selected
        if (isSelected) {
          item.points.forEach(([y, x]) => {
            const px = (x / 1000) * canvas.width!;
            const py = (y / 1000) * canvas.height!;
            ctx.beginPath();
            ctx.arc(px, py, 35, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#3b82f6";
            ctx.stroke();
          });
        }

        ctx.restore();

        const minY = Math.min(...item.points.map((p) => p[0]));
        const minXNode = item.points.find((p) => p[0] === minY);
        const realX = minXNode
          ? (minXNode[1] / 1000) * canvas.width
          : canvas.width / 2;
        const realY = (minY / 1000) * canvas.height;

        const labelText = isSelected ? `${item.label}` : item.label;
        const fontSize = isSelected ? "90px" : "40px";
        const pxWidth = isSelected ? 80 : 40;
        const rectHeight = isSelected ? 120 : 60;
        const topOfRect = isSelected ? realY - 140 : realY - 80;

        ctx.font = `600 ${fontSize} Inter, sans-serif`;
        const labelW = ctx.measureText(labelText).width + pxWidth;

        ctx.fillStyle = isSelected ? "#4f46e5" : "rgba(0, 0, 0, 0.8)";
        ctx.beginPath();
        ctx.roundRect(realX - labelW / 2, topOfRect, labelW, rectHeight, 16);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(labelText, realX, topOfRect + (isSelected ? 85 : 45));
      }
    });
  };

  useEffect(() => {
    drawShapesOnCanvas();
  }, [
    activeSession?.items,
    activeSession?.selectedItem,
    activeSession?.src,
    activeSessionId,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.chatHistory, activeSession?.isChatting]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeSession) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Check if clicking on an existing point of the selected item
    if (activeSession.selectedItem !== null) {
      const item = activeSession.items[activeSession.selectedItem];
      for (let i = 0; i < item.points.length; i++) {
        const [y, x] = item.points[i];
        const px = (x / 1000) * canvas.width;
        const py = (y / 1000) * canvas.height;
        const dist = Math.hypot(px - clickX, py - clickY);
        if (dist <= 80) {
          // 80px radius for easier grabbing
          setDraggingPoint({
            itemIdx: activeSession.selectedItem,
            pointIdx: i,
          });
          return; // Stop here, we are dragging
        }
      }
    }

    // 2. Fallback: check if clicking on any polynomial to select it
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let clickedBoxIndex: number | null = null;
    for (let i = activeSession.items.length - 1; i >= 0; i--) {
      const item = activeSession.items[i];
      if (item.points && item.points.length > 2) {
        const path = new Path2D();
        item.points.forEach(([y, x], j) => {
          const realX = (x / 1000) * canvas.width;
          const realY = (y / 1000) * canvas.height;
          if (j === 0) path.moveTo(realX, realY);
          else path.lineTo(realX, realY);
        });
        path.closePath();

        if (ctx.isPointInPath(path, clickX, clickY)) {
          clickedBoxIndex = i;
          break;
        }
      }
    }

    if (clickedBoxIndex !== null) {
      updateActiveSession(() => ({ selectedItem: clickedBoxIndex }));
    } else {
      updateActiveSession(() => ({ selectedItem: null }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingPoint) return;
    const canvas = canvasRef.current;
    if (!canvas || !activeSession) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Convert back to 0-1000 scale
    const normX = Math.max(0, Math.min(1000, (mouseX / canvas.width) * 1000));
    const normY = Math.max(0, Math.min(1000, (mouseY / canvas.height) * 1000));

    const newItems = [...activeSession.items];
    const item = { ...newItems[draggingPoint.itemIdx] };
    const newPoints = [...item.points];
    newPoints[draggingPoint.pointIdx] = [Math.round(normY), Math.round(normX)];
    item.points = newPoints;
    newItems[draggingPoint.itemIdx] = item;

    updateActiveSession(() => ({ items: newItems }));
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-indigo-600" />
            Jarviss Vision Scanner
          </h3>
          {sessions.length > 0 && (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="flex items-center gap-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-3 rounded-lg transition-colors pointer-events-none">
                <PlusIcon className="w-4 h-4" /> Ajouter Photo
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Prenez ou chargez des photos. Jarviss identifiera les
          sous-composantes. Naviguez entre vos photos et cliquez sur un élément
          pour le mettre en surbrillance.
        </p>

        {sessions.length === 0 ? (
          <div className="w-full relative py-12 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-600">
              Appuyez pour prendre ou choisir une photo
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Session Navigation */}
            {sessions.length > 1 && (
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 mt-2">
                <button
                  disabled={activeSessionIndex === 0}
                  onClick={() =>
                    setActiveSessionId(sessions[activeSessionIndex - 1].id)
                  }
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <div className="text-sm font-medium text-gray-600 flex gap-2">
                  {sessions.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      className={`w-3 h-3 rounded-full transition-colors ${idx === activeSessionIndex ? "bg-indigo-600" : "bg-gray-300 hover:bg-gray-400"}`}
                    />
                  ))}
                </div>
                <button
                  disabled={activeSessionIndex === sessions.length - 1}
                  onClick={() =>
                    setActiveSessionId(sessions[activeSessionIndex + 1].id)
                  }
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}

            {activeSession && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Photo {activeSessionIndex + 1} de {sessions.length}
                  </span>
                  <button
                    onClick={() => removeSession(activeSession.id)}
                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                    title="Supprimer cette photo"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center min-h-[200px] p-2">
                  <div className="relative inline-block max-w-full">
                    <img
                      ref={imageRef}
                      src={activeSession.src}
                      alt="Scan reference"
                      className="block max-w-full max-h-[50vh] xl:max-h-[60vh] w-auto h-auto rounded shadow-sm"
                      onLoad={drawShapesOnCanvas}
                    />
                    <canvas
                      ref={canvasRef}
                      className={`absolute inset-0 w-full h-full z-10 ${draggingPoint ? "cursor-grabbing" : "cursor-crosshair"}`}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                  </div>

                  {activeSession.isScanning && (
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mb-4"
                      >
                        <SparklesIcon className="w-8 h-8 opacity-80" />
                      </motion.div>
                      <p className="font-medium">
                        Analyse structurelle en cours...
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-between">
                  {activeSession.items.length === 0 && (
                    <button
                      onClick={analyzeImage}
                      disabled={activeSession.isScanning}
                      className="w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <SparklesIcon className="w-5 h-5" />
                      Identifier les sous-composantes
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeSession && activeSession.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-[450px]">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h4 className="font-semibold text-gray-900 flex flex-col max-w-[60%]">
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-fmi-red" />
                  Discussion Jarviss
                </span>
                {activeSession.selectedItem !== null && (
                  <span className="text-xs text-indigo-600 font-medium mt-1 pr-2 truncate">
                    Focus:{" "}
                    {activeSession.items[activeSession.selectedItem].label}
                  </span>
                )}
              </h4>
              <button
                onClick={startVoiceLive}
                className="text-fmi-red hover:bg-red-50 p-1.5 rounded-full transition-colors flex items-center gap-1 text-sm font-medium pr-3 shrink-0"
              >
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <MicIcon className="w-3.5 h-3.5" />
                </div>
                <span>Jarviss Audio</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {activeSession.chatHistory.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-10">
                  <SparklesIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>
                    Posez une question sur l'item sélectionné pour préciser le
                    matériel, l'épaisseur, la longueur ou la quantité.
                  </p>
                </div>
              )}
              {activeSession.chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none text-sm"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {activeSession.isChatting && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.2,
                      }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.4,
                      }}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessageToJarviss(chatMessage);
              }}
              className="mt-auto relative"
            >
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={
                  activeSession.selectedItem !== null
                    ? "Ex: Quelle épaisseur pour ce tube ?"
                    : "Ex: Détailles la liste."
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || activeSession.isChatting}
                className="absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-inner flex flex-col h-[450px]">
            <h4 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {activeSession.items.length}
              </span>
              Sous-composantes
            </h4>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              <AnimatePresence>
                {activeSession.items.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white border rounded-xl flex flex-col overflow-hidden cursor-pointer shadow-sm transition-all ${activeSession.selectedItem === i ? "ring-2 ring-indigo-500 border-transparent shadow-md" : "border-gray-200 hover:border-indigo-300"}`}
                    onClick={() => {
                      updateActiveSession(() => ({ selectedItem: i }));
                    }}
                  >
                    <div
                      className={`px-4 py-3 border-b flex justify-between items-center ${activeSession.selectedItem === i ? "bg-indigo-50 border-indigo-100" : "border-gray-100"}`}
                    >
                      <h4
                        className="font-semibold text-gray-900 line-clamp-1 text-sm pr-2"
                        title={b.label}
                      >
                        {i + 1}. {b.label}
                      </h4>
                      {activeSession.selectedItem === i && (
                        <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <div className="p-4 text-xs text-gray-600 flex-1 flex flex-col gap-3">
                      <p className="text-balance leading-relaxed">
                        {b.description}
                      </p>

                      {activeSession.selectedItem === i && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                          <div className="col-span-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                            Informations extraites de l'image
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Matériau</label>
                            <input 
                              type="text" 
                              value={b.properties?.material || ""} 
                              onChange={(e) => {
                                const newItems = [...activeSession.items];
                                newItems[i].properties = { ...newItems[i].properties, material: e.target.value };
                                updateActiveSession(() => ({ items: newItems }));
                              }}
                              className="w-full text-xs p-1 border rounded" 
                              placeholder="ex: Acier" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Épaisseur</label>
                            <input 
                              type="text" 
                              value={b.properties?.thickness || ""} 
                              onChange={(e) => {
                                const newItems = [...activeSession.items];
                                newItems[i].properties = { ...newItems[i].properties, thickness: e.target.value };
                                updateActiveSession(() => ({ items: newItems }));
                              }}
                              className="w-full text-xs p-1 border rounded" 
                              placeholder="ex: 1/4&quot;" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Dimensions</label>
                            <input 
                              type="text" 
                              value={b.properties?.dimensions || ""} 
                              onChange={(e) => {
                                const newItems = [...activeSession.items];
                                newItems[i].properties = { ...newItems[i].properties, dimensions: e.target.value };
                                updateActiveSession(() => ({ items: newItems }));
                              }}
                              className="w-full text-xs p-1 border rounded" 
                              placeholder="ex: 12x12" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantité</label>
                            <input 
                              type="text" 
                              value={b.properties?.quantity || ""} 
                              onChange={(e) => {
                                const newItems = [...activeSession.items];
                                newItems[i].properties = { ...newItems[i].properties, quantity: e.target.value };
                                updateActiveSession(() => ({ items: newItems }));
                              }}
                              className="w-full text-xs p-1 border rounded" 
                              placeholder="ex: 1" 
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button
                          className="col-span-2 w-full px-3 py-2 bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectBox) onSelectBox(b);
                          }}
                        >
                          <PlusIcon className="w-4 h-4" /> Ajouter à T-M
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
