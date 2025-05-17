import React from 'react';

// Define a basic structure for what a tracked animation object might look like.
// You can expand this based on the actual properties you use.
interface TrackedAnimation {
  label: string;
  startProgressMarker: number;
  endProgressMarker: number;
  initialOpacity: number;
  finalOpacity: number;
  // Add any other properties that your trackedAnimation objects have
}

interface ParallaxLoggingProps {
  currentScrollProgress: number;
  trackedAnimations: TrackedAnimation[];
}

const ParallaxLogging: React.FC<ParallaxLoggingProps> = ({ currentScrollProgress, trackedAnimations }) => {
  const calculateEffectiveOpacity = (progress: number, animation: TrackedAnimation) => {
    if (progress < animation.startProgressMarker) return animation.initialOpacity;
    if (progress > animation.endProgressMarker) return animation.finalOpacity;
    
    const duration = animation.endProgressMarker - animation.startProgressMarker;
    if (duration === 0) return progress >= animation.startProgressMarker ? animation.finalOpacity : animation.initialOpacity;
    
    const currentPositionInAnimation = progress - animation.startProgressMarker;
    const progressWithinAnimation = currentPositionInAnimation / duration;
    
    return animation.initialOpacity + (animation.finalOpacity - animation.initialOpacity) * progressWithinAnimation;
  };

  const loggerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 2000, // Ensure it's on top
    fontSize: '12px',
    fontFamily: 'monospace',
    maxWidth: '300px',
    maxHeight: '40vh',
    overflowY: 'auto'
  };

  const animationEntryStyle: React.CSSProperties = {
    marginBottom: '5px',
    paddingBottom: '5px',
    borderBottom: '1px solid #555'
  };

  return (
    <div style={loggerStyle}>
      <div><strong>Overall Scroll:</strong> {currentScrollProgress.toFixed(3)}</div>
      <hr style={{ borderColor: '#555', margin: '8px 0' }} />
      <div><strong>Animations Status:</strong></div>
      {trackedAnimations.map((anim, index) => {
        const effectiveOpacity = calculateEffectiveOpacity(currentScrollProgress, anim);
        let status = 'Pending';
        if (currentScrollProgress >= anim.startProgressMarker && currentScrollProgress <= anim.endProgressMarker) {
          status = 'Active';
        } else if (currentScrollProgress > anim.endProgressMarker) {
          status = 'Completed';
        }

        return (
          <div key={index} style={animationEntryStyle}>
            <div>{anim.label}</div>
            <div>Range: {anim.startProgressMarker.toFixed(2)} - {anim.endProgressMarker.toFixed(2)}</div>
            <div>Opacity (calc): {effectiveOpacity.toFixed(2)} (Actual may vary based on lib)</div>
            <div>Status: <strong style={{ color: status === 'Active' ? '#66ff66' : (status === 'Completed' ? '#aaa' : '#ffcc66') }}>{status}</strong></div>
          </div>
        );
      })}
    </div>
  );
};

export default ParallaxLogging; 