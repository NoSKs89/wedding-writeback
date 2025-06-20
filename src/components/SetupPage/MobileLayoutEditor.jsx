import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import { Leva } from 'leva';
import { useLevaStore } from '../../stores/levaStore';
import { getApiBaseUrl } from '../../config/apiConfig';
import GuestExperience from '../GuestExperience/GuestExperience';
import useWeddingData from '../../hooks/useWeddingData';
import { useSetupMode } from '../../contexts/SetupModeContext';

const MobileLayoutEditor = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData, experienceSettings, loading, error } = useWeddingData(weddingId);
    
    // Set body background color for this page
    useEffect(() => {
        const originalColor = document.body.style.backgroundColor;
        document.body.style.backgroundColor = 'black';
        return () => {
            document.body.style.backgroundColor = originalColor;
        };
    }, []);

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
        <>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                width: '100%',
                minHeight: '100vh',
                backgroundColor: 'black',
                position: 'relative',
            }}>
                {/* Column 1: Info */}
                <div style={{
                    flex: '0 0 25%',
                    padding: '2rem 1rem',
                    boxSizing: 'border-box',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2rem',
                }}>
                    
                    <div style={{ width: '100%', padding: '1rem', background: '#333', color: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h2 style={{marginTop: 0}}>Mobile Layout Editor</h2>
                        <p>Changes auto-save. Use the link below to see them on your phone.</p>
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{color: '#87cefa'}}>
                            Open Live Preview in New Tab
                        </a>
                    </div>
                </div>

                {/* Column 2: Leva Controls */}
                <div style={{
                    flex: '0 0 50%',
                    height: '100vh',
                    overflowY: 'auto',
                    borderLeft: '1px solid #444',
                    borderRight: '1px solid #444',
                }}>
                    <Leva fill />
                </div>

                {/* Column 3: Phone Preview */}
                <div style={{
                    flex: '0 0 25%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    padding: '1rem',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '414px',
                        height: 'calc(100vh - 4rem)',
                        maxHeight: '896px',
                        border: '10px solid #4a4a4a',
                        borderRadius: '40px',
                        boxShadow: '0 19px 38px rgba(0,0,0,0.40), 0 15px 12px rgba(0,0,0,0.32)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{
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
                                saveButtonContainerStyle={{
                                    position: 'fixed',
                                    bottom: '1rem',
                                    left: '1rem',
                                    zIndex: 10001,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '5px'
                                }}
                            />
                        </div>
                        {/* Notch */}
                        <div style={{
                            position: 'absolute',
                            top: '0px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '50%',
                            maxWidth: '180px',
                            height: '25px',
                            backgroundColor: '#4a4a4a',
                            borderBottomLeftRadius: '15px',
                            borderBottomRightRadius: '15px',
                            zIndex: 10
                        }} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileLayoutEditor;