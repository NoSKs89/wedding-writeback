import React, { useState } from 'react';
import styles from './RsvpViewerModal.module.css';
import HistoryViewerModal from './HistoryViewerModal';

// Icon components defined locally for this modal
const CheckIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const RsvpViewerModal = ({ rsvps = [], history = [], onClose, onDelete }) => {
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    const formatTimestamp = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // This function formats the meal choices object for readable display in the table.
    const formatMealChoices = (choices) => {
        if (!choices || Object.keys(choices).length === 0) {
            return 'N/A';
        }
        return Object.entries(choices)
            .map(([meal, quantity]) => `${meal} (x${quantity})`)
            .join(', ');
    };

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>RSVP Submissions ({rsvps.length})</h2>
                    <div>
                        <button onClick={() => setIsHistoryVisible(true)} className={styles.historyButton}>History</button>
                        <button onClick={onClose} className={styles.closeButton}>&times;</button>
                    </div>
                </div>
                <div className={styles.content}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Attending</th>
                                <th>Guests</th>
                                <th>Email</th>
                                <th>Meal Choices</th>
                                <th>Message</th>
                                <th>Submitted At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rsvps && rsvps.length > 0 ? (
                                rsvps.map((rsvp) => (
                                    <tr key={rsvp.rsvpId || rsvp._id}>
                                        <td>{rsvp.firstName} {rsvp.lastName}</td>
                                        <td>
                                            <div className={`${styles.attendingCellIcon} ${rsvp.attending ? styles.attendingYes : styles.attendingNo}`}>
                                                {rsvp.attending ? <CheckIcon /> : <XIcon />}
                                            </div>
                                        </td>
                                        <td>{rsvp.guestCount}</td>
                                        <td>{rsvp.email || 'N/A'}</td>
                                        <td>{formatMealChoices(rsvp.mealChoices)}</td>
                                        <td className={styles.messageCell}>{rsvp.message || 'N/A'}</td>
                                        <td>{formatTimestamp(rsvp.submittedAt)}</td>
                                        <td>
                                            <button 
                                                onClick={() => onDelete(rsvp.rsvpId)} 
                                                className={styles.deleteButton}
                                                title="Delete this RSVP"
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center' }}>No RSVP submissions yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {isHistoryVisible && (
                <HistoryViewerModal history={history} onClose={() => setIsHistoryVisible(false)} />
            )}
        </>
    );
};

export default RsvpViewerModal; 