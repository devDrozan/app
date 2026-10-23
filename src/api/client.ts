import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  fetch: async request => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try { return await fetch(request, { signal: controller.signal, cache: 'no-store', credentials: 'omit' }); }
    finally { clearTimeout(timer); }
  },
});
export type ContextInput = paths['/v1/calculations/context']['post']['requestBody']['content']['application/json'];
export type Context = paths['/v1/calculations/context']['post']['responses'][200]['content']['application/json'];
export type CalculationInput = paths['/v1/calculations']['post']['requestBody']['content']['application/json'];
export type Calculation = paths['/v1/calculations']['post']['responses'][200]['content']['application/json'];
export class ApiFailure extends Error {
  constructor(public issues: { field: string; code: string }[] = []) { super('API_REQUEST_FAILED'); }
}
export async function getContext(body: ContextInput) {
  const { data, error } = await api.POST('/v1/calculations/context', { body });
  if (error || !data) throw new ApiFailure(error?.issues);
  return data;
}
export async function calculate(body: CalculationInput) {
  const { data, error } = await api.POST('/v1/calculations', { body });
  if (error || !data) throw new ApiFailure(error?.issues);
  return data;
}
