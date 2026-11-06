import type { Locale } from '../i18n/locales.ts';

// Copy for the printable emergency guides (GS-023). The guides themselves come from the same cards as the web pages.
export type PrintText = { title: string; lead: string; button: string; footer: string };

export const PRINT: Record<Locale, PrintText> = {
  en: {
    title: 'Printable emergency guides',
    lead: 'This page holds the same guides as the emergency pages, arranged to print on paper. It does not replace official alerts or the orders of local authorities.',
    button: 'Print this page',
    footer: 'Check the official alerts for your area before you act. The date above is the date this copy was built.',
  },
  vi: {
    title: 'Hướng dẫn khẩn cấp bản in',
    lead: 'Trang này có cùng hướng dẫn với các trang khẩn cấp, sắp xếp để in ra giấy. Trang không thay thế cảnh báo chính thức hay lệnh của chính quyền địa phương.',
    button: 'In trang này',
    footer: 'Hãy xem cảnh báo chính thức cho khu vực của bạn trước khi hành động. Ngày trên trang là ngày bản này được tạo.',
  },
};
