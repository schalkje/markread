/**
 * Zustand Store: Export State
 * Task: T010
 * Manages export operation state including active jobs, progress, and errors
 */

import { create } from 'zustand';
import type {
  ExportJob,
  ExportJobStatus,
  ExportProgress,
  ExportError,
  ExportSettings,
} from '../../shared/types/export';

interface ExportState {
  // Active export jobs
  activeJobs: ExportJob[];

  // Current export settings (cached from main process)
  settings: ExportSettings | null;

  // UI state
  showProgressDialog: boolean;
  showErrorDialog: boolean;
  currentError: ExportError | null;

  // Actions - Job management
  addJob: (job: ExportJob) => void;
  updateJobStatus: (jobId: string, status: ExportJobStatus) => void;
  updateJobProgress: (jobId: string, progress: ExportProgress) => void;
  setJobError: (jobId: string, error: ExportError) => void;
  removeJob: (jobId: string) => void;
  clearCompletedJobs: () => void;

  // Actions - UI state
  setShowProgressDialog: (show: boolean) => void;
  setShowErrorDialog: (show: boolean) => void;
  setCurrentError: (error: ExportError | null) => void;

  // Actions - Settings
  setSettings: (settings: ExportSettings) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<ExportSettings>) => Promise<void>;

  // Computed helpers
  getActiveJob: () => ExportJob | undefined;
  hasActiveExport: () => boolean;
}

export const useExportStore = create<ExportState>((set, get) => ({
  activeJobs: [],
  settings: null,
  showProgressDialog: false,
  showErrorDialog: false,
  currentError: null,

  addJob: (job: ExportJob) => {
    set((state) => ({
      activeJobs: [...state.activeJobs, job],
      showProgressDialog: true,
    }));
  },

  updateJobStatus: (jobId: string, status: ExportJobStatus) => {
    set((state) => ({
      activeJobs: state.activeJobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status,
              startedAt: status === 'in-progress' ? new Date() : job.startedAt,
              completedAt:
                status === 'completed' || status === 'failed' || status === 'cancelled'
                  ? new Date()
                  : job.completedAt,
            }
          : job
      ),
    }));
  },

  updateJobProgress: (jobId: string, progress: ExportProgress) => {
    set((state) => ({
      activeJobs: state.activeJobs.map((job) =>
        job.id === jobId ? { ...job, progress } : job
      ),
    }));
  },

  setJobError: (jobId: string, error: ExportError) => {
    set((state) => ({
      activeJobs: state.activeJobs.map((job) =>
        job.id === jobId ? { ...job, status: 'failed' as ExportJobStatus, error } : job
      ),
      currentError: error,
      showErrorDialog: true,
      showProgressDialog: false,
    }));
  },

  removeJob: (jobId: string) => {
    set((state) => ({
      activeJobs: state.activeJobs.filter((job) => job.id !== jobId),
    }));
  },

  clearCompletedJobs: () => {
    set((state) => ({
      activeJobs: state.activeJobs.filter(
        (job) => job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled'
      ),
    }));
  },

  setShowProgressDialog: (show: boolean) => {
    set({ showProgressDialog: show });
  },

  setShowErrorDialog: (show: boolean) => {
    set({ showErrorDialog: show });
    if (!show) {
      set({ currentError: null });
    }
  },

  setCurrentError: (error: ExportError | null) => {
    set({ currentError: error, showErrorDialog: error !== null });
  },

  setSettings: (settings: ExportSettings) => {
    set({ settings });
  },

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI?.export?.getSettings();
      if (settings) {
        set({ settings });
      }
    } catch (error) {
      console.error('Failed to load export settings:', error);
    }
  },

  updateSettings: async (partial: Partial<ExportSettings>) => {
    try {
      await window.electronAPI?.export?.updateSettings(partial);
      const current = get().settings;
      if (current) {
        set({ settings: { ...current, ...partial } });
      }
    } catch (error) {
      console.error('Failed to update export settings:', error);
    }
  },

  getActiveJob: () => {
    const { activeJobs } = get();
    return activeJobs.find(
      (job) => job.status === 'pending' || job.status === 'in-progress'
    );
  },

  hasActiveExport: () => {
    const { activeJobs } = get();
    return activeJobs.some(
      (job) => job.status === 'pending' || job.status === 'in-progress'
    );
  },
}));

export default useExportStore;
