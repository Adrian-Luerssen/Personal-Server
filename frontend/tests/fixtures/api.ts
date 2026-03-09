import { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api'

export async function apiLogin(request: APIRequestContext, email = 'root@gmail.com', password = 'testpassword'): Promise<string> {
  const response = await request.post(`${BASE_URL}/auth/login`, {
    data: { email, password },
  })
  const data = await response.json()
  return data.accessToken
}

export async function apiRequest(request: APIRequestContext, token: string, path: string, options: any = {}) {
  return request.fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
