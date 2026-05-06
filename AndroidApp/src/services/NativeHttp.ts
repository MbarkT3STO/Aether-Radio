/**
 * NativeHttp — thin TypeScript wrapper around the NativeHttpPlugin.
 * Makes HTTP POST requests via native Android code, bypassing WebView CORS.
 */
import { registerPlugin } from '@capacitor/core'

interface NativeHttpPlugin {
  post(options: {
    url: string
    body: string
    headers: Record<string, string>
  }): Promise<{ status: number; data: string }>
}

const NativeHttp = registerPlugin<NativeHttpPlugin>('NativeHttp')

export async function nativePost(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<{ status: number; data: string }> {
  return NativeHttp.post({ url, body, headers })
}
