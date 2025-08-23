import React, { useMemo, useState, useEffect } from 'react';
import { animated } from '@react-spring/web'; // Removed useSpring as it's not directly used for this simpler version
// import { useTrackedControls } from '../../hooks/useTrackedControls';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { useControls } from 'leva';
import { useLevaStore } from '../../stores/levaStore';

const dynamicGradientControlsSchema = {
  gradientMode: {
    value: 'Scheme: Primary & Secondary',
    options: [
      'Scheme: Primary & Secondary',
      'Scheme: Primary & Accent',
      'Scheme: Secondary & Accent',
      'Scheme: Text & Background',
      'Override'
    ],
    label: 'Gradient Colors Source'
  },
  gradientColorStart: { value: '#ee0038', label: 'Grad. Start Color (Override)' },
  gradientColorStop: { value: '#00e1fe', label: 'Grad. Stop Color (Override)' },
  gradientAngleOffset: { value: -160, min: -360, max: 360, step: 1, label: 'Grad. Angle Offset (deg)' },
  gradientScrollFactor: { value: 0.34, min: -0.5, max: 0.5, step: 0.001, label: 'Grad. Scroll Angle Factor' },
  maxGradientOpacity: { value: 1.0, min: 0, max: 1, step: 0.01, label: 'Max Opacity' },
  startOpacity: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Start Opacity' },
  startFadeYPercent: { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Opacity Start Y %' },
  endFadeYPercent: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'Opacity End Y %' },
  opacityFadeCurve: {
    value: 'linear',
    options: ['linear', 'easeIn', 'easeOut', 'easeInOut'], // Placeholder for now, only linear implemented first
    label: 'Opacity Curve'
  },
  // === RETRO NOISE CONTROLS ===
  enableNoise: { value: false, label: '🎭 Enable Retro Noise' },
  noisePattern: {
    value: 'organic',
    options: ['organic', 'grain', 'dixie-cup', 'static', 'fabric', 'concrete'],
    label: 'Noise Pattern Type',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseIntensity: {
    value: 0.15,
    min: 0,
    max: 1,
    step: 0.01,
    label: 'Noise Intensity',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseScale: {
    value: 1.0,
    min: 0.1,
    max: 5.0,
    step: 0.1,
    label: 'Noise Scale',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseMovementSpeed: {
    value: 0.5,
    min: 0,
    max: 2,
    step: 0.1,
    label: 'Movement Speed',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseBlendMode: {
    value: 'overlay',
    options: ['multiply', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge', 'screen'],
    label: 'Blend Mode',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseContrast: {
    value: 1.0,
    min: 0.5,
    max: 2.0,
    step: 0.1,
    label: 'Noise Contrast',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  noiseBrightness: {
    value: 1.0,
    min: 0.5,
    max: 1.5,
    step: 0.05,
    label: 'Noise Brightness',
    render: (get) => get('Dynamic Background Gradient.enableNoise')
  },
  // === FLOATING SHAPES CONTROLS ===
  enableFloatingShapes: { value: false, label: '🔮 Floating Shapes' },
  shapeType: {
    value: 'circles',
    options: ['circles', 'triangles', 'squares', 'hexagons', 'stars', 'mixed'],
    label: 'Shape Type',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeQuantity: {
    value: 8,
    min: 3,
    max: 20,
    step: 1,
    label: 'Shape Quantity',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeSizeMin: {
    value: 20,
    min: 10,
    max: 100,
    step: 5,
    label: 'Min Size (px)',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeSizeMax: {
    value: 80,
    min: 50,
    max: 200,
    step: 5,
    label: 'Max Size (px)',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeOpacity: {
    value: 0.1,
    min: 0.01,
    max: 0.5,
    step: 0.01,
    label: 'Shape Opacity',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeDriftSpeed: {
    value: 0.3,
    min: 0.1,
    max: 1.0,
    step: 0.1,
    label: 'Drift Speed',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeBlendMode: {
    value: 'overlay',
    options: ['multiply', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge', 'screen'],
    label: 'Shape Blend Mode',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  },
  shapeColorMode: {
    value: 'gradient-based',
    options: ['gradient-based', 'contrast', 'complement', 'white', 'black'],
    label: 'Shape Colors',
    render: (get) => get('Dynamic Background Gradient.enableFloatingShapes')
  }
};

// SVG Noise Pattern Definitions - Performance optimized
const NoisePatterns = ({ patternId, pattern, scale, contrast, brightness, scrollOffset }) => {
  const getPatternDefinition = () => {
    // Calculate subtle pattern offset based on scroll for internal movement
    const offsetX = scrollOffset * 0.001;
    const offsetY = scrollOffset * 0.0005;
    
    switch (pattern) {
      case 'organic':
        return (
          <feTurbulence 
            type="turbulence" 
            baseFrequency={0.9 * scale} 
            numOctaves="3" 
            result="noise"
            seed={Math.floor(scrollOffset * 0.01) % 100}
          />
        );
      
      case 'grain':
        return (
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency={4.0 * scale} 
            numOctaves="1" 
            result="noise"
            seed={Math.floor(scrollOffset * 0.02) % 100}
          />
        );
      
      case 'dixie-cup':
        return (
          <>
            <feTurbulence 
              type="turbulence" 
              baseFrequency={1.5 * scale} 
              numOctaves="2" 
              result="noise1"
              seed={Math.floor(scrollOffset * 0.015) % 100}
            />
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency={3.0 * scale} 
              numOctaves="1" 
              result="noise2"
              seed={Math.floor(scrollOffset * 0.025) % 100}
            />
            <feBlend in="noise1" in2="noise2" mode="multiply" result="noise" />
          </>
        );
      
      case 'static':
        return (
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency={8.0 * scale} 
            numOctaves="1" 
            result="noise"
            seed={Math.floor(scrollOffset * 0.1) % 100}
          />
        );
      
      case 'fabric':
        return (
          <>
            <feTurbulence 
              type="turbulence" 
              baseFrequency={2.0 * scale} 
              numOctaves="4" 
              result="noise1"
              seed={Math.floor(scrollOffset * 0.008) % 100}
            />
            <feColorMatrix 
              in="noise1" 
              type="saturate" 
              values="0" 
              result="noise"
            />
          </>
        );
      
      case 'concrete':
        return (
          <>
            <feTurbulence 
              type="turbulence" 
              baseFrequency={0.5 * scale} 
              numOctaves="5" 
              result="noise1"
              seed={Math.floor(scrollOffset * 0.005) % 100}
            />
            <feComponentTransfer in="noise1" result="noise">
              <feFuncA type="discrete" tableValues="0.3 0.7 0.9 0.5" />
            </feComponentTransfer>
          </>
        );
      
      default:
        return (
          <feTurbulence 
            type="turbulence" 
            baseFrequency={0.9 * scale} 
            numOctaves="3" 
            result="noise"
            seed={Math.floor(scrollOffset * 0.01) % 100}
          />
        );
    }
  };

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id={patternId} x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          {getPatternDefinition()}
          <feComponentTransfer in="noise" result="contrast">
            <feFuncA type="discrete" tableValues={`0 ${contrast} 1`} />
          </feComponentTransfer>
          <feComponentTransfer in="contrast" result="brightness">
            <feFuncA type="linear" slope={brightness} />
          </feComponentTransfer>
          <feColorMatrix in="brightness" result="final" type="matrix" 
            values={`1 0 0 0 0
                     0 1 0 0 0  
                     0 0 1 0 0
                     0 0 0 ${contrast * brightness} 0`} />
        </filter>
      </defs>
    </svg>
  );
};

// Floating Shapes Component - Performance optimized
const FloatingShapes = ({ 
  scrollY, 
  shapeType, 
  quantity, 
  sizeMin, 
  sizeMax, 
  opacity, 
  driftSpeed, 
  blendMode, 
  colorMode, 
  gradientColors 
}) => {
  // Generate stable shape data based on quantity (memoized to prevent regeneration)
  const shapeData = useMemo(() => {
    const shapes = [];
    const seed = 42; // Fixed seed for consistent positioning
    
    for (let i = 0; i < quantity; i++) {
      // Use deterministic "random" values based on index for consistency
      const pseudoRandom1 = ((seed + i * 7) % 97) / 97;
      const pseudoRandom2 = ((seed + i * 13) % 101) / 101;
      const pseudoRandom3 = ((seed + i * 19) % 103) / 103;
      const pseudoRandom4 = ((seed + i * 23) % 107) / 107;
      const pseudoRandom5 = ((seed + i * 29) % 109) / 109;
      
      // Determine shape type for this specific shape
      let currentShapeType = shapeType;
      if (shapeType === 'mixed') {
        const shapeTypes = ['circles', 'triangles', 'squares', 'hexagons', 'stars'];
        currentShapeType = shapeTypes[Math.floor(pseudoRandom1 * shapeTypes.length)];
      }
      
      shapes.push({
        id: i,
        type: currentShapeType,
        initialX: pseudoRandom1 * 100, // Position as percentage
        initialY: pseudoRandom2 * 100,
        size: sizeMin + (sizeMax - sizeMin) * pseudoRandom3,
        rotationSpeed: (pseudoRandom4 - 0.5) * 0.5, // -0.25 to 0.25
        driftDirection: pseudoRandom5 * 360, // Drift angle in degrees
        depthLayer: pseudoRandom1, // For parallax effect (0-1)
      });
    }
    
    return shapes;
  }, [quantity, sizeMin, sizeMax, shapeType]);
  
  // Calculate shape colors based on color mode
  const getShapeColor = (shapeIndex, depthLayer) => {
    const baseOpacity = opacity * (0.5 + depthLayer * 0.5); // Vary opacity by depth
    
    switch (colorMode) {
      case 'gradient-based':
        // Use the current gradient colors with variation
        return shapeIndex % 2 === 0 
          ? `${gradientColors.start}${Math.round(baseOpacity * 255).toString(16).padStart(2, '0')}`
          : `${gradientColors.end}${Math.round(baseOpacity * 255).toString(16).padStart(2, '0')}`;
      
      case 'contrast':
        return shapeIndex % 2 === 0 
          ? `rgba(255,255,255,${baseOpacity})`
          : `rgba(0,0,0,${baseOpacity})`;
      
      case 'complement':
        // Create complementary colors to the gradient
        return shapeIndex % 2 === 0 
          ? `rgba(100,200,255,${baseOpacity})`
          : `rgba(255,150,100,${baseOpacity})`;
      
      case 'white':
        return `rgba(255,255,255,${baseOpacity})`;
      
      case 'black':
        return `rgba(0,0,0,${baseOpacity})`;
      
      default:
        return `rgba(255,255,255,${baseOpacity})`;
    }
  };
  
  // Generate CSS for each shape type
  const getShapeCSS = (shape) => {
    const baseSize = shape.size;
    
    switch (shape.type) {
      case 'circles':
        return {
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          borderRadius: '50%',
        };
      
      case 'triangles':
        return {
          width: 0,
          height: 0,
          borderLeft: `${baseSize/2}px solid transparent`,
          borderRight: `${baseSize/2}px solid transparent`,
          borderBottom: `${baseSize}px solid currentColor`,
          backgroundColor: 'transparent',
        };
      
      case 'squares':
        return {
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          borderRadius: `${baseSize * 0.1}px`, // Slight rounding
        };
      
      case 'hexagons':
        return {
          width: `${baseSize}px`,
          height: `${baseSize * 0.866}px`, // Hex ratio
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        };
      
      case 'stars':
        return {
          position: 'absolute',
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          clipPath: `polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)`,
          transform: `rotate(${shape.rotationSpeed * 360}deg)`,
          transformOrigin: '50% 50%',
        };
      
      default:
        return {
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          borderRadius: '50%',
        };
    }
  };
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {shapeData.map((shape) => {
        // Calculate position based on scroll and drift
        const scrollProgress = scrollY * 0.001; // Normalize scroll
        const driftX = Math.cos((shape.driftDirection * Math.PI) / 180) * scrollProgress * driftSpeed * shape.depthLayer * 100;
        const driftY = Math.sin((shape.driftDirection * Math.PI) / 180) * scrollProgress * driftSpeed * shape.depthLayer * 50;
        const rotation = scrollProgress * shape.rotationSpeed * driftSpeed * 360;
        
        // Final position with wrapping
        const finalX = (shape.initialX + driftX) % 120 - 10; // -10% to 110% (allows off-screen)
        const finalY = (shape.initialY + driftY) % 120 - 10;
        
        const shapeCSS = getShapeCSS(shape);
        const shapeColor = getShapeColor(shape.id, shape.depthLayer);
        
        return (
          <div
            key={shape.id}
            style={{
              position: 'absolute',
              left: `${finalX}%`,
              top: `${finalY}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              backgroundColor: shape.type === 'triangles' ? 'transparent' : shapeColor,
              color: shapeColor, // For triangle borders
              mixBlendMode: blendMode,
              willChange: 'transform',
              ...shapeCSS,
            }}
          />
        );
      })}
    </div>
  );
};

const ShiftingBackgroundColors = ({ scrollY, TOTAL_PAGES, windowHeight, selectedColorScheme, gradientControls: gradientControlsFromProp = null }) => {
  const { isSetupMode } = useSetupMode();
  const updateControlValuesInStore = useLevaStore(state => state.updateControlValues);
  const getInitialValues = useLevaStore(state => state.controlValues['Dynamic Background Gradient']);

  const controlsSchemaWithValues = useMemo(() => {
    const schema = dynamicGradientControlsSchema;
    const initialValues = getInitialValues || {};
    return Object.keys(schema).reduce((acc, key) => {
      const a = schema;
      const b = initialValues;
      acc[key] = { ...a[key], value: b[key] ?? a[key].value };
      return acc;
    }, {});
  }, [getInitialValues]);

  const levaValues = useControls(
    'Dynamic Background Gradient',
    controlsSchemaWithValues,
    { collapsed: true, render: () => isSetupMode },
    [controlsSchemaWithValues]
  );

  // Use controls from props if available (for preview), otherwise use live Leva values (for editor)
  const controlValues = gradientControlsFromProp || levaValues;

  useEffect(() => {
    // Only update the store if we are in setup mode and not using props
    // This prevents the preview page from trying to write back to the store
    if (isSetupMode && !gradientControlsFromProp) {
      updateControlValuesInStore('Dynamic Background Gradient', controlValues);
    }
  }, [controlValues, isSetupMode, updateControlValuesInStore, gradientControlsFromProp]);

  const {
    gradientMode,
    gradientColorStart,
    gradientColorStop,
    gradientAngleOffset,
    gradientScrollFactor,
    maxGradientOpacity,
    startOpacity,
    startFadeYPercent,
    endFadeYPercent,
    opacityFadeCurve,
    // Noise controls
    enableNoise,
    noisePattern,
    noiseIntensity,
    noiseScale,
    noiseMovementSpeed,
    noiseBlendMode,
    noiseContrast,
    noiseBrightness,
    // Floating shapes controls
    enableFloatingShapes,
    shapeType,
    shapeQuantity,
    shapeSizeMin,
    shapeSizeMax,
    shapeOpacity,
    shapeDriftSpeed,
    shapeBlendMode,
    shapeColorMode,
  } = controlValues;

  // Determine actual gradient colors based on mode and scheme
  let actualStartColor = gradientColorStart;
  let actualEndColor = gradientColorStop;

  if (selectedColorScheme && gradientMode !== 'Override') {
    switch (gradientMode) {
      case 'Scheme: Primary & Secondary':
        actualStartColor = selectedColorScheme.colors.primary || gradientColorStart;
        actualEndColor = selectedColorScheme.colors.secondary || gradientColorStop;
        break;
      case 'Scheme: Primary & Accent':
        actualStartColor = selectedColorScheme.colors.primary || gradientColorStart;
        actualEndColor = selectedColorScheme.colors.accent || gradientColorStop;
        break;
      case 'Scheme: Secondary & Accent':
        actualStartColor = selectedColorScheme.colors.secondary || gradientColorStart;
        actualEndColor = selectedColorScheme.colors.accent || gradientColorStop;
        break;
      case 'Scheme: Text & Background':
        actualStartColor = selectedColorScheme.colors.text || gradientColorStart;
        actualEndColor = selectedColorScheme.colors.background || gradientColorStop;
        break;
      default:
        // Fallback to override if mode is unknown, though options should prevent this
        actualStartColor = gradientColorStart;
        actualEndColor = gradientColorStop;
    }
  }

  const currentAngle = (gradientAngleOffset || 0) + scrollY * (gradientScrollFactor || 0);

  let currentOpacity = startOpacity;
  const parallaxScrollHeight = TOTAL_PAGES > 1 ? (TOTAL_PAGES - 1) * windowHeight : 0;

  const currentScrollYPercent = parallaxScrollHeight > 0 ? Math.min(scrollY / parallaxScrollHeight, 1) : 0;

  if (currentScrollYPercent <= (startFadeYPercent || 0)) {
    currentOpacity = startOpacity;
  } else if (currentScrollYPercent >= (endFadeYPercent || 1)) {
    currentOpacity = maxGradientOpacity;
  } else {
    const fadeDurationPercent = (endFadeYPercent || 1) - (startFadeYPercent || 0);
    if (fadeDurationPercent <= 0) {
      currentOpacity = maxGradientOpacity;
    } else {
      const progressInFade = (currentScrollYPercent - (startFadeYPercent || 0)) / fadeDurationPercent;
      currentOpacity = (startOpacity || 0) + ((maxGradientOpacity || 1) - (startOpacity || 0)) * progressInFade;
    }
  }
  currentOpacity = Math.max(0, Math.min(1, currentOpacity || 0));

  const scrollPercentage = useMemo(() => {
    if (TOTAL_PAGES <= 1 || windowHeight <= 0) return 0;
    const totalScrollableHeight = (TOTAL_PAGES - 1) * windowHeight;
    return Math.min(1, Math.max(0, scrollY / totalScrollableHeight));
  }, [scrollY, TOTAL_PAGES, windowHeight]);

  // Calculate noise movement based on scroll
  const noiseTransform = useMemo(() => {
    if (!enableNoise) return 'none';
    
    const moveX = scrollY * noiseMovementSpeed * 0.1;
    const moveY = scrollY * noiseMovementSpeed * 0.05;
    const rotation = scrollY * noiseMovementSpeed * 0.02;
    
    return `translate(${moveX}px, ${moveY}px) rotate(${rotation}deg)`;
  }, [scrollY, noiseMovementSpeed, enableNoise]);

  // Unique pattern ID to avoid conflicts
  const patternId = useMemo(() => `noise-pattern-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <>
      {/* SVG Noise Pattern Definitions */}
      {enableNoise && (
        <NoisePatterns 
          patternId={patternId}
          pattern={noisePattern}
          scale={noiseScale}
          contrast={noiseContrast}
          brightness={noiseBrightness}
          scrollOffset={scrollY}
        />
      )}
      
      {/* Main Gradient Background */}
      <animated.div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(${currentAngle.toFixed(2)}deg, ${actualStartColor}, ${actualEndColor})`,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: -1,
          opacity: currentOpacity,
        }}
      />
      
      {/* Floating Shapes Layer */}
      {enableFloatingShapes && (
        <animated.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0, // Above gradient, below noise
            opacity: currentOpacity, // Fade with gradient
            pointerEvents: 'none',
          }}
        >
          <FloatingShapes 
            scrollY={scrollY}
            shapeType={shapeType}
            quantity={shapeQuantity}
            sizeMin={shapeSizeMin}
            sizeMax={shapeSizeMax}
            opacity={shapeOpacity}
            driftSpeed={shapeDriftSpeed}
            blendMode={shapeBlendMode}
            colorMode={shapeColorMode}
            gradientColors={{ start: actualStartColor, end: actualEndColor }}
          />
        </animated.div>
      )}
      
      {/* Noise Overlay Layer - Full Coverage */}
      {enableNoise && (
        <animated.div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1, // Above shapes and gradient
            opacity: noiseIntensity * currentOpacity,
            mixBlendMode: noiseBlendMode,
            filter: `url(#${patternId})`,
            // Remove transform - we want full coverage, not movement
            // The movement now happens within the SVG filter via seed changes
            pointerEvents: 'none',
            // Create a subtle base texture that works well with the noise filter
            background: `
              linear-gradient(45deg, 
                rgba(255,255,255,0.02) 0%, 
                rgba(128,128,128,0.01) 25%, 
                rgba(0,0,0,0.02) 50%, 
                rgba(128,128,128,0.01) 75%, 
                rgba(255,255,255,0.02) 100%
              )
            `,
            // Performance optimizations
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
          }}
        />
      )}
      
      {/* Enhanced Grain Layer for Dixie Cup Effect */}
      {enableNoise && noisePattern === 'dixie-cup' && (
        <animated.div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2, // Top layer for extra grain texture
            opacity: noiseIntensity * 0.2 * currentOpacity,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            // Static CSS pattern that doesn't move - creates layered texture
            backgroundImage: `
              repeating-conic-gradient(
                from ${(scrollY * noiseMovementSpeed * 0.1) % 360}deg at 20% 30%, 
                rgba(0,0,0,0.01) 0deg, 
                transparent 3deg, 
                rgba(255,255,255,0.005) 6deg,
                transparent 9deg
              ),
              repeating-conic-gradient(
                from ${(scrollY * noiseMovementSpeed * 0.15) % 360}deg at 80% 70%, 
                rgba(255,255,255,0.008) 0deg, 
                transparent 4deg, 
                rgba(0,0,0,0.008) 8deg,
                transparent 12deg
              ),
              repeating-linear-gradient(
                ${(scrollY * noiseMovementSpeed * 0.05) % 180}deg,
                transparent 0px,
                rgba(0,0,0,0.005) 1px,
                transparent 3px,
                rgba(255,255,255,0.003) 4px,
                transparent 6px
              )
            `,
            backgroundSize: `${60 / noiseScale}px ${60 / noiseScale}px, ${40 / noiseScale}px ${40 / noiseScale}px, ${20 / noiseScale}px ${20 / noiseScale}px`,
          }}
        />
      )}
    </>
  );
};

export default ShiftingBackgroundColors; 