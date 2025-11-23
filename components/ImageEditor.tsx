import React, { useState, useRef, useEffect } from 'react';
import { editImage } from '../services/geminiService';
import Button from './ui/Button';
import Card from './ui/Card';
import { fileToBase64, mergeImages, downloadBase64 } from '../utils';
import { Upload, Wand2, RefreshCw, ArrowRight, Download, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageEditorProps {
  locationName: string;
  locationImage: string; // Base64
  onComplete: (finalImage: string) => void;
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ locationName, locationImage, onComplete, onBack }) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Composer State
  const [fgPos, setFgPos] = useState({ x: 0.5, y: 0.5 }); // Center (0-1)
  const [fgScale, setFgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  // Result Zoom State
  const [resultZoom, setResultZoom] = useState(1);
  const [resultPan, setResultPan] = useState({ x: 0, y: 0 });
  const [isPanningResult, setIsPanningResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // If we already have a composite, the prompt is for "Editing" it.
  const isEditingMode = !!compositeImage;

  // --- File Handling ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setUserImage(base64);
        // Reset composer
        setFgPos({ x: 0.5, y: 0.5 });
        setFgScale(1);
      } catch (err) {
        console.error(err);
        alert("Error reading file");
      }
    }
  };

  // --- Composer Logic (Drag & Drop) ---
  const handleComposerMouseDown = (e: React.MouseEvent) => {
    if (!userImage) return;
    setIsDragging(true);
  };

  const handleComposerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !composerRef.current) return;
    
    const rect = composerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setFgPos({ 
      x: Math.max(0, Math.min(1, x)), 
      y: Math.max(0, Math.min(1, y)) 
    });
  };

  const handleComposerMouseUp = () => {
    setIsDragging(false);
  };

  // --- Result Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (!compositeImage) return;
    e.preventDefault(); // Stop page scroll
    const delta = -e.deltaY * 0.001;
    setResultZoom(z => Math.max(1, Math.min(4, z + delta)));
  };

  const handleResultMouseDown = (e: React.MouseEvent) => {
    if (!compositeImage || resultZoom === 1) return;
    setIsPanningResult(true);
    panStartRef.current = { x: e.clientX - resultPan.x, y: e.clientY - resultPan.y };
  };

  const handleResultMouseMove = (e: React.MouseEvent) => {
    if (!isPanningResult) return;
    setResultPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleResultMouseUp = () => setIsPanningResult(false);

  // --- Action ---
  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (!isEditingMode) {
        // COMPOSITE STEP
        if (!userImage) return;
        
        // 1. Merge locally based on visual coordinates
        const mergedBase64 = await mergeImages(locationImage, userImage, fgPos.x, fgPos.y, fgScale);
        
        // 2. Send to Gemini to "Edit" (Refine/Blend)
        const refinePrompt = prompt 
          ? `Make this image look photorealistic and natural. ${prompt}`
          : "Make this composite image look photorealistic. Fix lighting, shadows, and perspective to make the subject blend naturally into the environment.";
          
        const result = await editImage(mergedBase64, refinePrompt);
        setCompositeImage(result);
        setPrompt(""); // Clear prompt
        setResultZoom(1); // Reset view
        setResultPan({x:0, y:0});
      } else {
        // EDIT STEP
        if (!compositeImage) return;
        const result = await editImage(compositeImage, prompt);
        setCompositeImage(result);
      }
    } catch (error) {
      console.error(error);
      alert("Generation failed. Try a different prompt.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" onMouseUp={() => { setIsDragging(false); setIsPanningResult(false); }}>
       <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            &larr; Back to Search
          </button>
          <div className="text-right">
             <h3 className="text-slate-400 text-sm">Current Location</h3>
             <p className="text-blue-400 font-bold">{locationName}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Composer */}
          <Card title="1. Compose Scene" className="h-full flex flex-col">
             <div className="flex-1 min-h-[400px] flex flex-col gap-4">
                
                {/* Visual Composer Area */}
                <div 
                  ref={composerRef}
                  className="relative w-full aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-600 shadow-inner group cursor-crosshair"
                  onMouseMove={handleComposerMouseMove}
                  onMouseLeave={handleComposerMouseUp}
                >
                  {/* Background Layer */}
                  <img 
                    src={`data:image/png;base64,${locationImage}`} 
                    alt="Background" 
                    className="w-full h-full object-cover pointer-events-none select-none" 
                  />

                  {/* Foreground Layer (Draggable) */}
                  {userImage && (
                    <div 
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move hover:ring-2 hover:ring-blue-500 rounded-lg transition-shadow"
                      style={{ 
                        left: `${fgPos.x * 100}%`, 
                        top: `${fgPos.y * 100}%`,
                        width: `${33 * fgScale}%`, // Base width 33% of container
                        zIndex: 10
                      }}
                      onMouseDown={handleComposerMouseDown}
                    >
                      <img 
                        src={`data:image/png;base64,${userImage}`} 
                        alt="You" 
                        className="w-full h-auto drop-shadow-2xl select-none"
                        draggable={false}
                      />
                      {/* Interaction Hint */}
                      {!isDragging && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Drag to move
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State Overlay */}
                  {!userImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all"
                       >
                         <Upload size={20} /> Upload Your Photo
                       </button>
                    </div>
                  )}
                </div>

                {/* Composer Controls */}
                {userImage && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Subject Size</span>
                      <span>{Math.round(fgScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.3" 
                      max="2.0" 
                      step="0.1" 
                      value={fgScale} 
                      onChange={(e) => setFgScale(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between mt-2">
                       <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Replace Photo
                       </button>
                       <p className="text-xs text-slate-500">Position the image where you want it.</p>
                    </div>
                  </div>
                )}
                
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
             </div>
          </Card>

          {/* RIGHT: Result */}
          <Card title={isEditingMode ? "2. Refine & Edit" : "2. Result"} className="h-full flex flex-col">
             <div 
               className="flex-1 mb-6 relative bg-slate-900 rounded-lg border border-slate-700 overflow-hidden min-h-[400px] flex items-center justify-center"
               onWheel={handleWheel}
               onMouseDown={handleResultMouseDown}
               onMouseMove={handleResultMouseMove}
               onMouseUp={handleResultMouseUp}
               onMouseLeave={handleResultMouseUp}
               ref={resultRef}
             >
                {compositeImage ? (
                   <>
                      <div 
                        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out origin-center cursor-grab active:cursor-grabbing"
                        style={{ transform: `translate(${resultPan.x}px, ${resultPan.y}px) scale(${resultZoom})` }}
                      >
                         <img 
                           src={`data:image/png;base64,${compositeImage}`} 
                           alt="Result" 
                           className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl" 
                         />
                      </div>

                      {/* Floating Toolbar */}
                      <div className="absolute bottom-4 right-4 flex gap-2">
                         <div className="bg-slate-800/90 backdrop-blur p-1 rounded-lg border border-slate-600 flex items-center gap-1 shadow-xl">
                            <button onClick={() => setResultZoom(z => Math.min(4, z + 0.5))} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Zoom In">
                               <ZoomIn size={18} />
                            </button>
                            <button onClick={() => setResultZoom(z => Math.max(1, z - 0.5))} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Zoom Out">
                               <ZoomOut size={18} />
                            </button>
                            <div className="w-px h-6 bg-slate-600 mx-1"></div>
                            <button 
                                onClick={() => { setResultZoom(1); setResultPan({x:0, y:0}); }} 
                                className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                                title="Reset View"
                            >
                               <Move size={18} />
                            </button>
                         </div>
                         
                         <button 
                            onClick={() => downloadBase64(compositeImage, `robo-ai-${Date.now()}.png`)}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg shadow-lg border border-blue-400/30 transition-all"
                            title="Download Image"
                         >
                            <Download size={20} />
                         </button>
                      </div>
                   </>
                ) : (
                   <div className="text-center p-8 text-slate-500">
                      <Wand2 className="mx-auto mb-4 opacity-30" size={48} />
                      <p>Result will appear here</p>
                      <p className="text-xs mt-2 opacity-50">Drag your photo on the left, then click Generate.</p>
                   </div>
                )}
             </div>

             <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                     !isEditingMode 
                       ? "Optional: Add details for blending (e.g. 'Make it sunset lighting', 'Add a shadow on the ground')." 
                       : "Refine further: e.g. 'Add a retro filter', 'Make it look like a painting'."
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none placeholder:text-slate-500"
                />
                
                <div className="flex gap-3">
                   <Button 
                     onClick={handleAction} 
                     disabled={!userImage || isProcessing} 
                     isLoading={isProcessing}
                     className="flex-1"
                   >
                      <Wand2 size={18} />
                      {isEditingMode ? "Apply Edit" : "Generate Composite"}
                   </Button>
                   
                   {compositeImage && (
                      <Button onClick={() => onComplete(compositeImage)} variant="secondary" className="bg-green-600 hover:bg-green-500 border-green-500 text-white shadow-none">
                        Next: Animate <ArrowRight size={18} />
                      </Button>
                   )}
                </div>
             </div>
          </Card>
       </div>
    </div>
  );
};

export default ImageEditor;