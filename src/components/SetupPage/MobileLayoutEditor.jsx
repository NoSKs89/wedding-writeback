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
import DeviceMobilePreview from './DeviceMobilePreview';
import { transformWeddingData } from '../../App';
import { useIsMobile } from '../../utils/deviceDetect';

// Device options with their supported colors and physical dimensions
const DEVICE_OPTIONS = [
    { 
        value: 'iPhone X', 
        label: 'iPhone X', 
        colors: [], // No color options for iPhone X
        defaultColor: null,
        dimensions: { width: '2.79"', height: '5.65"' }
    },
    { 
        value: 'iPhone 8', 
        label: 'iPhone 8', 
        colors: ['black', 'silver', 'gold'],
        defaultColor: 'black',
        dimensions: { width: '2.65"', height: '5.45"' }
    },
    { 
        value: 'iPhone 8 Plus', 
        label: 'iPhone 8 Plus', 
        colors: ['black', 'silver', 'gold'],
        defaultColor: 'black',
        dimensions: { width: '3.07"', height: '6.24"' }
    },
    { 
        value: 'iPhone 5s', 
        label: 'iPhone 5s', 
        colors: ['black', 'silver', 'gold'],
        defaultColor: 'black',
        dimensions: { width: '2.31"', height: '4.87"' }
    },
    { 
        value: 'iPhone 5c', 
        label: 'iPhone 5c', 
        colors: ['white', 'red', 'yellow', 'green', 'blue'],
        defaultColor: 'white',
        dimensions: { width: '2.33"', height: '4.90"' }
    },
    { 
        value: 'iPhone 4s', 
        label: 'iPhone 4s', 
        colors: ['black', 'silver'],
        defaultColor: 'black',
        dimensions: { width: '2.31"', height: '4.54"' }
    },
    { 
        value: 'Galaxy Note 8', 
        label: 'Galaxy Note 8', 
        colors: [], // No color options
        defaultColor: null,
        dimensions: { width: '3.17"', height: '6.53"' }
    },
    { 
        value: 'Nexus 5', 
        label: 'Nexus 5', 
        colors: [], // No color options
        defaultColor: null,
        dimensions: { width: '2.72"', height: '5.43"' }
    },
    { 
        value: 'Samsung Galaxy S5', 
        label: 'Samsung Galaxy S5', 
        colors: ['white', 'black'],
        defaultColor: 'white',
        dimensions: { width: '2.85"', height: '5.59"' }
    },
    { 
        value: 'HTC One', 
        label: 'HTC One', 
        colors: [], // No color options
        defaultColor: null,
        dimensions: { width: '2.68"', height: '5.41"' }
    },
    { 
        value: 'Lumia 920', 
        label: 'Lumia 920', 
        colors: ['black', 'white', 'yellow', 'red', 'blue'],
        defaultColor: 'black',
        dimensions: { width: '2.79"', height: '5.13"' }
    },
    { 
        value: 'iPad Mini', 
        label: 'iPad Mini', 
        colors: ['black', 'silver'],
        defaultColor: 'black',
        dimensions: { width: '5.3"', height: '8.0"' }
    }
];

// Helper function to get device config
const getDeviceConfig = (deviceName) => {
    return DEVICE_OPTIONS.find(device => device.value === deviceName) || DEVICE_OPTIONS[0];
};

const MobileLayoutEditor = () => {
    const { weddingId } = useParams();
    const { setIsSetupMode } = useSetupMode();
    const { weddingData: rawWeddingData, experienceSettings, loading, error } = useWeddingData(weddingId);
    const isMobile = useIsMobile();
    const [useEnhancedPreview, setUseEnhancedPreview] = useState(true);
    
    // Device preview state
    const [selectedDevice, setSelectedDevice] = useState('iPhone X');
    const [deviceOrientation, setDeviceOrientation] = useState('portrait');
    const [deviceColor, setDeviceColor] = useState(''); // iPhone X doesn't have color options

    // Save functionality state
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);
    const [saveErrorMessage, setSaveErrorMessage] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Get current device configuration
    const currentDeviceConfig = getDeviceConfig(selectedDevice);

    // Handle device change
    const handleDeviceChange = (deviceName) => {
        setSelectedDevice(deviceName);
        const newDeviceConfig = getDeviceConfig(deviceName);
        // Reset to default color when device changes
        setDeviceColor(newDeviceConfig.defaultColor || '');
    };

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
    
    // Debug state for showing save status
    const [autoSaveStatus, setAutoSaveStatus] = useState('');

    // Set setup mode to true when this component mounts
    useEffect(() => {
        setIsSetupMode(true);
        return () => setIsSetupMode(false);
    }, [setIsSetupMode]);

    // Debounced function to save the entire layout state to BOTH preview and main endpoints
    const debouncedSave = useCallback(debounce(async (settings) => {
        if (!settings || Object.keys(settings).length === 0) {
            console.log('Auto-save skipped: No settings to save.');
            return;
        }
        
        setAutoSaveStatus('Saving...');
        
        // Save to BOTH endpoints so mobile-preview and actual mobile experience stay in sync
        const previewApiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/preview/mobile`;
        const mainApiUrl = `${getApiBaseUrl()}/weddings/${weddingId}/layoutSettings/mobile`;
        
        try {
            // Save to preview endpoint for mobile-preview route
            await axios.post(previewApiUrl, { settings });
            console.log('Mobile preview auto-saved.');
            
            // Save to main mobile slot 1 for actual mobile experience
            await axios.post(mainApiUrl, { settings, slotNumber: 1 });
            console.log('Mobile slot 1 auto-saved.');
            
            setAutoSaveStatus('✓ Synced');
            setTimeout(() => setAutoSaveStatus(''), 2000);
        } catch (err) {
            console.error('Error auto-saving mobile layout:', err.response?.data?.message || err.message);
            setAutoSaveStatus('✗ Error');
            setTimeout(() => setAutoSaveStatus(''), 3000);
        }
    }, 500), [weddingId]);
    
    // This effect now listens to the control values from the store
    useEffect(() => {
        if (allControlValues && Object.keys(allControlValues).length > 0) {
            debouncedSave(allControlValues);
        }
    }, [allControlValues, debouncedSave]);
    
    const previewUrl = `${window.location.origin}/${weddingId}/mobile-preview`;

    // Save functionality
    const handleSaveConfiguration = () => {
        if (weddingId) {
            setShowSaveConfirm(true);
        } else {
            setSaveErrorMessage('Cannot save: Wedding ID is missing.');
            setTimeout(() => setSaveErrorMessage(null), 5000);
        }
    };

    const cancelSave = () => setShowSaveConfirm(false);

    const confirmSave = async () => {
        setShowSaveConfirm(false);
        setIsSaving(true);
        setSaveSuccessMessage(null);
        setSaveErrorMessage(null);

        try {
            const layoutSettings = useLevaStore.getState().controlValues;
            await useLevaStore.getState().saveSettingsToServer(weddingId, 'mobile', 1, layoutSettings);
            setSaveSuccessMessage('Mobile layout saved successfully!');
            setTimeout(() => setSaveSuccessMessage(null), 3000);
        } catch (error) {
            setSaveErrorMessage(`Failed to save layout. Error: ${error.message || 'Unknown error'}`);
            setTimeout(() => setSaveErrorMessage(null), 7000);
        }
        setIsSaving(false);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'white' }}>Loading Experience...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'white' }}>Error loading wedding data: {error}</div>;
    }

    if (!rawWeddingData || !experienceSettings) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'white' }}>No wedding data found.</div>;
    }

    // Transform the raw wedding data
    const transformedWeddingData = transformWeddingData(rawWeddingData);
    if (!transformedWeddingData) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'white' }}>Error processing wedding data.</div>;
    }

    // Load the mobile layout data
    const mobileSlotData = transformedWeddingData.allLayoutSlots?.mobile?.[1] || {};
    console.log(`📱 MobileLayoutEditor: Loading mobile slot data`, {
        timestamp: Date.now(),
        weddingId,
        hasAllLayoutSlots: !!transformedWeddingData.allLayoutSlots,
        hasMobileSlots: !!transformedWeddingData.allLayoutSlots?.mobile,
        mobileSlotData,
        mobileSlotDataKeys: Object.keys(mobileSlotData)
    });
    transformedWeddingData.initialElementLayouts = mobileSlotData;

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
                    padding: '1rem 0.5rem 1rem 0.75rem',
                    boxSizing: 'border-box',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '1rem',
                    overflow: 'hidden', // Prevent overflow
                }}>
                    
                    <div style={{ 
                        width: '100%', 
                        maxWidth: '100%', // Ensure it doesn't exceed container
                        padding: '1rem', 
                        background: '#333', 
                        color: 'white', 
                        borderRadius: '8px', 
                        textAlign: 'center', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        boxSizing: 'border-box' // Include padding in width calculation
                    }}>
                        <h2 style={{marginTop: 0}}>Mobile Layout Editor</h2>
                        <p>Changes auto-save to both preview and live mobile experience.</p>
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{color: '#87cefa'}}>
                            Open Live Preview in New Tab
                        </a>
                        {autoSaveStatus && (
                            <div style={{
                                marginTop: '10px',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                fontSize: '0.9em',
                                backgroundColor: autoSaveStatus.includes('✓') ? '#d4edda' : 
                                               autoSaveStatus.includes('✗') ? '#f8d7da' : '#fff3cd',
                                color: autoSaveStatus.includes('✓') ? '#155724' : 
                                       autoSaveStatus.includes('✗') ? '#721c24' : '#856404',
                                border: `1px solid ${autoSaveStatus.includes('✓') ? '#c3e6cb' : 
                                                    autoSaveStatus.includes('✗') ? '#f5c6cb' : '#ffeeba'}`
                            }}>
                                {autoSaveStatus}
                            </div>
                        )}
                        
                        {/* Preview Mode Toggle */}
                        <div style={{ marginTop: '1rem', padding: '0.5rem 0', borderTop: '1px solid #555' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                                Preview Mode:
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox"
                                    checked={useEnhancedPreview}
                                    onChange={(e) => setUseEnhancedPreview(e.target.checked)}
                                />
                                <span style={{ fontSize: '0.8rem' }}>
                                    {useEnhancedPreview ? 'Enhanced Device Frames' : 'Simple Preview'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Device Controls */}
                    {useEnhancedPreview && (
                        <div style={{
                            width: '100%',
                            maxWidth: '100%', // Ensure it doesn't exceed container
                            background: '#333',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '15px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            boxSizing: 'border-box' // Include padding in width calculation
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Device Settings</h3>
                            
                            {/* Device Selector */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: '600', 
                                    color: 'white',
                                    marginBottom: '5px',
                                    display: 'block'
                                }}>
                                    Device Model:
                                </label>
                                <select 
                                    value={selectedDevice}
                                    onChange={(e) => handleDeviceChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #555',
                                        fontSize: '0.9rem',
                                        backgroundColor: '#444',
                                        color: 'white',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {DEVICE_OPTIONS.map(device => (
                                        <option key={device.value} value={device.value}>{device.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Device Color Selector */}
                            {currentDeviceConfig.colors.length > 0 && (
                                <div style={{ marginBottom: '15px' }}>
                                    <label htmlFor="device-color" style={{ 
                                        display: 'block', 
                                        marginBottom: '5px', 
                                        fontSize: '0.9rem', 
                                        color: 'white' 
                                    }}>
                                        Device Color:
                                    </label>
                                    <select
                                        id="device-color"
                                        value={deviceColor}
                                        onChange={(e) => setDeviceColor(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '0.9rem',
                                            border: '1px solid #555',
                                            borderRadius: '6px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {currentDeviceConfig.colors.map(color => (
                                            <option key={color} value={color}>
                                                {color.charAt(0).toUpperCase() + color.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Device Dimensions Display */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontSize: '0.9rem', 
                                    color: 'white' 
                                }}>
                                    Device Dimensions:
                                </label>
                                <div style={{
                                    padding: '8px 10px',
                                    backgroundColor: '#555',
                                    border: '1px solid #777',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    color: '#fff',
                                    fontFamily: 'monospace'
                                }}>
                                    <div>Width: {currentDeviceConfig.dimensions.width}</div>
                                    <div>Height: {currentDeviceConfig.dimensions.height}</div>
                                </div>
                            </div>

                            {/* Device Orientation */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '5px', 
                                    fontSize: '0.9rem', 
                                    color: 'white' 
                                }}>
                                    Device Orientation:
                                </label>
                                <div>
                                    <label style={{ marginRight: '15px', fontSize: '0.85rem', color: 'white' }}>
                                        <input
                                            type="radio"
                                            name="orientation"
                                            value="portrait"
                                            checked={deviceOrientation === 'portrait'}
                                            onChange={(e) => setDeviceOrientation(e.target.value)}
                                            style={{ marginRight: '5px' }}
                                        />
                                        Portrait
                                    </label>
                                    <label style={{ fontSize: '0.85rem', color: 'white' }}>
                                        <input
                                            type="radio"
                                            name="orientation"
                                            value="landscape"
                                            checked={deviceOrientation === 'landscape'}
                                            onChange={(e) => setDeviceOrientation(e.target.value)}
                                            style={{ marginRight: '5px' }}
                                        />
                                        Landscape
                                    </label>
                                </div>
                            </div>


                        </div>
                    )}
                </div>

                {/* Column 2: Leva Controls */}
                <div style={{
                    flex: '0 0 50%',
                    height: '100vh',
                    overflowY: 'auto',
                    borderLeft: '1px solid #444',
                    borderRight: '1px solid #444',
                    padding: '0.5rem 1rem',
                    boxSizing: 'border-box',
                }}>
                    <Leva fill />
                </div>

                {/* Column 3: Enhanced Device Preview */}
                <div style={{
                    flex: '0 0 25%',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'black',
                    padding: '10px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}>
                    {useEnhancedPreview ? (
                        <DeviceMobilePreview 
                            weddingData={transformedWeddingData} 
                            experienceSettings={experienceSettings} 
                            weddingId={weddingId} 
                            allControlValues={allControlValues}
                            selectedDevice={selectedDevice}
                            deviceOrientation={deviceOrientation}
                            deviceColor={deviceColor}
                            saveButtonContainerStyle={{
                                display: 'none', // Hide the internal save button
                            }}
                        />
                    ) : (
                        // Simple phone preview without device frame
                        <div style={{
                            width: '240px',
                            height: '426px',
                            backgroundColor: 'black',
                            borderRadius: '20px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            border: '3px solid #333',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'white',
                                borderRadius: '15px',
                                overflow: 'hidden',
                                position: 'relative',
                            }}>
                                <GuestExperience
                                    weddingDataFromApp={transformedWeddingData}
                                    experienceSettingsFromApp={experienceSettings}
                                    weddingIdFromApp={weddingId}
                                    defaultLayoutSlotToLoad={1}
                                    isSetupModeFromProps={false} // Disable internal save button
                                    forceMobileView={true}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Save Layout Button - positioned at bottom left of the page */}
            <div style={{
                position: 'fixed',
                bottom: '1rem',
                left: '1rem',
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
            }}>
                <button 
                    onClick={handleSaveConfiguration} 
                    disabled={isSaving || showSaveConfirm} 
                    style={{ 
                        padding: '10px 15px', 
                        fontSize: '0.9rem', 
                        color: 'white', 
                        backgroundColor: isSaving ? '#cf5200' : (showSaveConfirm ? '#ffc107' : '#007bff'), 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer' 
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Layout'}
                </button>
                {saveSuccessMessage && (
                    <div style={{
                        color: 'lime', 
                        background: 'rgba(0,0,0,0.7)', 
                        padding: '5px', 
                        borderRadius: '3px',
                        fontSize: '0.8rem'
                    }}>
                        {saveSuccessMessage}
                    </div>
                )}
                {saveErrorMessage && (
                    <div style={{
                        color: 'red', 
                        background: 'rgba(0,0,0,0.7)', 
                        padding: '5px', 
                        borderRadius: '3px',
                        fontSize: '0.8rem'
                    }}>
                        {saveErrorMessage}
                    </div>
                )}
            </div>

            {/* Save Confirmation Modal */}
            {showSaveConfirm && (
                <>
                    {/* Modal backdrop */}
                    <div 
                        style={{ 
                            position: 'fixed', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                            zIndex: 999998,
                            pointerEvents: 'auto'
                        }} 
                        onClick={cancelSave}
                    />
                    {/* Modal content */}
                    <div style={{ 
                        position: 'fixed', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '8px', 
                        zIndex: 999999, 
                        textAlign: 'center', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto'
                    }}>
                        <p>Save Mobile Layout?</p>
                        <button 
                            onClick={confirmSave} 
                            style={{ 
                                padding: '8px 15px', 
                                margin: '0 10px', 
                                background: '#28a745', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '5px',
                                cursor: 'pointer',
                                pointerEvents: 'auto'
                            }}
                        >
                            Yes, Save
                        </button>
                        <button 
                            onClick={cancelSave} 
                            style={{ 
                                padding: '8px 15px', 
                                margin: '0 10px', 
                                background: '#dc3545', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '5px',
                                cursor: 'pointer',
                                pointerEvents: 'auto'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </>
    );
};

export default MobileLayoutEditor;