// User Account Types - Updated to match backend
export interface User {
  id: number;
  emailAddress: string;          // matches backend field name
  displayName: string;
  isVerified: boolean;           // maps to backend 'enabled' field
  isAdmin: boolean;
  accountCreated: string;
  lastLogin?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AccountFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// Profile Types
export interface ProfileFormData {
  displayName: string;
  bio: string;
  instruments: string[];
  genres: string[];
  experienceLevel: string;        // will be converted to uppercase enum on backend
  availability: string;
  profilePicture: File | null;
  audioSamples: File[];
}

// Experience Level enum - matches backend UserInfo.ExperienceLevel
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

// Helper function to convert frontend string to backend enum
export const toBackendExperienceLevel = (level: string): ExperienceLevel => {
  switch (level.toLowerCase()) {
    case 'beginner':
      return 'BEGINNER';
    case 'intermediate':
      return 'INTERMEDIATE';
    case 'advanced':
      return 'ADVANCED';
    case 'professional':
      return 'PROFESSIONAL';
    default:
      return 'BEGINNER';
  }
};

export interface AudioSample {
  id?: number;
  fileName: string;
  fileUrl?: string;
  file?: File;
  fileSize?: number;
  uploadDate?: string;
  tags?: string[];
}

// Project Types
export interface Project {
  id: number;
  title: string;
  description: string;
  founderId: number;
  founderName: string;
  genres: string[];
  status: ProjectStatus;
  createdAt: string;
  openRoles: ProjectRole[];
  teamMembers: ProjectMember[];
}

export type ProjectStatus = 'recruiting' | 'active' | 'completed' | 'archived';

export interface ProjectRole {
  id: number;
  projectId: number;
  roleName: string;
  instrument: string;
  description: string;
  isFilled: boolean;
  filledByUserId?: number;
  filledByUserName?: string;
}

export interface ProjectMember {
  userId: number;
  userName: string;
  role: string;
  joinedAt: string;
}

// Interaction Types
export interface Bookmark {
  userId: number;
  profileId: number;
  savedAt: string;
  notes?: string;
}

export interface ProfileView {
  viewerId?: number;
  profileId: number;
  viewedAt: string;
}

// Search Types
export interface SearchFilters {
  instrument?: string;
  genre?: string;
  experienceLevel?: string;
  query?: string;
}

export interface SearchResult {
  profileId: number;
  displayName: string;
  instruments: string[];
  genres: string[];
  experienceLevel: string;
  matchPercentage?: number;
  profilePictureUrl?: string;
  bio?: string;
  status?: string;
  profileViews?: number;
}