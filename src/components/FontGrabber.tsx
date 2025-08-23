import React, { useEffect } from 'react';

interface FontObject {
  name: string;
  weights?: (string | number)[]; // e.g., ['400', '700', 'italic@400'] or [400, 700]
}

interface FontGrabberProps {
  fonts: FontObject[];
}

const FontGrabber: React.FC<FontGrabberProps> = ({ fonts = [] }) => {
  useEffect(() => {
    if (fonts.length === 0) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    
    // Construct the Google Fonts URL more carefully for weights and italics
    // Example: family=Roboto:wght@400;700&family=Open+Sans:ital,wght@0,400;0,700;1,400
    const fontFamilies = fonts.map(font => {
      let fontQuery = `family=${encodeURIComponent(font.name)}`;
      if (font.weights && font.weights.length > 0) {
        // Google Fonts API expects weights like 'wght@400;700' or 'ital,wght@0,400;1,400'
        // For simplicity, let's assume weights are numeric or direct keywords like 'italic'
        // A more robust solution might involve parsing 'italic@400' into API format
        const weightParams = font.weights.map(w => String(w)).join(';');
        fontQuery += `:wght@${weightParams}`; // This simplified version assumes numeric weights
                                           // For specific italic weights etc., the structure is more complex
                                           // e.g. family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800
                                           // For now, this handles basic numeric weights like 400,700.
                                           // For a font like 'Open Sans' with weights '300', 'regular', '700', 'italic'
                                           // you might need a more complex mapping or a more specific weights array like ['300', '400', '700', 'italic']
                                           // and then construct `:wght@300;400;700&ital@1` if needed.
                                           // Sticking to numeric weights for simplicity with current structure.
      }
      return fontQuery;
    }).join('&');

    link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    
    document.head.appendChild(link);

    // Optional: Add a console log to confirm font loading
    // console.log('Loading Google Fonts:', link.href);

    return () => {
      // Clean up the link tag when the component unmounts
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [fonts]); // Re-run effect if fonts prop changes

  return null; // This component doesn't render any visible UI
};

export default FontGrabber; 