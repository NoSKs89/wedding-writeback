import React from 'react';
import { ParallaxLayer } from '@react-spring/parallax';

interface IntroTextDisplayProps {
  brideName: string;
  groomName: string;
  weddingDate: string;
  textStartOffset: number;
  textSpeed: number;
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column'
};

const IntroTextDisplay: React.FC<IntroTextDisplayProps> = ({
  brideName,
  groomName,
  weddingDate,
  textStartOffset,
  textSpeed,
}) => {
  return (
    <ParallaxLayer
      offset={textStartOffset}
      speed={textSpeed}
      style={{ ...centerStyle, zIndex: 2 }} // zIndex ensures it's above background elements if needed
    >
      <div className="textLayerContent"> {/* Assuming this class is defined in App.css or similar */}
        <h1>{brideName}</h1>
        <h1 className="ampersand">&</h1>
        <h1>{groomName}</h1>
        <p>{weddingDate}</p>
      </div>
    </ParallaxLayer>
  );
};

export default IntroTextDisplay; 