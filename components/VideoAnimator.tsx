import React, { useState } from 'react';
import { generateVeoVideo } from '../services/geminiService';
import Button from './ui/Button';
import Card from './ui/Card';
import { Video, Download, RotateCcw, AlertTriangle } from 'lucide-react';

interface VideoAnimatorProps {
  sourceImage: string; // Base64
  onBack: () => void;
}

const VideoAnimator: React.FC<VideoAnimatorProps> = ({ sourceImage, onBack }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
       const url = await generateVeoVideo(sourceImage, prompt, aspectRatio);
       setVideoUrl(url);
    } catch (error: any) {
       console.error(error);
       const msg = error?.message || "Unknown error";
       if (msg.includes("select")) {
         alert("You must select a billing project/API Key in the popup to continue.");
       } else {
         alert("Video generation failed. Please try again.");
       }
    } finally {
       setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
       <button onClick={onBack} className="text-slate-400 hover:text-white mb-4 flex items-center gap-2">
          &larr; Back to Editing
       </button>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Veo Animation Settings">
             <div className="space-y-6">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
                   <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the animation: 'A cinematic slow pan to the right', 'The person waves at the camera', 'Leaves blowing in the wind'."
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white h-32 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setAspectRatio("16:9")}
                        className={`px-4 py-2 rounded border ${aspectRatio === "16:9" ? "bg-purple-600 border-purple-500 text-white" : "bg-slate-800 border-slate-600 text-slate-400"}`}
                      >
                        Landscape (16:9)
                      </button>
                      <button 
                        onClick={() => setAspectRatio("9:16")}
                        className={`px-4 py-2 rounded border ${aspectRatio === "9:16" ? "bg-purple-600 border-purple-500 text-white" : "bg-slate-800 border-slate-600 text-slate-400"}`}
                      >
                        Portrait (9:16)
                      </button>
                   </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg flex items-start gap-3">
                   <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                   <p className="text-sm text-yellow-200">
                      Video generation uses the <strong>Veo</strong> model. You will be asked to select your Google Cloud project/API key via a popup if you haven't already.
                   </p>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  isLoading={isGenerating} 
                  className="w-full bg-purple-600 hover:bg-purple-500 border-purple-400/30 shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                >
                   <Video size={20} />
                   Generate Video
                </Button>
             </div>
          </Card>

          <Card title="Result">
             <div className="h-full min-h-[400px] bg-black rounded-lg flex items-center justify-center overflow-hidden border border-slate-700 relative">
                {videoUrl ? (
                   <div className="w-full h-full flex flex-col">
                      <video 
                         src={videoUrl} 
                         controls 
                         autoPlay 
                         loop 
                         className="w-full h-full object-contain"
                      />
                      <a 
                        href={videoUrl} 
                        download="veo-generation.mp4"
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-full text-white hover:bg-blue-600 transition-colors"
                      >
                         <Download size={20} />
                      </a>
                   </div>
                ) : (
                   <div className="text-center text-slate-500">
                      {isGenerating ? (
                         <div className="animate-pulse">
                            <Video className="mx-auto mb-4 text-purple-500" size={48} />
                            <p>Dreaming up your video...</p>
                            <p className="text-xs mt-2 opacity-70">This may take a minute.</p>
                         </div>
                      ) : (
                         <>
                            <Video className="mx-auto mb-4 opacity-30" size={48} />
                            <p>Generated video will play here</p>
                         </>
                      )}
                   </div>
                )}
             </div>
          </Card>
       </div>
    </div>
  );
};

export default VideoAnimator;