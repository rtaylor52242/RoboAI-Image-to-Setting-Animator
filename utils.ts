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