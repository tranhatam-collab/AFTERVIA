import * as Network from 'expo-network';

// Có mạng thật hay không. Không đoán: nếu không đọc được trạng thái thì coi là không có mạng, và không gửi.
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}
