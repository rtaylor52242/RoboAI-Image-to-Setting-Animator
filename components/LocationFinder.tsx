import React, { useState } from 'react';
import { searchLocations, generateLocationImage } from '../services/geminiService';
import Button from './ui/Button';
import Card from './ui/Card';
import ReactMarkdown from 'react-markdown';
import { MapPin, Search, Image as ImageIcon } from 'lucide-react';

interface LocationFinderProps {
  onLocationSelected: (locationName: string, imageBase64: string) => void;
}

const LocationFinder: React.FC<LocationFinderProps> = ({ onLocationSelected }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resultText, setResultText] = useState('');
  const [suggestedPlaces, setSuggestedPlaces] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSuggestedPlaces([]);
    try {
      const { text } = await searchLocations(query);
      setResultText(text);
      
      // Rudimentary parse to find list items if the model lists them
      // This is a fallback if we don't get structured data.
      const lines = text.split('\n');
      const places = lines
        .filter(line => line.match(/^\d+\.|^[-*]\s/)) // Starts with 1. or - or *
        .map(line => line.replace(/^\d+\.|^[-*]\s/, '').trim())
        .slice(0, 5);
        
      if (places.length > 0) {
        setSuggestedPlaces(places);
      } else {
        // If no list format, just use the query itself as a potential "place" to confirm
        setSuggestedPlaces([query]);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to find locations. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (place: string) => {
    setIsGeneratingImage(true);
    try {
      // Strip any extra description text that might have been captured
      const cleanPlaceName = place.split(':')[0].split('-')[0].trim();
      const base64 = await generateLocationImage(cleanPlaceName);
      onLocationSelected(cleanPlaceName, base64);
    } catch (error) {
      console.error(error);
      alert("Failed to generate location setting. Please try another.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card title="Step 1: Find Your Setting">
        <form onSubmit={handleSearch} className="flex gap-4 mb-8">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'Cyberpunk Tokyo streets' or 'Best pizza in Rome'"
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Button type="submit" isLoading={isSearching}>
            <Search size={20} />
            Search
          </Button>
        </form>

        {resultText && (
          <div className="mb-8 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-sm font-bold text-blue-400 uppercase mb-2">Gemini Maps Result</h3>
            <div className="prose prose-invert text-sm max-w-none">
               <ReactMarkdown>{resultText}</ReactMarkdown>
            </div>
          </div>
        )}

        {suggestedPlaces.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Select a Location to Generate Setting</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {suggestedPlaces.map((place, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(place)}
                  disabled={isGeneratingImage}
                  className="text-left p-4 bg-slate-700 hover:bg-blue-900/30 border border-slate-600 hover:border-blue-500 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="text-blue-400 group-hover:text-blue-300" size={20} />
                    <span className="font-medium text-slate-200 group-hover:text-white">{place}</span>
                  </div>
                </button>
              ))}
            </div>
            {isGeneratingImage && (
              <div className="text-center py-8 animate-pulse">
                <ImageIcon className="mx-auto mb-2 text-blue-400" size={40} />
                <p className="text-blue-300">Generating high-fidelity environment with Nano Banana...</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default LocationFinder;