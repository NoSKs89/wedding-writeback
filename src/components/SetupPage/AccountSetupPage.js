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

  useEffect(() => {
    const fetchAccountData = async () => {
      setIsFetchingAccountData(true);
      try {
        const response = await axios.get(`${apiBaseUrl}/weddings/${weddingId}`);
        if (response.data) {
          setEmail(response.data.email || 'Not set');
          setAccountStatus(response.data.accountStatus || 'free');
          setInstanceDisplayName(response.data.instanceDisplayName || '');
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
        setMessage({ text: 'Error fetching account details.', type: 'error' });
        setEmail('Error loading');
        setAccountStatus('Error loading');
      }
      setIsFetchingAccountData(false);
    };

    if (weddingId) {
      fetchAccountData();
    }
  }, [weddingId, apiBaseUrl]);

  const handleDisplayNameUpdate = async (e) => {
    e.preventDefault();
    setDisplayNameMessage({ text: '', type: '' });
    setIsDisplayNameLoading(true);

    try {
      const response = await axios.put(`${apiBaseUrl}/weddings/${weddingId}/instance-display-name`, {
        instanceDisplayName: instanceDisplayName.trim()
      });
      setDisplayNameMessage({ text: response.data.message || 'Instance display name updated successfully!', type: 'success' });
    } catch (error) {
      setDisplayNameMessage({ text: error.response?.data?.message || 'Error updating instance display name.', type: 'error' });
    }
    setIsDisplayNameLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 1) { // Matching backend basic validation
        setMessage({ text: 'New password is too short.', type: 'error' });
        setIsLoading(false);
        return;
    }

    try {
      const response = await axios.put(`${apiBaseUrl}/weddings/${weddingId}/change-password`, {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      setMessage({ text: response.data.message, type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Error changing password.', type: 'error' });
    }
    setIsLoading(false);
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
        <form onSubmit={handleDisplayNameUpdate} className={styles.displayNameForm}>
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
          <button type="submit" className={styles.submitButton} disabled={isDisplayNameLoading}>
            {isDisplayNameLoading ? 'Updating...' : 'Update Display Name'}
          </button>
        </form>
        {displayNameMessage.text && (
          <p className={`${styles.message} ${displayNameMessage.type === 'success' ? styles.success : styles.error}`}>
            {displayNameMessage.text}
          </p>
        )}
      </div>

      <div className={styles.changePasswordSection}>
        <h3>Change Setup Password</h3>
        <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
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
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
        {message.text && (
          <p className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
};

export default AccountSetupPage; 