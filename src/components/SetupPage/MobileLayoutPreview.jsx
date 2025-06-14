import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import GuestExperience from '../GuestExperience/GuestExperience';
import useWeddingData from '../../hooks/useWeddingData';
import { useSetupMode } from '../../contexts/SetupModeContext';
import { useLevaStore } from '../../stores/levaStore';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';

const MobileLayoutPreview = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData, experienceSettings, loading, error } = useWeddingData(weddingId);
    
    // This component is strictly for preview, so setup mode is always false.
    useEffect(() => {
        setIsSetupMode(false);
    }, [setIsSetupMode]);

    // This effect will specifically load the LATEST preview settings from the server
    useEffect(() => {
        if (!weddingId) return;

        const loadPreviewSettings = async () => {
            const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
            try {
                const response = await axios.get(apiUrl);
                if (response.data.settings && Object.keys(response.data.settings).length > 0) {
                    // Use the loadSettingsFromDB action to populate the store with preview data
                    useLevaStore.getState().loadSettingsFromDB(response.data.settings, 'preview');
                    console.log("Mobile preview loaded.");
                } else {
                    // If no preview, load default slot 1 as a fallback
                    console.log("No mobile preview found, loading slot 1 as fallback.");
                    useLevaStore.getState().switchPreviewingSlot(weddingId, 'mobile', 1);
                }
            } catch (err) {
                console.error("Failed to load mobile preview, loading slot 1 as fallback.", err);
                useLevaStore.getState().switchPreviewingSlot(weddingId, 'mobile', 1);
            }
        };

        loadPreviewSettings();

    }, [weddingId]);


    if (loading) {
        return <div>Loading Mobile Preview...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', padding: '2rem' }}>{error}</div>;
    }

    if (!weddingData || !experienceSettings) {
        return <div>No data found for this wedding.</div>;
    }

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#333'
        }}>
            <div style={{
                width: '414px',
                height: '896px',
                border: '10px solid black',
                borderRadius: '40px',
                boxShadow: '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                 <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    overflow: 'auto',
                }}>
                    <GuestExperience
                        weddingDataFromApp={weddingData}
                        experienceSettingsFromApp={experienceSettings}
                        weddingIdFromApp={weddingId}
                        isSetupModeFromProps={false} // This is a preview, so no setup controls
                        forceMobileView={true}      // Always force mobile view
                    />
                </div>
                {/* Notch */}
                <div style={{
                    position: 'absolute',
                    top: '0px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '180px',
                    height: '25px',
                    backgroundColor: 'black',
                    borderBottomLeftRadius: '15px',
                    borderBottomRightRadius: '15px',
                }} />
            </div>
        </div>
    );
};

export default MobileLayoutPreview; 