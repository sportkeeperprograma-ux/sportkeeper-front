import { NextRequest } from 'next/server'

import { BACKEND_API_URL } from '../../../lib/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function proxy(request: NextRequest, { params }: RouteContext) {
  const { path } = await params
  const target = new URL(`${BACKEND_API_URL}/api/${path.join('/')}`)

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('origin')
  headers.delete('referer')
  headers.delete('content-length')
  headers.delete('expect')
  headers.delete('access-control-request-headers')
  headers.delete('access-control-request-method')
  headers.delete('sec-fetch-dest')
  headers.delete('sec-fetch-mode')
  headers.delete('sec-fetch-site')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  const response = await fetch(target, init)
  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
export const HEAD = proxy