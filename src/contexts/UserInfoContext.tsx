import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface FormSubmissionState {
  rsvpSubmitted: boolean;
  promptFormSubmitted: boolean;
}

interface UserInfoContextType {
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
  updateUserInfo: (updates: Partial<UserInfo>) => void;
  hasUserInfo: () => boolean;
  // Form submission tracking
  formSubmissions: FormSubmissionState;
  markFormSubmitted: (formType: 'rsvp' | 'promptForm') => void;
  resetFormSubmissions: () => void;
}

const UserInfoContext = createContext<UserInfoContextType | undefined>(undefined);

export const useUserInfo = () => {
  const context = useContext(UserInfoContext);
  if (context === undefined) {
    throw new Error('useUserInfo must be used within a UserInfoProvider');
  }
  return context;
};

interface UserInfoProviderProps {
  children: ReactNode;
  weddingId?: string; // Add weddingId to scope localStorage keys
}

export const UserInfoProvider: React.FC<UserInfoProviderProps> = ({ children, weddingId }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // Form submission state with localStorage persistence
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionState>({
    rsvpSubmitted: false,
    promptFormSubmitted: false
  });

  // Load form submissions from localStorage on mount
  useEffect(() => {
    if (weddingId) {
      try {
        const stored = localStorage.getItem(`formSubmissions_${weddingId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setFormSubmissions(parsed);
        }
      } catch (error) {
        console.warn('Failed to load form submissions from localStorage:', error);
      }
    }
  }, [weddingId]);

  // Save form submissions to localStorage whenever they change
  useEffect(() => {
    if (weddingId) {
      try {
        localStorage.setItem(`formSubmissions_${weddingId}`, JSON.stringify(formSubmissions));
      } catch (error) {
        console.warn('Failed to save form submissions to localStorage:', error);
      }
    }
  }, [formSubmissions, weddingId]);

  const updateUserInfo = useCallback((updates: Partial<UserInfo>) => {
    setUserInfo(prev => prev ? { ...prev, ...updates } : { firstName: '', lastName: '', email: '', ...updates });
  }, []);

  const hasUserInfo = useCallback(() => {
    return userInfo !== null && userInfo.firstName.trim() !== '' && userInfo.lastName.trim() !== '';
  }, [userInfo]);

  const markFormSubmitted = useCallback((formType: 'rsvp' | 'promptForm') => {
    setFormSubmissions(prev => ({
      ...prev,
      [formType === 'rsvp' ? 'rsvpSubmitted' : 'promptFormSubmitted']: true
    }));
  }, []);

  const resetFormSubmissions = useCallback(() => {
    setFormSubmissions({
      rsvpSubmitted: false,
      promptFormSubmitted: false
    });
    // Also clear from localStorage
    if (weddingId) {
      try {
        localStorage.removeItem(`formSubmissions_${weddingId}`);
      } catch (error) {
        console.warn('Failed to clear form submissions from localStorage:', error);
      }
    }
  }, [weddingId]);

  const contextValue = useMemo(() => ({
    userInfo,
    setUserInfo,
    updateUserInfo,
    hasUserInfo,
    formSubmissions,
    markFormSubmitted,
    resetFormSubmissions
  }), [userInfo, updateUserInfo, hasUserInfo, formSubmissions, markFormSubmitted, resetFormSubmissions]);

  return (
    <UserInfoContext.Provider value={contextValue}>
      {children}
    </UserInfoContext.Provider>
  );
}; 