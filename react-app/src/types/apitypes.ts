// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  message: string;
}

// match backend UserAccount structure
export interface ProfileResponse {
  id: number;                   
  emailAddress: string;        
  hashedPassword?: string;       // shouldn't be sent to frontend
  enabled: boolean;
  admin: boolean;
  info: UserInfo;                // nested UserInfo object
  tags: string[];                // array of tag names (instruments + genres)
}

export interface UserInfo {
  displayName: string;
  bio: string;
  availability: string;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';  // uppercase to match enum
}

export interface AudioSampleResponse {
  audioId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadDate: string;
}

// Tag Types
export type Genre = string;
export type Instrument = string;