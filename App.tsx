import React, { useState } from 'react';
import { AppStep } from './types';
import LocationFinder from './components/LocationFinder';
import ImageEditor from './components/ImageEditor';
import VideoAnimator from './components/VideoAnimator';
import { MapPin, Image as ImageIcon, Video, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SEARCH);
  
  // State for passing data between steps
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [selectedLocationImage, setSelectedLocationImage] = useState<string>(''); // Base64
  const [finalCompositeImage, setFinalCompositeImage] = useState<string>(''); // Base64

  // --- Handlers ---

  const handleLocationSelected = (name: string, imageBase64: string) => {
    setSelectedLocationName(name);
    setSelectedLocationImage(imageBase64);
    setCurrentStep(AppStep.COMPOSITE);
  };

  const handleCompositionComplete = (compositeBase64: string) => {
    setFinalCompositeImage(compositeBase64);
    setCurrentStep(AppStep.ANIMATE);
  };

  // --- Render ---

  const renderStepIndicator = () => {
    const steps = [
      { id: AppStep.SEARCH, label: 'Find Location', icon: MapPin },
      { id: AppStep.COMPOSITE, label: 'Composite & Edit', icon: ImageIcon },
      { id: AppStep.ANIMATE, label: 'Animate', icon: Video },
    ];

    const activeIdx = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-4 bg-slate-800/80 p-2 rounded-full border border-slate-700 backdrop-blur-sm">
          {steps.map((step, idx) => {
             const isActive = step.id === currentStep;
             const isPast = steps.findIndex(s => s.id === currentStep) > idx;
             
             return (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full transition-all
                      ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : ''}
                      ${isPast ? 'text-blue-400' : 'text-slate-500'}
                    `}
                  >
                    <step.icon size={16} />
                    <span className={`text-sm font-bold ${!isActive && !isPast && 'opacity-50'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${isPast ? 'bg-blue-500' : 'bg-slate-700'}`} />
                  )}
                </div>
             );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1534239143101-1b1c627395c5?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center bg-fixed bg-no-repeat">
      <div className="min-h-screen bg-slate-900/90 backdrop-blur-sm flex flex-col">
        
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Robo<span className="text-blue-400">AI</span> <span className="text-slate-400 font-normal text-lg ml-2 hidden sm:inline">Image to Setting Animator</span>
              </h1>
            </div>
            <div className="text-xs text-slate-500 font-mono border border-slate-800 rounded px-2 py-1">
              v3.1.0
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
          
          {renderStepIndicator()}

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentStep === AppStep.SEARCH && (
              <LocationFinder onLocationSelected={handleLocationSelected} />
            )}

            {currentStep === AppStep.COMPOSITE && (
              <ImageEditor 
                locationName={selectedLocationName}
                locationImage={selectedLocationImage}
                onComplete={handleCompositionComplete}
                onBack={() => setCurrentStep(AppStep.SEARCH)}
              />
            )}

            {currentStep === AppStep.ANIMATE && (
              <VideoAnimator 
                sourceImage={finalCompositeImage}
                onBack={() => setCurrentStep(AppStep.COMPOSITE)}
              />
            )}
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-slate-500 text-sm">
           <p>Powered by Gemini 2.5 Flash, Nano Banana, and Veo.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;