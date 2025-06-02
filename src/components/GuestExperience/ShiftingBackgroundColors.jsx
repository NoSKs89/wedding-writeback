import React from 'react';
import { useTrackedControls } from '../../hooks/useTrackedControls';
import { useSetupMode } from '../../contexts/SetupModeContext';

const dynamicGradientControlsSchema = {
  gradientColorStart: { value: '#FFD1DC', label: 'Grad. Start Color' }, // Light Pink
  gradientColorStop: { value: '#B0E0E6', label: 'Grad. Stop Color' },  // Powder Blue
  gradientAngleOffset: { value: 45, min: -360, max: 360, step: 1, label: 'Grad. Angle Offset (deg)' },
  gradientScrollFactor: { value: 0.03, min: -0.5, max: 0.5, step: 0.001, label: 'Grad. Scroll Angle Factor' },
};

const ShiftingBackgroundColors = ({ scrollY }) => {
  const { isSetupMode } = useSetupMode(); // To hide controls when not in setup mode

  const controls = useTrackedControls(
    'Dynamic Background Gradient',
    dynamicGradientControlsSchema,
    { collapsed: true, hidden: !isSetupMode } // Options for the Leva panel
  );

  const {
    gradientColorStart = '#FFD1DC',
    gradientColorStop = '#B0E0E6',
    gradientAngleOffset = 45,
    gradientScrollFactor = 0.03,
  } = controls?.values || {};

  const currentAngle = gradientAngleOffset + scrollY * gradientScrollFactor;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(${currentAngle.toFixed(2)}deg, ${gradientColorStart}, ${gradientColorStop})`,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1, // Relative zIndex within its ParallaxLayer, the layer itself will be -20
      }}
    />
  );
};

export default ShiftingBackgroundColors; 