import React, { createContext, useContext } from 'react';
import { useMenu } from '../hooks/useMenu';

// Create menu context
const MenuContext = createContext(null);

// MenuProvider component
export const MenuProvider = ({ children }) => {
  const menu = useMenu();
  
  return (
    <MenuContext.Provider value={menu}>
      {children}
    </MenuContext.Provider>
  );
};

// Custom hook to use menu context
export const useMenuContext = () => {
  const context = useContext(MenuContext);
  
  if (!context) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  
  return context;
};

export default MenuProvider;