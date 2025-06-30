import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Leva } from 'leva';
import GuestExperience from '../GuestExperience/GuestExperience';
import useWeddingData from '../../hooks/useWeddingData';
import { useSetupMode } from '../../contexts/SetupModeContext';

const DesktopLayoutEditor = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData, experienceSettings, loading, error } = useWeddingData(weddingId);

    // Set setup mode to true when this component mounts
    useEffect(() => {
        setIsSetupMode(true);
        return () => setIsSetupMode(false);
    }, [setIsSetupMode]);

    // No auto-save for desktop layout editor - use manual save button only

    if (loading) return <div>Loading Desktop Layout Editor...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!weddingData || !experienceSettings) return <div>No wedding data found</div>;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            overflow: 'hidden'
        }}>
            {/* Main GuestExperience Component */}
            <GuestExperience
                weddingDataFromApp={weddingData}
                experienceSettingsFromApp={experienceSettings}
                weddingIdFromApp={weddingId}
                defaultLayoutSlotToLoad={experienceSettings?.defaultLayoutSlotDesktop || 1}
                isSetupModeFromProps={true}
                forceMobileView={false} // Desktop view
                saveButtonContainerStyle={{
                    position: 'fixed',
                    top: '8px',
                    left: '8px',
                    zIndex: 10001,
                    width: '180px',
                    height: '45px'
                }}
            />
            
            {/* Leva Controls Overlay */}
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 10000,
                maxHeight: 'calc(100vh - 20px)',
                maxWidth: '400px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <Leva 
                    fill={false}
                    oneLineLabels={true}
                    titleBar={false}
                />
            </div>
            
            {/* Info Overlay */}
            <div style={{
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                zIndex: 10001,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '8px',
                fontSize: '0.9em',
                maxWidth: '300px'
            }}>
                <h4 style={{ margin: '0 0 5px 0' }}>Desktop Layout Editor</h4>
                <p style={{ margin: 0, fontSize: '0.8em' }}>
                    Use the controls on the right to customize your experience.
                    Click "Save Layout" to save changes to the desktop layout slot.
                </p>
            </div>
        </div>
    );
};

export default DesktopLayoutEditor; 