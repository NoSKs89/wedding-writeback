import React from 'react';
// import { Parallax } from 'react-scroll-parallax'; // If you want parallax on individual scrapbook images

const ScrapbookBackground = ({ images }) => {
  const scrapbookContainerStyle = {
    position: 'fixed', // Make it a fixed background
    top: 0,
    left: 0,
    width: '100%',
    height: '100vh',
    overflow: 'hidden', // Important for fixed positioning
    zIndex: 0, // Behind main content
    // backgroundColor: '#e8e0d0', // A warm, paper-like background
  };

  // Function to generate somewhat random styles for each image
  const generateImageStyle = (index, totalImages) => {
    const size = Math.random() * 100 + 150; // Random size between 150px and 250px
    const angle = Math.random() * 30 - 15; // Random rotation between -15deg and 15deg

    // Distribute images more across the screen, avoiding too much center overlap
    // Simple grid-like distribution logic
    const cols = Math.ceil(Math.sqrt(totalImages));
    const rows = Math.ceil(totalImages / cols);
    const colIndex = index % cols;
    const rowIndex = Math.floor(index / cols);

    const xJitter = (Math.random() - 0.5) * 10; // % jitter
    const yJitter = (Math.random() - 0.5) * 10; // % jitter

    let topPercent = (rowIndex / rows) * 80 + 10 + yJitter; // Spread from 10% to 90% vertically
    let leftPercent = (colIndex / cols) * 80 + 10 + xJitter; // Spread from 10% to 90% horizontally
    
    // Ensure positions are within bounds after considering image size (approx)
    topPercent = Math.max(5, Math.min(topPercent, 95 - (size/window.innerHeight * 100)));
    leftPercent = Math.max(5, Math.min(leftPercent, 95 - (size/window.innerWidth * 100)));


    return {
      position: 'absolute',
      width: `${size}px`,
      height: 'auto', // Maintain aspect ratio
      boxShadow: '3px 3px 10px rgba(0,0,0,0.2)',
      border: '5px solid white', // Polaroid effect
      transform: `rotate(${angle}deg)`,
      top: `${topPercent}%`,
      left: `${leftPercent}%`,
      opacity: 0.8, // Slight fade for background effect
      transition: 'transform 0.3s ease-out', // For potential hover effects
      // Add a pseudo-element for tape or a pin effect if desired via CSS classes
    };
  };

  return (
    <div style={scrapbookContainerStyle} className="scrapbook-fixed-background">
      {images.map((imageSrc, index) => (
        // If using individual parallax:
        // <Parallax key={index} speed={Math.random() * 10 - 5} style={generateImageStyle(index, images.length)}>
        //   <img src={imageSrc} alt={`Scrapbook item ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        // </Parallax>
        <img
          key={index}
          src={imageSrc} // Assuming imageSrc is just the URL string
          alt={`Scrapbook item ${index + 1}`}
          style={generateImageStyle(index, images.length)}
          className="scrapbook-image-item"
        />
      ))}
    </div>
  );
};

export default ScrapbookBackground;