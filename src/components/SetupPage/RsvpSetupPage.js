import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './RsvpSetupPage.module.css';
import RsvpViewerModal from './RsvpViewerModal';
import { getApiBaseUrl } from '../../config/apiConfig';

const RsvpSetupPage = () => {
    const { weddingId } = useParams();
    const [weddingData, setWeddingData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const [isPlated, setIsPlated] = useState(false);
    const [allowKids, setAllowKids] = useState(true);
    const [platedOptions, setPlatedOptions] = useState([{ name: '', description: '', dietaryTags: '' }]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const apiBaseUrl = getApiBaseUrl();

    const fetchWeddingData = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}`);
            
            if (!response.data || !response.data.customId) {
                throw new Error("Invalid API response: Wedding data is missing or malformed.");
            }

            const data = response.data;
            
            // --- Temporary dummy data for previewing the button ---
            const originalRsvps = data.rsvps || [];
            const dummyYes = {
                rsvpId: 'dummy_yes_1',
                firstName: 'John',
                lastName: 'Doe',
                attending: true,
                guestCount: 2,
                submittedAt: new Date().toISOString()
            };
            const dummyNo = {
                rsvpId: 'dummy_no_1',
                firstName: 'Jane',
                lastName: 'Smith',
                attending: false,
                guestCount: 0,
                submittedAt: new Date().toISOString()
            };
            data.rsvps = [...originalRsvps, dummyYes, dummyNo];
            // --- End of temporary data ---

            setWeddingData(data);
            setIsPlated(data.isPlated || false);
            setAllowKids(data.allowKids !== undefined ? data.allowKids : true);
            setPlatedOptions(
                data.platedOptions && data.platedOptions.length > 0
                    ? data.platedOptions.map(opt => ({ ...opt, dietaryTags: (opt.dietaryTags || []).join(', ') }))
                    : [{ name: '', description: '', dietaryTags: '' }]
            );
        } catch (err) {
            console.error("Failed to fetch wedding data:", err);
            setError(err.message || 'An unexpected error occurred while loading data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchWeddingData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weddingId, apiBaseUrl]);

    const handleOptionChange = (index, field, value) => {
        const newOptions = [...platedOptions];
        newOptions[index][field] = value;
        setPlatedOptions(newOptions);
    };

    const addOption = () => {
        setPlatedOptions([...platedOptions, { name: '', description: '', dietaryTags: '' }]);
    };

    const removeOption = (index) => {
        const newOptions = platedOptions.filter((_, i) => i !== index);
        setPlatedOptions(newOptions);
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveStatus('');
        try {
            const settingsToSave = {
                isPlated,
                allowKids,
                platedOptions: isPlated
                    ? platedOptions
                        .filter(opt => opt.name.trim() !== '')
                        .map(opt => ({
                            name: opt.name,
                            description: opt.description,
                            dietaryTags: opt.dietaryTags.split(',').map(tag => tag.trim()).filter(Boolean)
                        }))
                    : []
            };

            await axios.put(`${apiBaseUrl}/weddings/${weddingId}/rsvp-settings`, settingsToSave);
            
            setSaveStatus('Settings saved successfully!');
        } catch (err) {
            console.error("Failed to save settings:", err);
            setSaveStatus('Error saving settings.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleDeleteRsvp = async (rsvpId) => {
        if (!window.confirm('Are you sure you want to remove this RSVP? This action cannot be undone.')) {
            return;
        }
        
        setIsSaving(true); // Reuse isSaving state to show loading
        setSaveStatus('');

        try {
            await axios.delete(`${apiBaseUrl}/weddings/${weddingId}/rsvps/${rsvpId}`);
            setSaveStatus('RSVP deleted successfully.');
            await fetchWeddingData(); // Refetch data to update the UI
        } catch (err) {
            console.error('Failed to delete RSVP:', err);
            setSaveStatus('Failed to delete RSVP. Please try again.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    if (isLoading && !weddingData) return <div>Loading RSVP settings...</div>;
    if (error) return <div>{error}</div>;

    const rsvpCount = weddingData?.rsvps?.length || 0;

    // Calculate percentages for the button background
    const attendingCount = weddingData?.rsvps?.filter(r => r.attending).length || 0;
    const decliningCount = weddingData?.rsvps?.filter(r => !r.attending).length || 0;
    const totalResponses = attendingCount + decliningCount;
    
    let buttonBackgroundStyle = {};
    let attendingPercentage = 0;
    let decliningPercentage = 0;
    
    if (totalResponses > 0) {
        attendingPercentage = Math.round((attendingCount / totalResponses) * 100);
        decliningPercentage = Math.round((decliningCount / totalResponses) * 100);
        
        // Gradient: starts red, immediately switches to green at the percentage break.
        buttonBackgroundStyle = {
            background: `linear-gradient(to right, #dc3545 ${decliningPercentage}%, #28a745 ${decliningPercentage}%)`
        };
    }

    return (
        <div className={styles.container}>
            <button
                className={styles.viewSubmissionsButton}
                onClick={() => setIsModalOpen(true)}
                disabled={isSaving || rsvpCount === 0}
                style={{
                    ...buttonBackgroundStyle,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <span style={{ position: 'relative', zIndex: 2 }}>
                    View Submissions ({rsvpCount})
                </span>
                {totalResponses > 0 && (
                    <>
                        {decliningPercentage > 0 && (
                            <span style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.85em',
                                fontStyle: 'italic',
                                color: 'rgba(255, 255, 255, 0.9)',
                                zIndex: 1,
                                pointerEvents: 'none'
                            }}>
                                {decliningPercentage}%
                            </span>
                        )}
                        {attendingPercentage > 0 && (
                            <span style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.85em',
                                fontStyle: 'italic',
                                color: 'rgba(255, 255, 255, 0.9)',
                                zIndex: 1,
                                pointerEvents: 'none'
                            }}>
                                {attendingPercentage}%
                            </span>
                        )}
                    </>
                )}
            </button>

            <div className={styles.header}>
                <h1>RSVP Form Setup</h1>
            </div>

            {saveStatus && <div className={styles.saveStatusMessage}>{saveStatus}</div>}

            <button onClick={handleSaveSettings} disabled={isSaving} className={styles.saveButton}>
                {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Guest Settings</h2>
                <div className={styles.settingRow}>
                    <h3 className={styles.settingLabel}>Allow Kids</h3>
                    <div className={styles.toggleSwitch}>
                        <button
                            className={`${styles.toggleButton} ${!allowKids ? styles.active : ''}`}
                            onClick={() => setAllowKids(false)}
                        >
                            No
                        </button>
                        <button
                            className={`${styles.toggleButton} ${allowKids ? styles.active : ''}`}
                            onClick={() => setAllowKids(true)}
                        >
                            Yes
                        </button>
                    </div>
                    <p className={styles.settingDescription}>
                        When enabled, guests can specify adult and kids counts separately. 
                        When disabled, only total guest count is shown.
                    </p>
                </div>
            </div>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Meal Type</h2>
                <div className={styles.toggleSwitch}>
                    <button
                        className={`${styles.toggleButton} ${!isPlated ? styles.active : ''}`}
                        onClick={() => setIsPlated(false)}
                    >
                        Buffet
                    </button>
                    <button
                        className={`${styles.toggleButton} ${isPlated ? styles.active : ''}`}
                        onClick={() => setIsPlated(true)}
                    >
                        Plated Meal
                    </button>
                </div>
            </div>

            {isPlated && (
                <div className={`${styles.card} ${styles.platedOptionsCard}`}>
                    <h2 className={styles.cardTitle}>Plated Meal Options</h2>
                    {platedOptions.map((option, index) => (
                        <div key={index} className={styles.optionRow}>
                            <input
                                type="text"
                                placeholder="Meal Name (e.g., Steak, Salmon)"
                                value={option.name}
                                onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                                className={styles.input}
                            />
                            <input
                                type="text"
                                placeholder="Description (e.g., with potatoes and asparagus)"
                                value={option.description}
                                onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                                className={styles.input}
                            />
                             <input
                                type="text"
                                placeholder="Dietary Tags (e.g., Gluten Free, Vegan)"
                                value={option.dietaryTags}
                                onChange={(e) => handleOptionChange(index, 'dietaryTags', e.target.value)}
                                className={styles.input}
                            />
                            <button onClick={() => removeOption(index)} className={styles.removeButton}>&times;</button>
                        </div>
                    ))}
                    <button onClick={addOption} className={styles.addButton}>
                        + Add Meal Option
                    </button>
                </div>
            )}

            {isModalOpen && weddingData && (
                <RsvpViewerModal
                    rsvps={weddingData.rsvps || []}
                    history={weddingData.rsvpHistory || []}
                    onClose={() => setIsModalOpen(false)}
                    onDelete={handleDeleteRsvp}
                    allowKids={allowKids}
                />
            )}
        </div>
    );
};

export default RsvpSetupPage; 