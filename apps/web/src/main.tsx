// Điểm vào của Web Desk (WO10-01). Địa chỉ API lấy từ cấu hình build (VITE_API_BASE); mã không chứa bí mật.
import { createRoot } from 'react-dom/client';
import type { Locale } from '@aftervia/i18n';
import { App } from './App';
import './styles.css';

const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

// Đăng nhập thật chưa có (WO10-02, DEC03). Chỉ khi chạy phát triển, token có thể đặt tay trong sessionStorage.
function devToken(): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    const value = window.sessionStorage.getItem('aftervia.dev.token');
    return value !== null && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function detectLocale(language: string): Locale {
  return /^vi(-|$)/i.test(language) ? 'vi' : 'en';
}

const container = document.getElementById('root');
if (container === null) throw new Error('root_missing');
createRoot(container).render(<App base={API_BASE} token={devToken()} initialLocale={detectLocale(navigator.language)} />);
