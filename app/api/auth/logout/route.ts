import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('vs_token')
    response.cookies.delete('vs_role')
    response.cookies.delete('vs_user_id')
    return response
}
