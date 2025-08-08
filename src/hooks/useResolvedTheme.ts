import { useEffect, useState } from 'react';
import { useTheme } from '../components/theme-provider';

type ResolvedTheme = 'dark' | 'light';

export function useResolvedTheme(): ResolvedTheme {
  const { theme } = useTheme();
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const getResolvedTheme = (): ResolvedTheme => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme as ResolvedTheme;
    };

    const updateTheme = () => {
      setResolvedTheme(getResolvedTheme());
    };

    // 初始设置
    updateTheme();

    // 监听系统主题变化（只在system模式下有效）
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      
      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
      };
    }
  }, [theme]);

  return resolvedTheme;
}