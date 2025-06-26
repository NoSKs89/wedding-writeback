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

const DesktopLayoutEditor = () => {
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

    // Auto-save logic with debouncing
    const debouncedSave = useCallback(
        debounce(async (controlValues) => {
            if (!weddingId) return;
            
            try {
                const apiBase = getApiBaseUrl();
                // Get the desktop layout slot from Overall Controls - this is CRITICAL for saving to correct slot
                const overallControls = controlValues['Overall Controls (Guest)'] || {};
                const saveToLayoutSlot = overallControls.saveToLayoutSlot || experienceSettings?.defaultLayoutSlotDesktop || 1;
                
                console.log(`[DesktopLayoutEditor] Auto-saving to DESKTOP slot ${saveToLayoutSlot}`, controlValues);
                
                const response = await axios.post(`${apiBase}/weddings/${weddingId}/layoutSettings/desktop`, {
                    settings: controlValues,
                    slotNumber: saveToLayoutSlot
                });
                
                console.log(`[DesktopLayoutEditor] Successfully saved to desktop slot ${saveToLayoutSlot}:`, response.data);
            } catch (error) {
                console.error('[DesktopLayoutEditor] Error auto-saving desktop layout:', error);
            }
        }, 1000),
        [weddingId, experienceSettings?.defaultLayoutSlotDesktop]
    );

    // Trigger auto-save when control values change
    useEffect(() => {
        if (allControlValues && Object.keys(allControlValues).length > 0) {
            debouncedSave(allControlValues);
        }
    }, [allControlValues, debouncedSave]);

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
                    top: '10px',
                    left: '10px',
                    zIndex: 10001,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
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
                    Changes auto-save to the desktop layout slot selected in Overall Controls.
                    Use the controls on the right to customize your experience.
                </p>
            </div>
        </div>
    );
};

export default DesktopLayoutEditor; 