import { NextResponse } from "next/server"

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export class ResponseUtil {
  static success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({ success: true, data }, { status })
  }

  static error(message: string, status = 400, code?: string): NextResponse<ApiErrorResponse> {
    return NextResponse.json({ success: false, error: message, ...(code ? { code } : {}) }, { status })
  }

  static unauthorized(message = "Unauthorized"): NextResponse<ApiErrorResponse> {
    return ResponseUtil.error(message, 401, "UNAUTHORIZED")
  }

  static notFound(message = "Resource not found"): NextResponse<ApiErrorResponse> {
    return ResponseUtil.error(message, 404, "NOT_FOUND")
  }

  static badRequest(message: string): NextResponse<ApiErrorResponse> {
    return ResponseUtil.error(message, 400, "BAD_REQUEST")
  }
}
