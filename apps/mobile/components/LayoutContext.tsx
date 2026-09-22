import { createContext, useContext } from 'react';

type LayoutContextValue = {
    sidebarWidth: number;
};

const LayoutContext = createContext<LayoutContextValue>({ sidebarWidth: 0 });

export const useSidebarWidth = () => useContext(LayoutContext).sidebarWidth;

export const LayoutProvider = LayoutContext.Provider;
