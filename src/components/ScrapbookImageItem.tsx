import React, { useState } from 'react';
import { useSpring, animated } from 'react-spring';

interface ScrapbookImageItemProps {
  imageSrc: string;
  initialStyle: React.CSSProperties;
  onClick: () => void;
  altText: string;
}

const ScrapbookImageItem: React.FC<ScrapbookImageItemProps> = ({ imageSrc, initialStyle, onClick, altText }) => {
  const [isHovered, setIsHovered] = useState(false);

  const { transform: initialTransformValue, ...restInitialStyle } = initialStyle;

  const hoverSpring = useSpring({
    transform: isHovered
      ? `${initialTransformValue || ''} scale(1.2)`
      : `${initialTransformValue || ''} scale(1)`,
    zIndex: isHovered ? 100 : (initialStyle.zIndex || 1),
    boxShadow: isHovered ? '6px 6px 20px rgba(0,0,0,0.4)' : (initialStyle.boxShadow || '3px 3px 10px rgba(0,0,0,0.2)'),
    config: { tension: 300, friction: 20 }
  });

  return (
    <animated.img
      src={imageSrc}
      alt={altText}
      style={{
        ...restInitialStyle,
        ...hoverSpring,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="scrapbook-image-item" // Keep existing class if needed
    />
  );
};

export default ScrapbookImageItem; 