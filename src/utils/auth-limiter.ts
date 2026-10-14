interface LimitState {
  attempts: number;
  lockoutUntil: number; // timestamp in ms
}

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const MAX_GLOBAL_ATTEMPTS = 10;
const GLOBAL_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

const KEY_PREFIX = "viacraft_auth_limit_";

export function getEmailLockout(email: string): { locked: boolean; remainingSeconds: number } {
  if (typeof window === "undefined" || !email) return { locked: false, remainingSeconds: 0 };
  try {
    const key = `${KEY_PREFIX}email_${encodeURIComponent(email.trim().toLowerCase())}`;
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return { locked: false, remainingSeconds: 0 };

    const state: LimitState = JSON.parse(dataStr);
    const now = Date.now();

    if (state.lockoutUntil && state.lockoutUntil > now) {
      return {
        locked: true,
        remainingSeconds: Math.ceil((state.lockoutUntil - now) / 1000),
      };
    }

    if (state.lockoutUntil && state.lockoutUntil <= now) {
      localStorage.removeItem(key);
    }

    return { locked: false, remainingSeconds: 0 };
  } catch (e) {
    console.error("Error in getEmailLockout", e);
    return { locked: false, remainingSeconds: 0 };
  }
}

export function getGlobalLockout(): { locked: boolean; remainingSeconds: number } {
  if (typeof window === "undefined") return { locked: false, remainingSeconds: 0 };
  try {
    const key = `${KEY_PREFIX}global`;
    const dataStr = localStorage.getItem(key);
    if (!dataStr) return { locked: false, remainingSeconds: 0 };

    const state: LimitState = JSON.parse(dataStr);
    const now = Date.now();

    if (state.lockoutUntil && state.lockoutUntil > now) {
      return {
        locked: true,
        remainingSeconds: Math.ceil((state.lockoutUntil - now) / 1000),
      };
    }

    if (state.lockoutUntil && state.lockoutUntil <= now) {
      localStorage.removeItem(key);
    }

    return { locked: false, remainingSeconds: 0 };
  } catch (e) {
    console.error("Error in getGlobalLockout", e);
    return { locked: false, remainingSeconds: 0 };
  }
}

export function recordFailedAttempt(email: string): {
  emailAttempts: number;
  emailLockoutUntil: number | null;
  globalLockoutUntil: number | null;
} {
  if (typeof window === "undefined") {
    return { emailAttempts: 0, emailLockoutUntil: null, globalLockoutUntil: null };
  }

  const now = Date.now();
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  // 1. Update Global Attempts
  let globalLockoutUntil: number | null = null;
  try {
    const globalKey = `${KEY_PREFIX}global`;
    const globalDataStr = localStorage.getItem(globalKey);
    let globalState: LimitState = globalDataStr
      ? JSON.parse(globalDataStr)
      : { attempts: 0, lockoutUntil: 0 };

    // Reset if expired
    if (globalState.lockoutUntil && globalState.lockoutUntil <= now) {
      globalState = { attempts: 0, lockoutUntil: 0 };
    }

    globalState.attempts += 1;
    if (globalState.attempts >= MAX_GLOBAL_ATTEMPTS) {
      globalState.lockoutUntil = now + GLOBAL_LOCKOUT_MS;
      globalLockoutUntil = globalState.lockoutUntil;
    }

    localStorage.setItem(globalKey, JSON.stringify(globalState));
  } catch (e) {
    console.error("Error updating global attempts", e);
  }

  // 2. Update Email-Specific Attempts
  let emailAttempts = 0;
  let emailLockoutUntil: number | null = null;
  if (normalizedEmail) {
    try {
      const emailKey = `${KEY_PREFIX}email_${encodeURIComponent(normalizedEmail)}`;
      const emailDataStr = localStorage.getItem(emailKey);
      let emailState: LimitState = emailDataStr
        ? JSON.parse(emailDataStr)
        : { attempts: 0, lockoutUntil: 0 };

      // Reset if expired
      if (emailState.lockoutUntil && emailState.lockoutUntil <= now) {
        emailState = { attempts: 0, lockoutUntil: 0 };
      }

      emailState.attempts += 1;
      emailAttempts = emailState.attempts;

      if (emailState.attempts >= MAX_EMAIL_ATTEMPTS) {
        emailState.lockoutUntil = now + EMAIL_LOCKOUT_MS;
        emailLockoutUntil = emailState.lockoutUntil;
      }

      localStorage.setItem(emailKey, JSON.stringify(emailState));
    } catch (e) {
      console.error("Error updating email attempts", e);
    }
  }

  return {
    emailAttempts,
    emailLockoutUntil,
    globalLockoutUntil,
  };
}

export function resetAttempts(email: string): void {
  if (typeof window === "undefined") return;
  try {
    if (email) {
      const emailKey = `${KEY_PREFIX}email_${encodeURIComponent(email.trim().toLowerCase())}`;
      localStorage.removeItem(emailKey);
    }
    const globalKey = `${KEY_PREFIX}global`;
    localStorage.removeItem(globalKey);
  } catch (e) {
    console.error("Error resetting attempts", e);
  }
}
