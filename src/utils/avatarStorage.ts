const AVATAR_STORAGE_PREFIX = 'jobconnect_avatar_';

export function isSafeAvatarSrc(src?: string | null): src is string {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return true;
  }
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
}

export const avatarStorage = {
  get(email?: string | null): string {
    if (typeof window === 'undefined' || !email) return '';
    try {
      const val = window.localStorage.getItem(`${AVATAR_STORAGE_PREFIX}${email.trim().toLowerCase()}`);
      return isSafeAvatarSrc(val) ? val : '';
    } catch {
      return '';
    }
  },

  set(email: string | undefined | null, avatar: string | undefined | null): void {
    if (typeof window === 'undefined' || !email) return;
    const key = `${AVATAR_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
    try {
      if (isSafeAvatarSrc(avatar)) {
        window.localStorage.setItem(key, avatar);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage quota errors
    }
  },
};
