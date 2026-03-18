const API_BASE_URL = 'http://localhost:80';

// Define response types based on backend responses
export interface ProfileCreateResponse {
  userId: number;
  message?: string;
}

export interface LoginResponse {
  id: number;              // Backend returns "id", not "userId"
  emailAddress: string;     // Backend returns "emailAddress", not "email"
  enabled: boolean;
  admin: boolean;
  info?: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  tags?: string[];
}

export interface RegisterResponse {
  id: number;              // Backend returns "id", not "userId"
  emailAddress: string;     // Backend returns "emailAddress", not "email"
  enabled: boolean;
  admin: boolean;
  info?: {
    displayName: string;
    bio: string;
    availability: string;
    experienceLevel: string;
  };
  tags?: string[];
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
// Generic fetch wrapper for JSON responses
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
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
    
    const data = await fetchFormData<LoginResponse>('/api/login', formData, 'POST');
    
    // Backend returns "id", not "userId"
    if (data.id) {
      localStorage.setItem('userId', data.id.toString());
    }
    
    return data;
  },
  
  register: async (email: string, password: string, confirmPassword: string): Promise<RegisterResponse> => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('password2', confirmPassword);
    
    const data = await fetchFormData<RegisterResponse>('/api/register', formData, 'POST');
    
    // Backend returns "id", not "userId"
    if (data.id) {
      localStorage.setItem('userId', data.id.toString());
    }
    
    return data;
  },
  
  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');
  }
};