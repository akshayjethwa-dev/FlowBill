import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { settingsService } from '../services/settingsService';
import { AppSettings, TeamMember } from '../types/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setBusinessId(user.uid);
      } else {
        setBusinessId(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedSettings, fetchedTeam] = await Promise.all([
        settingsService.getSettings(businessId),
        settingsService.getTeamMembers(businessId)
      ]);
      setSettings(fetchedSettings);
      setTeam(fetchedTeam);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchSettings();
    }
  }, [businessId, fetchSettings]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      await settingsService.saveSettings(businessId, newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : (newSettings as AppSettings));
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    team,
    loading,
    error,
    updateSettings,
    refresh: fetchSettings
  };
}
