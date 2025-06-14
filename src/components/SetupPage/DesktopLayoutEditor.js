import React from 'react';
import { useParams } from 'react-router-dom';
import GuestExperience from '../GuestExperience/GuestExperience';
import { useSetupMode } from '../../contexts/SetupModeContext';
import useWeddingData from '../../hooks/useWeddingData';

const DesktopLayoutEditor = () => {
  const { weddingId } = useParams();
  const { isSetupMode, setIsSetupMode } = useSetupMode();

  // Set setup mode to true when this component mounts
  React.useEffect(() => {
    setIsSetupMode(true);
    // Optional: turn it off on unmount if needed elsewhere
    return () => setIsSetupMode(false);
  }, [setIsSetupMode]);

  const { weddingData, experienceSettings, loading, error } = useWeddingData(weddingId);

  if (loading) {
    return <div>Loading experience data for editor...</div>;
  }

  if (error) {
    return <div>Error loading data: {error}</div>;
  }

  if (!weddingData || !experienceSettings) {
    return <div>No data found for this wedding.</div>;
  }

  return (
    <GuestExperience
      weddingDataFromApp={weddingData}
      experienceSettingsFromApp={experienceSettings}
      weddingIdFromApp={weddingId}
      isSetupModeFromProps={true} // Explicitly pass the setup mode flag
      defaultLayoutSlotToLoad={1} // Or load a specific slot for editing
    />
  );
};

export default DesktopLayoutEditor; 