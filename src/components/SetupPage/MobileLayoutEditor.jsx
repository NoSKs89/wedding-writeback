import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import { useLevaStore } from '../../stores/levaStore';
import { getApiBaseUrl } from '../../config/apiConfig';
import { transformWeddingData } from '../../App'; // Import the transformer
import GuestExperience from '../GuestExperience/GuestExperience'; // The component we want to render

const MobileLayoutEditor = ({ levaStore }) => {
    const { weddingId } = useParams();
    const [weddingData, setWeddingData] = useState(null);
    const [error, setError] = useState(null);
    const store = useLevaStore();

    // Debounced function to save settings to the preview endpoint
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

    // Callback for when any control value changes
    const handleControlChange = useCallback(() => {
        // Give Leva a moment to update its internal state
        setTimeout(() => {
            const newSettings = store.getSettingsForSave();
            debouncedSave(newSettings);
        }, 100); // Increased timeout slightly to ensure Leva store updates
    }, [store, debouncedSave]);

    // This is similar to the logic in WeddingPageController
    useEffect(() => {
        const fetchWeddingData = async () => {
            if (!weddingId) return;
            setError(null);
            try {
                // 1. Get the base wedding data
                const weddingApiUrl = `${getApiBaseUrl()}/weddings/${weddingId}`;
                const weddingResponse = await axios.get(weddingApiUrl);
                const sourceData = weddingResponse.data;

                if (!sourceData || !sourceData.customId) {
                    setError(`Wedding data for "${weddingId}" not found.`);
                    return;
                }

                // 2. Transform the base data
                const transformedData = transformWeddingData(sourceData);

                // 3. Try to get existing preview data
                let initialLayout = {};
                const previewApiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
                try {
                    const previewResponse = await axios.get(previewApiUrl);
                    if (previewResponse.data.settings && Object.keys(previewResponse.data.settings).length > 0) {
                        initialLayout = previewResponse.data.settings;
                        console.log('Mobile editor loaded settings from PREVIEW.');
                    }
                } catch (previewErr) {
                    console.warn("Could not fetch mobile preview settings, will load from slot.", previewErr.message);
                }

                // 4. If no preview data, load from a numbered slot.
                const defaultSlotToLoad = transformedData.defaultLayoutSlotToLoad || 1;
                if (Object.keys(initialLayout).length === 0) {
                    console.log(`Mobile editor loading settings from slot ${defaultSlotToLoad} as fallback.`);
                    initialLayout = transformedData.allLayoutSlots.mobile[defaultSlotToLoad] || {};
                }

                // 5. Populate the final data object for GuestExperience
                transformedData.initialElementLayouts = initialLayout;
                transformedData.defaultLayoutSlotToLoad = useLevaStore.getState().currentPreviewingSlot || defaultSlotToLoad;

                setWeddingData(transformedData);

            } catch (err) {
                console.error('Error fetching wedding data for mobile editor:', err);
                setError(`Failed to load wedding data. ${err.message}`);
            }
        };
        fetchWeddingData();
    }, [weddingId]);

    // Construct the preview URL
    const previewUrl = `${window.location.origin}/${weddingId}/mobile-preview`;

    if (error) {
        return <div style={{ color: 'red', padding: '2rem' }}>{error}</div>;
    }

    if (!weddingData) {
        return <div>Loading Mobile Editor for "{weddingId}"...</div>;
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
                width: '414px', // A bit wider, like iPhone 11 Pro Max
                height: '896px', // Taller
                maxHeight: 'calc(100vh - 220px)', // ensure it fits in viewport, leaving space for header
                border: '10px solid black',
                borderRadius: '40px',
                boxShadow: '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
                position: 'relative',
                overflow: 'hidden' // This will clip the content to the phone's screen
            }}>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    overflow: 'auto', // Make the content scrollable
                }}>
                    <GuestExperience
                        weddingDataFromApp={weddingData}
                        experienceSettingsFromApp={weddingData.experienceSettings}
                        weddingIdFromApp={weddingId}
                        defaultLayoutSlotToLoad={weddingData.defaultLayoutSlotToLoad}
                        isSetupMode={true}
                        forceMobileView={true} // IMPORTANT: This forces mobile mode
                        onControlChange={handleControlChange} // Wire up the auto-save callback
                        levaStore={levaStore} // Pass it down
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