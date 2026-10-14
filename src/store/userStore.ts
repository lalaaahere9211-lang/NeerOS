import { create } from 'zustand';
import { User, UserRole } from '../types/domain';
import { hasCapability, DomainCapability } from '../domain/roles';

interface UserState {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  can: (capability: DomainCapability) => boolean;
}

// Default initial user is Ganesh Patil (Owner)
const DEFAULT_USER: User = {
  id: 'usr_owner',
  name: 'Ganesh Patil (Owner)',
  role: 'OWNER',
  pin: '1234',
  phone: '+91 98765 43210',
  is_active: 1,
  created_at: new Date().toISOString(),
};

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: DEFAULT_USER,
  setCurrentUser: (user) => set({ currentUser: user }),
  can: (capability) => {
    const user = get().currentUser;
    return hasCapability(user.role, capability);
  },
}));
