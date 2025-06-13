import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/apiConfig';
import { transformWeddingData } from '../../App';
import GuestExperience from '../GuestExperience/GuestExperience';

const MobileLayoutPreview = ({ levaStore }) => {
    const { weddingId } = useParams();
    const [baseWeddingData, setBaseWeddingData] = useState(null);
    const [previewLayout, setPreviewLayout] = useState(null);
    const [error, setError] = useState(null);
    const [isInactive, setIsInactive] = useState(false);
    const inactivityTimer = useRef(null);

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
        if (isInactive) {
            console.log('User is active again. Resuming updates.');
            setIsInactive(false); // This will trigger the polling useEffect to restart
        }
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            console.log('User has become inactive. Pausing updates.');
            setIsInactive(true);
        }, 60000); // 1 minute (60 * 1000 ms)
    };

    // Set up event listeners for user activity
    useEffect(() => {
        const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart'];
        
        // Add event listeners
        activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer));
        
        // Initial start of the timer
        resetInactivityTimer();

        // Cleanup on component unmount
        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
            clearTimeout(inactivityTimer.current);
        };
    }, [isInactive]); // Re-run effect if isInactive changes to properly manage state

    // Fetch the base wedding data once on initial load
    useEffect(() => {
        const fetchBaseData = async () => {
            if (!weddingId) return;
            setError(null);
            try {
                const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}`;
                const response = await axios.get(apiUrl);
                if (response.data && response.data.customId) {
                    setBaseWeddingData(transformWeddingData(response.data));
                } else {
                    setError(`Base wedding data for "${weddingId}" not found.`);
                }
            } catch (err) {
                console.error('Error fetching base wedding data for preview:', err);
                setError(`Failed to load base wedding data. ${err.message}`);
            }
        };
        fetchBaseData();
    }, [weddingId]);

    // Poll for preview layout changes, but only if user is active
    useEffect(() => {
        if (!weddingId || isInactive) return;
        let isMounted = true;

        const fetchPreviewLayout = async () => {
            try {
                const apiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
                const response = await axios.get(apiUrl);
                if (isMounted && response.data.settings) {
                    setPreviewLayout(response.data.settings);
                }
            } catch (err) {
                // This is not a critical error, the editor might not have saved yet.
                console.warn('Could not fetch mobile preview layout.');
            }
        };

        console.log('Starting polling for preview updates...');
        fetchPreviewLayout(); // Initial fetch
        const intervalId = setInterval(fetchPreviewLayout, 2000); // Poll every 2 seconds

        return () => {
            console.log('Stopping polling for preview updates.');
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [weddingId, isInactive]); // Depend on isInactive

    if (error) {
        return <div style={{ color: 'red', padding: '2rem', textAlign: 'center' }}>{error}</div>;
    }

    if (!baseWeddingData) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Mobile Preview...</div>;
    }
    
    // Prepare the data for GuestExperience, using preview layout if available
    const dataForGuestExperience = {
        ...baseWeddingData,
        initialElementLayouts: previewLayout || {}, // Use fetched preview layout, or empty object
        defaultLayoutSlotToLoad: 1, // Not relevant for preview, but prop is required
    };

    return (
        <>
            {isInactive && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 20000,
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                }}
                onClick={resetInactivityTimer} // Allow clicking the overlay to resume
                >
                    <p>Live preview paused due to inactivity.
                        <br />
                        <span style={{fontSize: '1rem', opacity: 0.8}}>(Click, scroll, or press any key to resume)</span>
                    </p>
                </div>
            )}
            <GuestExperience
                weddingDataFromApp={dataForGuestExperience}
                experienceSettingsFromApp={dataForGuestExperience.experienceSettings}
                weddingIdFromApp={weddingId}
                defaultLayoutSlotToLoad={dataForGuestExperience.defaultLayoutSlotToLoad}
                isSetupMode={false}
                forceMobileView={true}
                levaStore={levaStore}
            />
        </>
    );
};

export default MobileLayoutPreview; 