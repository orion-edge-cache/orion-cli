import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";

export const loadEnvFromFile = () => {
  const envPaths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", ".env"),
    resolve(dirname(process.cwd()), ".env"),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8");
      const lines = envContent.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex);
            const value = trimmed.substring(eqIndex + 1).replace(/^['"]|['"]$/g, "");
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      break;
    }
  }
};

export const normalizeFastlyKeys = () => {
  const hasFastlyToken = Boolean(process.env.FASTLY_API_TOKEN);
  const hasFastlyKey = Boolean(process.env.FASTLY_API_KEY);

  if (hasFastlyToken && !hasFastlyKey) {
    process.env.FASTLY_API_KEY = process.env.FASTLY_API_TOKEN;
  } else if (hasFastlyKey && !hasFastlyToken) {
    process.env.FASTLY_API_TOKEN = process.env.FASTLY_API_KEY;
  }
};

export const getCredentialStatus = () => {
  const hasAws = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
  );
  const hasFastly = Boolean(process.env.FASTLY_API_KEY);

  return { hasAws, hasFastly };
};