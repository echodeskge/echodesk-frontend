import axios from './axios';

export interface SavedCardInfo {
  has_saved_card: boolean;
  last_payment_date?: string;
  card_saved_date?: string;
  auto_renew_enabled: boolean;
  order_id?: string;
}

export interface ManualPaymentResponse {
  payment_url: string;
  order_id: string;
  amount: number;
  currency: string;
}

export async function getSavedCardInfo(): Promise<SavedCardInfo> {
  const response = await axios.get('/api/payments/saved-card/');
  return response.data;
}

export async function deleteSavedCard(): Promise<{ status: string; message: string }> {
  const response = await axios.delete('/api/payments/saved-card/delete/');
  return response.data;
}

export async function createManualPayment(): Promise<ManualPaymentResponse> {
  const response = await axios.post('/api/payments/manual/');
  return response.data;
}
