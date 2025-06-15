import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import GuestExperiencePreview from '../GuestExperience/GuestExperiencePreview';
import useWeddingData from '../../hooks/useWeddingData';
import { useSetupMode } from '../../contexts/SetupModeContext';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import { useIsMobile } from '../../utils/deviceDetect';

const MobileLayoutPreview = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData, experienceSettings, loading: initialDataLoading, error } = useWeddingData(weddingId);
    
    const [liveLayoutSettings, setLiveLayoutSettings] = useState(null);
    const [isInactive, setIsInactive] = useState(false);
    const inactivityTimer = useRef(null);
    const isMobile = useIsMobile();

    // This component is strictly for preview, so setup mode is always false.
    useEffect(() => {
        setIsSetupMode(false);
    }, [setIsSetupMode]);

    const loadPreviewSettings = useCallback(async () => {
        if (!weddingId) return;
        const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
        try {
            const response = await axios.get(apiUrl);
            if (response.data.settings && Object.keys(response.data.settings).length > 0) {
                setLiveLayoutSettings(response.data.settings);
            }
        } catch (err) {
            console.error("Failed to load mobile preview.", err);
        }
    }, [weddingId]);
    
    // Effect for polling data
    useEffect(() => {
        if (isInactive) return;

        loadPreviewSettings(); // Initial load when becoming active
        const pollingInterval = setInterval(loadPreviewSettings, 4000); // Poll every 4 seconds

        return () => {
            clearInterval(pollingInterval);
        };
    }, [isInactive, loadPreviewSettings]);

    // Effect for inactivity timer
    useEffect(() => {
        const resetInactivityTimer = () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            if (isInactive) {
                setIsInactive(false);
            }
            inactivityTimer.current = setTimeout(() => {
                setIsInactive(true);
            }, 20000); // 20 seconds
        };

        const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));
        
        resetInactivityTimer(); // Initial call to start the timer

        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
        };
    }, [isInactive]);


    if (initialDataLoading) {
        return <div>Loading Mobile Preview...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', padding: '2rem' }}>{error}</div>;
    }

    if (!weddingData || !experienceSettings) {
        return <div>No data found for this wedding.</div>;
    }

    const previewContent = (
        liveLayoutSettings ? (
            <GuestExperiencePreview
                weddingDataFromApp={weddingData}
                experienceSettingsFromApp={experienceSettings}
                layoutSettingsFromPreview={liveLayoutSettings}
                forceMobileView={true}
            />
        ) : (
            <div>Loading live layout...</div>
        )
    );

    if (isMobile) {
        return (
            <div style={{ width: '100%', height: '100%' }}>
                {previewContent}
            </div>
        );
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
            {isInactive && (
                 <div style={{
                     position: 'fixed',
                     top: 0, left: 0, right: 0, bottom: 0,
                     backgroundColor: 'rgba(0,0,0,0.7)',
                     color: 'white',
                     display: 'flex',
                     justifyContent: 'center',
                     alignItems: 'center',
                     textAlign: 'center',
                     zIndex: 10000,
                     fontSize: '1.2rem'
                 }}>
                     <p>Preview paused due to inactivity.<br/><small>(Move mouse or scroll to resume)</small></p>
                 </div>
            )}
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
                    {previewContent}
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