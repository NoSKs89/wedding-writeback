import React, { useState } from 'react';
import styles from './RsvpViewerModal.module.css';
import HistoryViewerModal from './HistoryViewerModal';
import { safeDecodeHtmlEntities } from '../../utils/htmlUtils';

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

const RsvpViewerModal = ({ rsvps = [], history = [], onClose, onDelete, allowKids = true }) => {
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

    // This function normalizes the guest count from different possible data schemas
    const getGuestCount = (rsvp) => {
        if (!rsvp.attending) {
            return 0;
        }
        // New schema uses guestCount for the total party size
        if (rsvp.guestCount !== undefined) {
            return rsvp.guestCount;
        }
        // Old schema used separate adult/child counts
        if (rsvp.respondedAdultCount !== undefined) {
            return (rsvp.respondedAdultCount || 0) + (rsvp.respondedChildrenCount || 0);
        }
        // Fallback for an attending guest with no count data provided
        return 1;
    };

    // Function to get guest count breakdown (adults/kids)
    const getGuestCountBreakdown = (rsvp) => {
        if (!rsvp.attending) {
            return { total: 0, display: '0' };
        }

        // Check if we have the new adult/kids breakdown and kids are allowed
        if (allowKids && rsvp.bringingKids && (rsvp.adultCount !== undefined || rsvp.kidsCount !== undefined)) {
            const adults = rsvp.adultCount || 0;
            const kids = rsvp.kidsCount || 0;
            const total = adults + kids;
            if (kids > 0) {
                return { total, display: `${adults} adults, ${kids} kids` };
            } else {
                return { total, display: `${adults} adults` };
            }
        }

        // Fall back to regular guest count
        const total = getGuestCount(rsvp);
        if (!allowKids && total > 0) {
            // When kids are not allowed, show as "X adults"
            return { total, display: `${total} adults` };
        }
        return { total, display: total.toString() };
    };

    // Calculate the total number of guests who are attending.
    const totalAttendingGuests = rsvps
        .filter(rsvp => rsvp.attending)
        .reduce((sum, rsvp) => sum + getGuestCountBreakdown(rsvp).total, 0);

    // Calculate breakdown of total adults and kids
    const totalAdults = rsvps
        .filter(rsvp => rsvp.attending)
        .reduce((sum, rsvp) => {
            if (rsvp.bringingKids && rsvp.adultCount !== undefined) {
                return sum + (rsvp.adultCount || 0);
            } else if (rsvp.attending && !rsvp.bringingKids) {
                return sum + getGuestCount(rsvp);
            }
            return sum;
        }, 0);

    const totalKids = rsvps
        .filter(rsvp => rsvp.attending && rsvp.bringingKids)
        .reduce((sum, rsvp) => sum + (rsvp.kidsCount || 0), 0);

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
                                <th>Guest Count<br/>(Total: {totalAttendingGuests})</th>
                                <th>Adults</th>
                                <th>Kids</th>
                                <th>Email</th>
                                <th>Meal Choices</th>
                                <th>Message</th>
                                <th>Submitted At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rsvps && rsvps.length > 0 ? (
                                rsvps.map((rsvp) => {
                                    const guestBreakdown = getGuestCountBreakdown(rsvp);
                                    const guestName = rsvp.firstName ? `${rsvp.firstName} ${rsvp.lastName}` : (rsvp.respondingGuestName || 'N/A');

                                    return (
                                        <tr key={rsvp.rsvpId || rsvp._id}>
                                            <td>{guestName}</td>
                                            <td>
                                                <div className={`${styles.attendingCellIcon} ${rsvp.attending ? styles.attendingYes : styles.attendingNo}`}>
                                                    {rsvp.attending ? <CheckIcon /> : <XIcon />}
                                                </div>
                                            </td>
                                            <td>{(rsvp.adultCount || 0) + (rsvp.kidsCount || 0)}</td>
                                            <td>{rsvp.adultCount || 0}</td>
                                            <td>{rsvp.kidsCount || 0}</td>
                                            <td>{rsvp.email || 'N/A'}</td>
                                            <td>{formatMealChoices(rsvp.mealChoices)}</td>
                                            <td className={styles.messageCell}>{rsvp.message ? safeDecodeHtmlEntities(rsvp.message) : 'N/A'}</td>
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
                                    );
                                })
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