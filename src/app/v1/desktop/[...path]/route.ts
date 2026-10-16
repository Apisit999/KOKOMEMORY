import { studioRequest } from "@/lib/studio/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  return studioRequest(request, `desktop/${path.join("/")}`);
}
export { handle as GET, handle as POST };
