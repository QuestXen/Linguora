import { auth } from '@/app/lib/auth'

const handler = (request: Request) => auth.handler(request)

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
}
