import { createDemoService, STORAGE_KEY } from './demoStorage';
export { ApiError } from './apiError';
/** Route the existing components to browser storage. No fetch, backend or real authentication. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const run = () => createDemoService({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)})(path,options) as T;
  // Serialize browser tabs as well as the component's own mutation queue when Web Locks are available.
  return navigator.locks ? navigator.locks.request(STORAGE_KEY,run) : run();
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
export function jsonPost(body: unknown, _csrfToken: string) { return {method:'POST' as const,body:JSON.stringify(body)}; }
