export interface LocationResult {
  title: string;
  address?: string;
  uri?: string;
  placeId?: string;
}

export interface ImageAsset {
  data: string; // Base64
  mimeType: string;
}

export interface GeneratedVideo {
  uri: string;
}

export enum AppStep {
  SEARCH = 'SEARCH',
  SELECT_LOCATION = 'SELECT_LOCATION',
  UPLOAD_USER = 'UPLOAD_USER',
  COMPOSITE = 'COMPOSITE',
  ANIMATE = 'ANIMATE',
  RESULT = 'RESULT'
}

// Extend Window for AI Studio Key Selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}