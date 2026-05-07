import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uploadFile } from "@/lib/storage";

/**
 * POST /api/upload — upload a file.
 *
 * Accepts multipart/form-data with a "file" field.
 * Returns { url, key, size, name }.
 *
 * Auth required. Max file size: 10MB (enforced by Next.js config).
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return new NextResponse("no file provided", { status: 400 });
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return new NextResponse("file too large (max 10MB)", { status: 413 });
  }

  try {
    const folder = formData.get("folder") as string | undefined;
    const result = await uploadFile(file, file.name, {
      folder: folder || session.user.id,
      contentType: file.type,
    });
    return NextResponse.json(result);
  } catch (err) {
    return new NextResponse(
      `upload failed: ${err instanceof Error ? err.message : err}`,
      { status: 500 },
    );
  }
}
