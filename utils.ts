export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/png;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
  });
};

export const cleanBase64 = (dataUrl: string): string => {
    if (dataUrl.includes(',')) {
        return dataUrl.split(',')[1];
    }
    return dataUrl;
}

export const getMimeTypeFromUrl = (url: string): string => {
    if(url.startsWith('data:image/png')) return 'image/png';
    if(url.startsWith('data:image/jpeg')) return 'image/jpeg';
    if(url.startsWith('data:image/webp')) return 'image/webp';
    return 'image/png'; // default
}

export const downloadBase64 = (base64: string, filename: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const mergeImages = async (
  bgBase64: string,
  fgBase64: string,
  fgX: number, // 0-1 (percentage of width)
  fgY: number, // 0-1 (percentage of height)
  fgScale: number // multiplier
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const bgImg = new Image();
    const fgImg = new Image();
    
    bgImg.onload = () => {
      fgImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw Background
        ctx.drawImage(bgImg, 0, 0);

        // Calculate FG dimensions preserving aspect ratio
        const fgAspect = fgImg.width / fgImg.height;
        // Base size: let's say 1.0 scale means 1/3 of background width
        const baseWidth = bgImg.width * 0.33; 
        const drawWidth = baseWidth * fgScale;
        const drawHeight = drawWidth / fgAspect;

        // Calculate Position (Center based)
        const posX = (bgImg.width * fgX) - (drawWidth / 2);
        const posY = (bgImg.height * fgY) - (drawHeight / 2);

        // Draw Foreground
        ctx.drawImage(fgImg, posX, posY, drawWidth, drawHeight);

        // Export
        const result = canvas.toDataURL('image/png');
        resolve(result.split(',')[1]);
      };
      fgImg.src = `data:image/png;base64,${fgBase64}`;
    };
    bgImg.src = `data:image/png;base64,${bgBase64}`;
    bgImg.onerror = reject;
  });
};