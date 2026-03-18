export interface ProfileData {
  displayName: string;
  bio: string;
  instruments: string[];
  genres: string[];
  experienceLevel: string;
  availability: string;
  profilePicture: File | null;
  audioSamples: File[];
}

export interface AccountData {
  email: string;
  password: string;
  confirmPassword: string;
}