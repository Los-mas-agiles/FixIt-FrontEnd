import type { ApiError, CodigoError } from '@/types/models'

/** Error de la API con el formato del contrato. `message` ya viene en español y se puede mostrar tal cual. */
export class ApiRequestError extends Error {
  status: number
  code: CodigoError
  details?: unknown

  constructor(status: number, code: CodigoError, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ConfigCliente {
  getToken: () => string | null
  /** Se llama cuando la API responde 401 a una petición que llevaba token (vencido o inválido). */
  onNoAutenticado: () => void
}

// El store de sesión se registra aquí al arrancar (evita que el cliente dependa de Pinia).
let config: ConfigCliente = { getToken: () => null, onNoAutenticado: () => {} }
export function configurarCliente(c: ConfigCliente) {
  config = c
}

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = config.getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiRequestError(0, 'INTERNO', 'No hay conexión con el servidor. Revisa tu internet.')
  }

  if (res.status === 401 && token) config.onNoAutenticado()
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? 'INTERNO',
      body?.error?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo en un momento.',
      body?.error?.details,
    )
  }
  return (await res.json()) as T
}

/** Mensaje listo para mostrar a partir de cualquier error. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message
  return 'Ocurrió un error inesperado. Intenta de nuevo en un momento.'
}

export const json = (data: unknown) => JSON.stringify(data)
