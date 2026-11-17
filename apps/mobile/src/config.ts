// Địa chỉ API của bản dựng, lấy từ biến EXPO_PUBLIC_API_BASE. Không có bí mật trong mã.
export const API_BASE: string = process.env.EXPO_PUBLIC_API_BASE ?? '';

// Đăng nhập thật chưa có trên bản di động (WO10-02). Một chỗ duy nhất giữ token để các màn khác
// (ví dụ màn Quyền riêng tư) biết chắc là chưa đăng nhập, thay vì mỗi nơi tự đoán.
export const SESSION_TOKEN: string | null = null;
