const API_BASE_URL = 'http://localhost:80';

// Define response types based on backend responses
export interface ProfileCreateResponse {
  userId: number;
  message?: string;
}

export interface LoginResponse {
  id: number;
  emailAddress: string;
  enabled: boolean;
  admin: boolean;
  info?: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  instruments?: string[];
  genres?: string[];
}

export interface RegisterResponse {
  id: number;
  emailAddress: string;
  enabled: boolean;
  admin: boolean;
  info?: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  instruments?: string[];
  genres?: string[];
  message?: string;
}

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

export interface SearchFilters {
  query?: string;
  instrument?: string;
  genre?: string;
  experienceLevel?: string;
}

export interface SearchResultUser {
  id: number;
  displayName: string;
  instruments: string[];
  genres: string[];
  experienceLevel: string;
  bio: string;
  profileViews?: number;
  matchPercentage?: number;
}

export const searchAPI = {
  searchUsers: async (filters: SearchFilters): Promise<SearchResultUser[]> => {
    // Build query string from filters
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.instrument) params.append('instrument', filters.instrument);
    if (filters.genre) params.append('genre', filters.genre);
    if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
    
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${errorText}`);
    }
    
    return response.json();
  }
};

// Generic fetch wrapper for JSON responses
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies in requests
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// For requests that don't need JSON headers (like FormData)
async function fetchFormData<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    body: formData,
    credentials: 'include', // Include cookies in requests
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch profile: ${errorText}`);
    }
    return response.json();
  },
  
  // Update profile after registration
  updateProfile: async (userId: number, formData: FormData): Promise<any> => {
    return fetchFormData(`/api/profile/${userId}`, formData, 'POST');
  }
};

// Authentication
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    return await fetchFormData<LoginResponse>('/api/login', formData, 'POST');
  },

  register: async (email: string, password: string, confirmPassword: string): Promise<RegisterResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('password2', confirmPassword);

    return await fetchFormData<RegisterResponse>('/api/register', formData, 'POST');
  },

  // Check if user has an active session via JWT cookie
  checkSession: async (): Promise<LoginResponse | null> => {
    try {
      return await fetchAPI<LoginResponse>('/api/session', {
        method: 'GET',
      });
    } catch (error) {
      // Session is invalid or expired
      return null;
    }
  },

  logout: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }
    // Don't try to parse JSON - logout endpoint returns empty response
  }
};