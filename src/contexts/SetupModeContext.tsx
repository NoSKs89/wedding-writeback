import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SetupModeContextType {
  isSetupMode: boolean;
  setIsSetupMode: (isSetup: boolean) => void;
}

const SetupModeContext = createContext<SetupModeContextType | undefined>(undefined);

export const useSetupMode = () => {
  const context = useContext(SetupModeContext);
  if (context === undefined) {
    throw new Error('useSetupMode must be used within a SetupModeProvider');
  }
  return context;
};

interface SetupModeProviderProps {
  children: ReactNode;
}

export const SetupModeProvider: React.FC<SetupModeProviderProps> = ({ children }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);

  return (
    <SetupModeContext.Provider value={{ isSetupMode, setIsSetupMode }}>
      {children}
    </SetupModeContext.Provider>
  );
}; 