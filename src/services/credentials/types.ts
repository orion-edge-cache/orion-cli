export interface SavedCredentials {
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
  fastly?: { apiToken: string };
  savedAt: string;
}

export interface CredentialSources {
  saved: {
    available: boolean;
    complete: boolean;
    hasAws: boolean;
    hasFastly: boolean;
    data: SavedCredentials | null;
  };
  env: {
    available: boolean;
    complete: boolean;
    hasAws: boolean;
    hasFastly: boolean;
  };
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface FastlyCredentials {
  apiToken: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FullValidationResult {
  aws: boolean;
  fastly: boolean;
  errors: string[];
}
