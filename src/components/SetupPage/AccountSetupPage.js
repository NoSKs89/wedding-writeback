import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../config/apiConfig';
import styles from './AccountSetupPage.module.css'; // We'll create this CSS module later

const AccountSetupPage = () => {
  const { weddingId } = useParams();
  const apiBaseUrl = getApiBaseUrl();

  const [email, setEmail] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [instanceDisplayName, setInstanceDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // type can be 'success' or 'error'
  const [displayNameMessage, setDisplayNameMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isDisplayNameLoading, setIsDisplayNameLoading] = useState(false);
  const [isFetchingAccountData, setIsFetchingAccountData] = useState(true);

  // Email RSVP Alerts state
  const [emailRsvpAlertsEnabled, setEmailRsvpAlertsEnabled] = useState(false);
  const [rsvpAlertEmails, setRsvpAlertEmails] = useState([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailAlertsMessage, setEmailAlertsMessage] = useState({ text: '', type: '' });
  const [isEmailAlertsLoading, setIsEmailAlertsLoading] = useState(false);

  // Modal state for password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalMessage, setPasswordModalMessage] = useState({ text: '', type: '' });
  const [isPasswordModalLoading, setIsPasswordModalLoading] = useState(false);

  // Add state for RSVP Cutoff Date and Allow Continued Communications
  const [rsvpCutoffDate, setRsvpCutoffDate] = useState(''); // ISO string (yyyy-mm-dd)
  const [allowContinuedCommunications, setAllowContinuedCommunications] = useState(false);

  useEffect(() => {
    const fetchAccountData = async () => {
      setIsFetchingAccountData(true);
      try {
        const response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}`);
        if (response.data) {
          setEmail(response.data.email || 'Not set');
          setAccountStatus(response.data.accountStatus || 'free');
          setInstanceDisplayName(response.data.instanceDisplayName || '');
          // Populate RSVP cutoff and continued comms
          setRsvpCutoffDate(response.data.rsvpCutoffDate ? response.data.rsvpCutoffDate.substring(0, 10) : '');
          setAllowContinuedCommunications(!!response.data.allowContinuedCommunications);
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
        setMessage({ text: 'Error fetching account details.', type: 'error' });
        setEmail('Error loading');
        setAccountStatus('Error loading');
      }
      setIsFetchingAccountData(false);
    };

    const fetchEmailRsvpAlerts = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}/email-rsvp-alerts`);
        if (response.data && response.data.success) {
          setEmailRsvpAlertsEnabled(response.data.data.enabled);
          setRsvpAlertEmails(response.data.data.emails || []);
        }
      } catch (error) {
        console.error("Error fetching email RSVP alerts:", error);
        setEmailAlertsMessage({ text: 'Error fetching email RSVP alerts.', type: 'error' });
      }
    };

    if (weddingId) {
      fetchAccountData();
      fetchEmailRsvpAlerts();
    }
  }, [weddingId, apiBaseUrl]);

  // Unified save handler for display name, RSVP cutoff, continued comms, and email alerts
  const handleSaveAll = async (e) => {
    e.preventDefault();
    setEmailAlertsMessage({ text: '', type: '' });
    let success = false;
    try {
      const payload = {
        instanceDisplayName: instanceDisplayName.trim(),
        rsvpCutoffDate: rsvpCutoffDate ? rsvpCutoffDate : null,
        allowContinuedCommunications,
        emailRsvpAlerts: {
          enabled: emailRsvpAlertsEnabled,
          emails: rsvpAlertEmails
        }
      };
      const response = await axios.put(`${apiBaseUrl}/weddings/${weddingId}/account-settings`, payload);
      if (response.data && response.data.message) {
        setEmailAlertsMessage({ text: 'Settings saved successfully!', type: 'success' });
        success = true;
      } else {
        setEmailAlertsMessage({ text: 'Error saving settings.', type: 'error' });
      }
    } catch (error) {
      setEmailAlertsMessage({ text: error.response?.data?.message || 'Error saving settings.', type: 'error' });
    }
    return success;
  };

  // Password modal handler
  const handlePasswordChangeModal = async (e) => {
    e.preventDefault();
    setPasswordModalMessage({ text: '', type: '' });
    setIsPasswordModalLoading(true);
    if (newPassword !== confirmNewPassword) {
      setPasswordModalMessage({ text: 'New passwords do not match.', type: 'error' });
      setIsPasswordModalLoading(false);
      return;
    }
    if (newPassword.length < 1) {
      setPasswordModalMessage({ text: 'New password is too short.', type: 'error' });
      setIsPasswordModalLoading(false);
      return;
    }
    try {
      const response = await axios.put(`${apiBaseUrl}/weddings/${weddingId}/change-password`, {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      setPasswordModalMessage({ text: response.data.message, type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setPasswordModalMessage({ text: error.response?.data?.message || 'Error changing password.', type: 'error' });
    }
    setIsPasswordModalLoading(false);
  };

  // Email RSVP Alerts functions
  const addEmailToAlerts = (e) => {
    e.preventDefault();
    const email = newEmailInput.trim();
    
    if (!email) {
      setEmailAlertsMessage({ text: 'Please enter an email address.', type: 'error' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailAlertsMessage({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    
    const lowerCaseEmail = email.toLowerCase();
    if (rsvpAlertEmails.includes(lowerCaseEmail)) {
      setEmailAlertsMessage({ text: 'This email address is already in the list.', type: 'error' });
      return;
    }
    
    setRsvpAlertEmails([...rsvpAlertEmails, lowerCaseEmail]);
    setNewEmailInput('');
    setEmailAlertsMessage({ text: '', type: '' });
  };

  const removeEmailFromAlerts = (emailToRemove) => {
    setRsvpAlertEmails(rsvpAlertEmails.filter(email => email !== emailToRemove));
  };

  const handleEmailAlertsSubmit = async (e) => {
    e.preventDefault();
    setEmailAlertsMessage({ text: '', type: '' });
    setIsEmailAlertsLoading(true);

    try {
      const response = await axios.put(`${apiBaseUrl}/weddings/${weddingId}/email-rsvp-alerts`, {
        enabled: emailRsvpAlertsEnabled,
        emails: rsvpAlertEmails
      });
      
      if (response.data && response.data.success) {
        setEmailAlertsMessage({ text: 'Email RSVP alerts updated successfully!', type: 'success' });
      } else {
        setEmailAlertsMessage({ text: 'Error updating email RSVP alerts.', type: 'error' });
      }
    } catch (error) {
      console.error("Error updating email RSVP alerts:", error);
      setEmailAlertsMessage({ text: error.response?.data?.message || 'Error updating email RSVP alerts.', type: 'error' });
    }
    setIsEmailAlertsLoading(false);
  };

  return (
    <div className={styles.accountSetupContainer}>
      <h2>Account Settings for {weddingId}</h2>
      
      <div className={styles.accountInfoSection}>
        <h3>Account Information</h3>
        {isFetchingAccountData ? (
          <p>Loading account details...</p>
        ) : (
          <>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Account Status:</strong> <span className={`${styles.status} ${styles[accountStatus.toLowerCase()]}`}>{accountStatus}</span></p>
            {/* Add more account details here as needed */}
          </>
        )}
      </div>

      <div className={styles.displayNameSection}>
        <h3>Instance Display Name</h3>
        <p className={styles.helpText}>
          This name will appear in browser tabs and social media previews when guests visit your wedding page.
          <br />
          Example: "Brooke & Stephen's Wedding" or "Erickson Wedding 2025"
        </p>
        <div className={styles.formGroup}>
          <label htmlFor="instanceDisplayName">Display Name</label>
          <input 
            type="text" 
            id="instanceDisplayName" 
            value={instanceDisplayName} 
            onChange={(e) => setInstanceDisplayName(e.target.value)} 
            placeholder="Enter a display name for your wedding page"
            maxLength="100"
          />
        </div>
      </div>

      {/* RSVP Cutoff Date and Continued Communications Section */}
      <div className={styles.rsvpCutoffSection}>
        <h3>RSVP Cutoff Date</h3>
        <p className={styles.helpText}>
          After this date, guests will not be able to submit new RSVPs. You can still allow guests to send messages if you wish.
        </p>
        <div className={styles.formGroup}>
          <label htmlFor="rsvpCutoffDate">RSVP Cutoff Date</label>
          <input
            type="date"
            id="rsvpCutoffDate"
            value={rsvpCutoffDate}
            onChange={e => setRsvpCutoffDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="allowContinuedCommunications" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="allowContinuedCommunications"
              checked={allowContinuedCommunications}
              onChange={e => setAllowContinuedCommunications(e.target.checked)}
              className={styles.checkbox}
            />
            Allow Continued Communications (guests can still send messages after cutoff)
          </label>
        </div>
      </div>

      <div className={styles.emailAlertsSection}>
        <h3>Email RSVP Alerts</h3>
        <p className={styles.helpText}>
          Get notified via email when guests RSVP to your wedding. You can add multiple email addresses to receive alerts.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className={styles.emailAlertsForm}>
          <div className={styles.formGroup}>
            <label htmlFor="emailRsvpAlerts">
              <input 
                type="checkbox" 
                id="emailRsvpAlerts" 
                checked={emailRsvpAlertsEnabled}
                onChange={(e) => setEmailRsvpAlertsEnabled(e.target.checked)}
                className={styles.checkbox}
              />
              Enable Email RSVP Alerts
            </label>
          </div>
          
          {emailRsvpAlertsEnabled && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="newEmailInput">Add Email Address</label>
                <div className={styles.emailInputContainer}>
                  <input 
                    type="email" 
                    id="newEmailInput" 
                    value={newEmailInput} 
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="Enter email address"
                    className={styles.emailInput}
                  />
                  <button 
                    type="button" 
                    onClick={addEmailToAlerts}
                    className={styles.addEmailButton}
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {rsvpAlertEmails.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Alert Email Addresses:</label>
                  <div className={styles.emailList}>
                    {rsvpAlertEmails.map((email, index) => (
                      <div key={index} className={styles.emailItem}>
                        <span className={styles.emailText}>{email}</span>
                        <button 
                          type="button" 
                          onClick={() => removeEmailFromAlerts(email)}
                          className={styles.removeEmailButton}
                          aria-label={`Remove ${email}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
        </form>
        {emailAlertsMessage.text && (
          <p className={`${styles.message} ${emailAlertsMessage.type === 'success' ? styles.success : styles.error}`}>
            {emailAlertsMessage.text}
          </p>
        )}
      </div>
      {/* Save Button */}
      <button
        type="button"
        className={styles.submitButton}
        onClick={handleSaveAll}
        disabled={isEmailAlertsLoading}
        style={{ marginTop: 24 }}
      >
        Save
      </button>
      {/* Change Password Section as Button/Modal */}
      <div className={styles.changePasswordSection}>
        <button
          type="button"
          className={styles.submitButton}
          onClick={() => setShowPasswordModal(true)}
          style={{ marginTop: 32 }}
        >
          Change Setup Password
        </button>
      </div>
      {/* Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Change Setup Password</h3>
            <form onSubmit={handlePasswordChangeModal} className={styles.passwordForm}>
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">Current Password</label>
                <input 
                  type="password" 
                  id="currentPassword" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New Password</label>
                <input 
                  type="password" 
                  id="newPassword" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input 
                  type="password" 
                  id="confirmNewPassword" 
                  value={confirmNewPassword} 
                  onChange={(e) => setConfirmNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isPasswordModalLoading}
              >
                {isPasswordModalLoading ? 'Changing...' : 'Save'}
              </button>
              <button
                type="button"
                className={styles.submitButton}
                style={{ background: '#ccc', color: '#333', marginTop: 8 }}
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordModalMessage({ text: '', type: '' });
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                Cancel
              </button>
              {passwordModalMessage.text && (
                <p className={`${styles.message} ${passwordModalMessage.type === 'success' ? styles.success : styles.error}`}>
                  {passwordModalMessage.text}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSetupPage; 