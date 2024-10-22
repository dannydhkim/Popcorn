// src/utils/parseContent.ts
export function parseContent(content: string): string {
    // Regular expression to detect image URLs
    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/gi;
  
    // Replace image URLs with img tags
    const contentWithImages = content.replace(imageUrlRegex, (url) => {
      return `<img src="${url}" alt="User provided image" style="max-width: 100%; height: auto;" />`;
    });
  
    return contentWithImages;
  }
  