export interface PasswordChecks {
  minLength: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordChecks {
  const minLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);

  return {
    minLength,
    hasLetter,
    hasDigit,
    hasSpecial,
    isValid: minLength && hasLetter && hasDigit && hasSpecial,
  };
}
