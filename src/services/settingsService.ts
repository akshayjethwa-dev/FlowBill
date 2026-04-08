import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings, TeamMember } from '../types/settings';

const SETTINGS_COLLECTION = 'settings';
const TEAM_COLLECTION = 'team';

export const settingsService = {
  async getSettings(businessId: string): Promise<AppSettings | null> {
    const settingsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, businessId));
    if (settingsDoc.exists()) {
      return settingsDoc.data() as AppSettings;
    }
    return null;
  },

  async saveSettings(businessId: string, settings: Partial<AppSettings>): Promise<void> {
    const settingsRef = doc(db, SETTINGS_COLLECTION, businessId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      await updateDoc(settingsRef, settings);
    } else {
      await setDoc(settingsRef, settings);
    }
  },

  async getTeamMembers(businessId: string): Promise<TeamMember[]> {
    const teamQuery = query(collection(db, TEAM_COLLECTION), where('businessId', '==', businessId));
    const teamSnapshot = await getDocs(teamQuery);
    return teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
  },

  async addTeamMember(businessId: string, member: Omit<TeamMember, 'id'>): Promise<string> {
    const teamRef = doc(collection(db, TEAM_COLLECTION));
    await setDoc(teamRef, { ...member, businessId });
    return teamRef.id;
  },

  async removeTeamMember(memberId: string): Promise<void> {
    // In a real app, we'd delete the doc or mark as inactive
    // For this module, we'll just implement the interface
    console.log('Removing team member:', memberId);
  }
};
