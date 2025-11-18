import React, { useState, useRef } from 'react';
import { compositeImages, editImage } from '../services/geminiService';
import Button from './ui/Button';
import Card from './ui/Card';
import { fileToBase64, cleanBase64 } from '../utils';
import { Upload, Wand2, RefreshCw, ArrowRight } from 'lucide-react';

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

  // If we already have a composite, the prompt is for "Editing" it.
  // If not, the prompt is for "Compositing" the user + location.
  const isEditingMode = !!compositeImage;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setUserImage(base64);
      } catch (err) {
        console.error(err);
        alert("Error reading file");
      }
    }
  };

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (!isEditingMode) {
        // Composite Step
        if (!userImage) return;
        const result = await compositeImages(locationImage, userImage, prompt);
        setCompositeImage(result);
        setPrompt(""); // Clear prompt for next step
      } else {
        // Edit Step (Refine)
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
    <div className="max-w-4xl mx-auto space-y-8">
       <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2">
            &larr; Back to Search
          </button>
          <div className="text-right">
             <h3 className="text-slate-400 text-sm">Current Location</h3>
             <p className="text-blue-400 font-bold">{locationName}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Source Images */}
          <Card title="Source Assets" className="h-full">
             <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-400 mb-2">Location (Background)</p>
                    <img src={`data:image/png;base64,${locationImage}`} alt="Location" className="w-full h-48 object-cover rounded-lg border border-slate-600" />
                </div>
                
                <div>
                   <p className="text-sm text-slate-400 mb-2">You (Foreground)</p>
                   {!userImage ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-700/50 transition-all"
                      >
                        <Upload className="text-slate-400 mb-2" />
                        <span className="text-slate-400">Click to upload photo</span>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </div>
                   ) : (
                      <div className="relative group">
                         <img src={`data:image/png;base64,${userImage}`} alt="User" className="w-full h-48 object-cover rounded-lg border border-slate-600" />
                         <button 
                           onClick={() => setUserImage(null)}
                           className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <RefreshCw size={14} />
                         </button>
                      </div>
                   )}
                </div>
             </div>
          </Card>

          {/* Result & Controls */}
          <Card title={isEditingMode ? "Refine Image" : "Composite"} className="h-full flex flex-col">
             <div className="flex-1 mb-6 flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden min-h-[300px]">
                {compositeImage ? (
                   <img src={`data:image/png;base64,${compositeImage}`} alt="Result" className="w-full h-full object-contain" />
                ) : (
                   <div className="text-center p-8 text-slate-500">
                      <Wand2 className="mx-auto mb-4 opacity-50" size={48} />
                      <p>Result will appear here</p>
                   </div>
                )}
             </div>

             <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                     !isEditingMode 
                       ? "Optional: Describe how you want to be placed (e.g., 'Standing in the center looking at the sunset')." 
                       : "Edit the image: e.g. 'Add a retro filter', 'Remove the person in the background', 'Make it night time'."
                  }
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
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