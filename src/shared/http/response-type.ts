export interface HttpResponse<T = any, E = null> {
  success: boolean
  data?: T | [] | null
  error?: E | null
}
