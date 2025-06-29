import React, { useState, useEffect, useRef } from 'react';
import { DeviceFrameset } from 'react-device-frameset';
import 'react-device-frameset/styles/marvel-devices.min.css';
import 'react-device-frameset/styles/device-selector.min.css';
import GuestExperience from '../GuestExperience/GuestExperience';

const DeviceMobilePreview = ({ 
  weddingData, 
  experienceSettings, 
  weddingId, 
  allControlValues,
  selectedDevice,
  deviceOrientation,
  deviceColor,
  deviceConfig,
  saveButtonContainerStyle
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // Device screen dimensions - these are the actual viewport sizes for each device
  const deviceDimensions = {
    'iPhone X': { width: 375, height: 812 },
    'iPhone 8': { width: 375, height: 667 },
    'iPhone 8 Plus': { width: 414, height: 736 },
    'iPhone 5s': { width: 320, height: 568 },
    'iPhone 5c': { width: 320, height: 568 },
    'iPhone 4s': { width: 320, height: 480 },
    'Galaxy Note 8': { width: 360, height: 740 },
    'Nexus 5': { width: 360, height: 640 },
    'Samsung Galaxy S5': { width: 360, height: 640 },
    'HTC One': { width: 360, height: 640 },
    'Lumia 920': { width: 320, height: 533 },
    'iPad Mini': { width: 768, height: 1024 }
  };

  // Calculate current device viewport dimensions based on selected device and orientation
  const currentDeviceViewport = React.useMemo(() => {
    const deviceDims = deviceDimensions[selectedDevice] || deviceDimensions['iPhone X'];
    return {
      width: deviceOrientation === 'landscape' ? deviceDims.height : deviceDims.width,
      height: deviceOrientation === 'landscape' ? deviceDims.width : deviceDims.height
    };
  }, [selectedDevice, deviceOrientation, deviceDimensions]);

  // Calculate zoom based on device type and available space
  useEffect(() => {
    const calculateOptimalZoom = () => {
      // Available space in column 3 (25% of viewport minus padding)
      const availableWidth = (window.innerWidth * 0.25) - 40; // 25% column minus padding
      const availableHeight = window.innerHeight - 40; // Full height minus padding
      
      // Add device frame padding/border (approximate)
      const framePadding = deviceOrientation === 'landscape' ? 60 : 80;
      
      const deviceDims = deviceDimensions[selectedDevice] || deviceDimensions['iPhone X'];
      
      // Adjust for orientation
      const deviceWidth = deviceOrientation === 'landscape' 
        ? deviceDims.height + framePadding 
        : deviceDims.width + framePadding;
      const deviceHeight = deviceOrientation === 'landscape' 
        ? deviceDims.width + framePadding 
        : deviceDims.height + framePadding;
      
      // Calculate zoom factors for both width and height constraints
      const zoomForWidth = availableWidth / deviceWidth;
      const zoomForHeight = availableHeight / deviceHeight;
      
      // Use the smaller zoom to ensure device fits completely while maintaining aspect ratio
      const optimalZoom = Math.min(zoomForWidth, zoomForHeight);
      
      // Clamp zoom to reasonable bounds
      const clampedZoom = Math.max(0.2, Math.min(1.5, optimalZoom));
      
      console.log('[DeviceMobilePreview] Zoom calculation:', {
        selectedDevice,
        deviceOrientation,
        availableWidth,
        availableHeight,
        deviceWidth,
        deviceHeight,
        zoomForWidth: zoomForWidth.toFixed(3),
        zoomForHeight: zoomForHeight.toFixed(3),
        optimalZoom: optimalZoom.toFixed(3),
        clampedZoom: clampedZoom.toFixed(3)
      });
      
      setZoom(clampedZoom);
    };

    calculateOptimalZoom();

    // Recalculate on window resize
    const handleResize = () => {
      calculateOptimalZoom();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedDevice, deviceOrientation, deviceColor]);

  // Update available device colors based on selected device
  const getAvailableColors = (device) => {
    switch (device) {
      case 'iPhone 8':
      case 'iPhone 8 Plus':
        return ['black', 'silver', 'gold'];
      case 'iPhone 5s':
        return ['black', 'silver', 'gold'];
      case 'iPhone 5c':
        return ['white', 'red', 'yellow', 'green', 'blue'];
      case 'iPhone 4s':
        return ['black', 'silver'];
      case 'Samsung Galaxy S5':
        return ['white', 'black'];
      case 'Lumia 920':
        return ['black', 'white', 'yellow', 'red', 'blue'];
      case 'iPad Mini':
        return ['black', 'silver'];
      default:
        return null; // iPhone X, Galaxy Note 8, Nexus 5, HTC One, MacBook Pro have no color options
    }
  };

  const availableColors = getAvailableColors(selectedDevice);
  const validatedColor = availableColors && availableColors.includes(deviceColor) ? deviceColor : (availableColors?.[0] || null);

  // Create device props object - only include color if the device supports it
  const deviceProps = {
    device: selectedDevice,
    landscape: deviceOrientation === 'landscape',
    zoom: zoom, // Use our calculated zoom
    ...(validatedColor && { color: validatedColor })
  };

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Enhanced Device Preview Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}>
        <DeviceFrameset
          device={selectedDevice}
          color={deviceColor || undefined}
          orientation={deviceOrientation}
          zoom={zoom}
        >
          {/* Create a viewport container with exact device screen dimensions */}
          <div style={{
            width: `${currentDeviceViewport.width}px`,
            height: `${currentDeviceViewport.height}px`,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: 'white'
          }}>
            <GuestExperience
              weddingDataFromApp={weddingData}
              experienceSettingsFromApp={experienceSettings}
              weddingIdFromApp={weddingId}
              isSetupModeFromProps={false}
              forceMobileView={true}
              saveButtonContainerStyle={saveButtonContainerStyle}
            />
          </div>
        </DeviceFrameset>
      </div>
    </div>
  );
};

export default DeviceMobilePreview; 