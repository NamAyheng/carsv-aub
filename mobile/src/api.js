import { Platform } from 'react-native'
import Constants from 'expo-constants'

function resolveApiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri || ''
  const host = hostUri.replace(/^\w+:\/\//, '').split(':')[0].split('/')[0]

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000`
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000'
  }

  return 'http://127.0.0.1:8000'
}

export const API_BASE = resolveApiBase()

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export function getHealth() {
  return request('/api/health/')
}

export function getCatalog() {
  return request('/api/catalog/')
}

export function createBooking(payload) {
  return request('/api/bookings/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sendContact(payload) {
  return request('/api/contact/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
