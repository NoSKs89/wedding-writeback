import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface UserInfoContextType {
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
  updateUserInfo: (updates: Partial<UserInfo>) => void;
  hasUserInfo: () => boolean;
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
}

export const UserInfoProvider: React.FC<UserInfoProviderProps> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const updateUserInfo = useCallback((updates: Partial<UserInfo>) => {
    setUserInfo(prev => prev ? { ...prev, ...updates } : { firstName: '', lastName: '', email: '', ...updates });
  }, []);

  const hasUserInfo = useCallback(() => {
    return userInfo !== null && userInfo.firstName.trim() !== '' && userInfo.lastName.trim() !== '';
  }, [userInfo]);

  const contextValue = useMemo(() => ({
    userInfo,
    setUserInfo,
    updateUserInfo,
    hasUserInfo
  }), [userInfo, updateUserInfo, hasUserInfo]);

  return (
    <UserInfoContext.Provider value={contextValue}>
      {children}
    </UserInfoContext.Provider>
  );
}; 