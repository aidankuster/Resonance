const API_BASE_URL = '';

// Define response types based on backend responses
export interface ProfileResponse {
  id: number;
  emailAddress: string;
  enabled: boolean;
  admin: boolean;
  info: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  instruments: string[];  
  genres: string[];       
}

// Search Types
export interface SearchFilters {
  query?: string;
  type?: 'users' | 'projects' | 'all';
  instrument?: string;
  genre?: string;
  experienceLevel?: string;
}

export interface SearchResultUser {
  id: number;
  type: 'user';
  displayName: string;
  instruments: string[];
  genres: string[];
  experienceLevel: string;
  bio: string;
  profileViews?: number;
  matchPercentage?: number;
}

export interface SearchResultProject {
  id: number;
  type: 'project';
  title: string;
  description: string;
  status: string;
  founderName: string;
  memberCount: number;
  neededInstruments: string[];
  genres: string[];
  matchPercentage?: number;
  createdAt: string;
}

export interface UnifiedSearchResult {
  users: SearchResultUser[];
  projects: SearchResultProject[];
}

// Enhanced Search API
export const searchAPI = {
  // Search both users and projects
  searchAll: async (filters: SearchFilters): Promise<UnifiedSearchResult> => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.type) params.append('type', filters.type);
    if (filters.instrument) params.append('instrument', filters.instrument);
    if (filters.genre) params.append('genre', filters.genre);
    if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
    
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Search failed:', response.status, errorText);
      throw new Error(`Search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  },
  
  // Search only users
  searchUsers: async (filters: SearchFilters): Promise<SearchResultUser[]> => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.instrument) params.append('instrument', filters.instrument);
    if (filters.genre) params.append('genre', filters.genre);
    if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
    params.append('type', 'users');
    
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ User search failed:', response.status, errorText);
      throw new Error(`User search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data.users || [];
  },
  
  // Search only projects
  searchProjects: async (filters: SearchFilters): Promise<SearchResultProject[]> => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.instrument) params.append('instrument', filters.instrument);
    if (filters.genre) params.append('genre', filters.genre);
    params.append('type', 'projects');
    
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Project search failed:', response.status, errorText);
      throw new Error(`Project search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data.projects || [];
  }
};

// No longer needed as we ae using cookie-based auth -John
const getAuthHeaders = (): HeadersInit => {
  return {};
};

// Generic fetch wrapper for JSON responses
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include', // Include cookies for session-based auth
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API error (${response.status}) for ${endpoint}:`, errorText);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data;
}

// For requests that don't need JSON headers (like FormData)
async function fetchFormData<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<T> {

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    body: formData,
    credentials: 'include', // Include cookies for session-based auth
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API error (${response.status}) for ${endpoint}:`, errorText);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ ${endpoint} responded successfully`);
  return data;
}

// Genres API
export const genresAPI = {
  getAll: () => fetchAPI<string[]>('/api/genres'),
};

// Instruments API
export const instrumentsAPI = {
  getAll: () => fetchAPI<string[]>('/api/instruments'),
};

// Profile API
export const profileAPI = {
  // Fetch profile for logged-in user
  getCurrentUserProfile: async (userId: number): Promise<ProfileResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
      credentials: 'include', // Include cookies for session-based auth
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch profile for user ${userId}:`, response.status, errorText);
      throw new Error(`Failed to fetch profile (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data;
  },
  
  // Update profile after registration
  updateProfile: async (userId: number, formData: FormData): Promise<any> => {
    return fetchFormData(`/api/profile/${userId}`, formData, 'POST');
  },

  // Upload profile picture (uses session, no userId needed)
  uploadProfilePicture: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await fetch(`${API_BASE_URL}/api/profile/picture`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to upload profile picture:`, response.status, errorText);
      throw new Error(`Failed to upload profile picture (${response.status}): ${errorText}`);
    }

  },

  // Get profile picture URL (always .jpg)
  getProfilePictureUrl: (userId: number): string => {
    return `${API_BASE_URL}/api/profile/${userId}/picture`;
  }
};

// Authentication
export const authAPI = {
  login: async (email: string, password: string): Promise<ProfileResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const data = await fetchFormData<ProfileResponse>('/api/login', formData, 'POST');
      return data;
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  },

  register: async (email: string, password: string, confirmPassword: string): Promise<ProfileResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('password2', confirmPassword);

    try {
      const data = await fetchFormData<ProfileResponse>('/api/register', formData, 'POST');
      return data;
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message);
      throw error;
    }
  },

  // Check if user has an active session via cookie
  checkSession: async (): Promise<ProfileResponse | null> => {

    try {
      // Use the session endpoint to verify cookie-based session
      const data = await fetchAPI<ProfileResponse>('/api/session', {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Session invalid or expired');
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'GET',
        credentials: 'include', // Include cookies
      });
    } catch (error) {
      console.log('⚠️ Logout endpoint not available, clearing session locally');
    }
  }
};

// Audio File Types
export interface AudioFileResponse {
  uuid: string;
  uploaderId: number;
  fileName: string;
  uploadDate: string;
}

// Audio API
export const audioAPI = {
  // Upload an audio file
  uploadAudioFile: async (file: File): Promise<AudioFileResponse> => {
    const formData = new FormData();
    formData.append('audio_file', file);

    const response = await fetch(`${API_BASE_URL}/api/audio`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to upload audio file:`, response.status, errorText);
      throw new Error(`Failed to upload audio file (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  },

  // Get all audio files for current user
  getUserAudioFiles: async (): Promise<AudioFileResponse[]> => {
    return fetchAPI<AudioFileResponse[]>('/api/audio');
  },

  // Delete an audio file
  deleteAudioFile: async (uuid: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/audio/${uuid}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to delete audio file:`, response.status, errorText);
      throw new Error(`Failed to delete audio file (${response.status}): ${errorText}`);
    }
  },

  // Get audio file URL for playback
  getAudioFileUrl: (uuid: string): string => {
    return `${API_BASE_URL}/api/audio/${uuid}`;
  }
};