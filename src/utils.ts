import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function usePersistState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const persistValue = window.localStorage.getItem(key);
    return persistValue !== null
      ? JSON.parse(persistValue)
      : defaultValue;
  });
  useEffect(() => {
    if (value != null) {
      window.localStorage.setItem(key, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(key);
    }
  }, [key, value]);
  return [value, setValue] as [T, Dispatch<SetStateAction<T>>];
}
