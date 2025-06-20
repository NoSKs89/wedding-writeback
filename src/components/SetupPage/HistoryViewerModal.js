import React from 'react';
import styles from './RsvpViewerModal.module.css'; // Reuse the same modal styles for consistency

const HistoryViewerModal = ({ history = [], onClose }) => {
    const formatTimestamp = (dateString) => {
        if (!dateString) return 'Invalid Date';
        try {
            return new Date(dateString).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={`${styles.modal} ${styles.historyModal}`}>
                <div className={styles.header}>
                    <h2>RSVP History</h2>
                    <button onClick={onClose} className={styles.closeButton}>&times;</button>
                </div>
                <div className={styles.content}>
                    <ul className={styles.historyList}>
                        {history && history.length > 0 ? (
                            history
                                .slice() // Create a copy to avoid mutating the original prop
                                .reverse() // Show the most recent events first
                                .map((entry, index) => (
                                    <li key={index} className={styles.historyItem}>
                                        <span className={styles.historyTimestamp}>{formatTimestamp(entry.timestamp)}</span>
                                        <span className={styles.historyEvent}>{entry.event}:</span>
                                        <span className={styles.historyDetails}>{entry.details}</span>
                                    </li>
                                ))
                        ) : (
                            <li className={styles.historyItem}>No history events yet.</li>
                        )}
                    </ul>
                </div>
            </div>
        </>
    );
};

export default HistoryViewerModal; 