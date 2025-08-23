import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';

const SparklesBackground = () => {
  // Increase the number of sparkles for desktop coverage
  const sparkleCount = 200; // Try 200 or more for a denser field
  const scale = React.useMemo(
    () => Array.from({ length: sparkleCount }, () => 0.5 + Math.random() * 20),
    [sparkleCount]
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: 'black', // fallback for non-canvas area
    }}>
      <Canvas camera={{ fov: 45, position: [0, 0, 8] }} style={{ background: 'black' }}>
        <color attach="background" args={["black"]} />
        <Sparkles
          count={sparkleCount}
          size={scale}
          color="white"
          position={[0, 0.9, 0]}
          scale={[20, 8, 20]} // Wider and taller area for desktop
          speed={0.3}
        />
      </Canvas>
    </div>
  );
};

export default SparklesBackground; 