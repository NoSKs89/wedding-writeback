import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import { useLevaStore } from '../../stores/levaStore';
import { getApiBaseUrl } from '../../config/apiConfig';
import GuestExperience from '../GuestExperience/GuestExperience';
import useWeddingData from '../../hooks/useWeddingData';
import { useSetupMode } from '../../contexts/SetupModeContext';

const MobileLayoutEditor = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData, experienceSettings, loading, error } = useWeddingData(weddingId);
    
    // Get the entire controlValues object from the store
    const allControlValues = useLevaStore(state => state.controlValues);

    // Set setup mode to true when this component mounts
    useEffect(() => {
        setIsSetupMode(true);
        return () => setIsSetupMode(false);
    }, [setIsSetupMode]);

    // Debounced function to save the entire layout state to the preview endpoint
    const debouncedSave = useCallback(debounce((settings) => {
        if (!settings || Object.keys(settings).length === 0) {
            console.log('Auto-save skipped: No settings to save.');
            return;
        }
        const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
        axios.post(apiUrl, { settings })
            .then(response => console.log('Mobile preview auto-saved.', response.data.message))
            .catch(err => console.error('Error auto-saving mobile preview:', err.response?.data?.message || err.message));
    }, 500), [weddingId]);
    
    // This effect now listens to the control values from the store
    useEffect(() => {
        // Only save if there are values to save.
        if (allControlValues && Object.keys(allControlValues).length > 0) {
            debouncedSave(allControlValues);
        }
    }, [allControlValues, debouncedSave]);
    
    const previewUrl = `${window.location.origin}/${weddingId}/mobile-preview`;

    if (loading) {
        return <div>Loading Mobile Editor for "{weddingId}"...</div>;
    }
    
    if (error) {
        return <div style={{ color: 'red', padding: '2rem' }}>{error}</div>;
    }

    if (!weddingData || !experienceSettings) {
        return <div>No data found for this wedding.</div>;
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 1rem',
            backgroundColor: '#dcdcdc',
            minHeight: '100vh',
            boxSizing: 'border-box'
        }}>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h2 style={{marginTop: 0}}>Mobile Layout Editor</h2>
                <p>Changes auto-save. Use the link below to see them on your phone.</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{color: '#007bff'}}>
                    Open Live Preview in New Tab
                </a>
            </div>

            <div style={{
                width: '414px',
                height: '896px',
                maxHeight: 'calc(100vh - 220px)',
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
                        defaultLayoutSlotToLoad={experienceSettings.defaultLayoutSlotMobile || 1}
                        isSetupModeFromProps={true}
                        forceMobileView={true}
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

export default MobileLayoutEditor; 