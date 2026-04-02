const API_BASE_URL = 'http://localhost:80';

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
    
    console.log('🔍 Searching all with params:', params.toString());
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Search failed:', response.status, errorText);
      throw new Error(`Search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Search results: ${data.users?.length || 0} users, ${data.projects?.length || 0} projects`);
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
    
    console.log('🔍 Searching users with params:', params.toString());
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ User search failed:', response.status, errorText);
      throw new Error(`User search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ User search results: ${data.users?.length || 0} users`);
    return data.users || [];
  },
  
  // Search only projects
  searchProjects: async (filters: SearchFilters): Promise<SearchResultProject[]> => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.instrument) params.append('instrument', filters.instrument);
    if (filters.genre) params.append('genre', filters.genre);
    params.append('type', 'projects');
    
    console.log('🔍 Searching projects with params:', params.toString());
    const response = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Project search failed:', response.status, errorText);
      throw new Error(`Project search failed (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Project search results: ${data.projects?.length || 0} projects`);
    return data.projects || [];
  }
};

// No longer needed as we ae using cookie-based auth -John
const getAuthHeaders = (): HeadersInit => {
  return {};
};

// Generic fetch wrapper for JSON responses
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  console.log(`📡 Fetching ${endpoint}...`);
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
  console.log(`✅ ${endpoint} responded successfully`);
  return data;
}

// For requests that don't need JSON headers (like FormData)
async function fetchFormData<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<T> {
  console.log(`📡 Sending FormData to ${endpoint}...`);
  // Log form data contents for debugging
  for (let pair of formData.entries()) {
    console.log(`   FormData: ${pair[0]} = ${pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]}`);
  }

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
    console.log(`📡 Fetching profile for user ID: ${userId}`);
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
    console.log(`✅ Profile loaded for user: ${data.info?.displayName}`);
    return data;
  },
  
  // Update profile after registration
  updateProfile: async (userId: number, formData: FormData): Promise<any> => {
    console.log(`📡 Updating profile for user ID: ${userId}`);
    return fetchFormData(`/api/profile/${userId}`, formData, 'POST');
  }
};

// Authentication
export const authAPI = {
  login: async (email: string, password: string): Promise<ProfileResponse> => {
    console.log(`🔐 Attempting login for email: ${email}`);
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const data = await fetchFormData<ProfileResponse>('/api/login', formData, 'POST');
      console.log(`✅ Login successful for user ID: ${data.id}`);
      return data;
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  },

  register: async (email: string, password: string, confirmPassword: string): Promise<ProfileResponse> => {
    console.log(`📝 Registering new user with email: ${email}`);
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('password2', confirmPassword);

    try {
      const data = await fetchFormData<ProfileResponse>('/api/register', formData, 'POST');
      console.log(`✅ Registration successful for user ID: ${data.id}`);
      return data;
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message);
      throw error;
    }
  },

  // Check if user has an active session via cookie
  checkSession: async (): Promise<ProfileResponse | null> => {
    console.log('🔍 Checking session...');

    try {
      // Use the session endpoint to verify cookie-based session
      const data = await fetchAPI<ProfileResponse>('/api/session', {
        method: 'GET',
      });
      console.log('✅ Session valid for user:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Session invalid or expired');
      return null;
    }
  },

  logout: async (): Promise<void> => {
    console.log('🚪 Logging out...');
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'GET',
        credentials: 'include', // Include cookies
      });
      console.log('✅ Logout endpoint called');
    } catch (error) {
      console.log('⚠️ Logout endpoint not available, clearing session locally');
    }
  }
};