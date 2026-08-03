import { dealsApi } from './client';
import type { Order } from './client';

// Polling interval in ms (every 30 seconds)
const POLL_INTERVAL_MS = 30_000;

type OrderStatusListener = (orders: Order[]) => void;

let listeners: OrderStatusListener[] = [];
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let cachedOrders: Order[] = [];

// Start polling — call once user is logged in
export function startOrderPolling() {
  if (pollingTimer) return; // already polling

  // Fetch immediately
  pollOrders();

  // Then poll every POLL_INTERVAL_MS
  pollingTimer = setInterval(pollOrders, POLL_INTERVAL_MS);
}

// Stop polling — call on logout
export function stopOrderPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  cachedOrders = [];
}

// Subscribe to order updates
export function subscribeToOrders(listener: OrderStatusListener): () => void {
  listeners.push(listener);
  // Immediately send current state
  if (cachedOrders.length > 0) {
    listener([...cachedOrders]);
  }
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

async function pollOrders() {
  try {
    const result = await dealsApi.getOrders(1, 100); // first page, large pageSize for polling
    cachedOrders = result.items;
    // Notify all listeners
    for (const listener of listeners) {
      try { listener([...result.items]); } catch { /* ignore listener errors */ }
    }
  } catch {
    // Silent fail — keep using cached orders
  }
}

// Get current cached orders without polling
export function getCachedOrders(): Order[] {
  return [...cachedOrders];
}

// Force a refresh right now
export async function refreshOrdersNow(): Promise<Order[]> {
  await pollOrders();
  return [...cachedOrders];
}
