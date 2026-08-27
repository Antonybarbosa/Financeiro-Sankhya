import { create } from 'zustand';

interface WhatsAppStoreState {
  isDrawerOpen: boolean;
  activePhoneOrName: string | null;
  activePartnerName: string | null;
  activePartnerId: number | null;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
  openWhatsAppWithContact: (phone: string, partnerId?: number, partnerName?: string) => void;
}

export const useWhatsAppStore = create<WhatsAppStoreState>((set) => ({
  isDrawerOpen: false,
  activePhoneOrName: null,
  activePartnerName: null,
  activePartnerId: null,

  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),

  openWhatsAppWithContact: (phone: string, partnerId?: number, partnerName?: string) => {
    set({
      isDrawerOpen: true,
      activePhoneOrName: phone,
      activePartnerId: partnerId || null,
      activePartnerName: partnerName || null,
    });
  },
}));
