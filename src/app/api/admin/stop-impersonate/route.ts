import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const impersonator = cookieStore.get("towhub_impersonator")?.value;

  if (!impersonator) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  // Clear impersonation cookie — user stays logged in as the impersonated account
  // To fully revert, the super admin needs to log out and back in
  const res = NextResponse.json({ success: true, message: "Impersonation stopped. Log in again as super admin." });
  res.cookies.delete("towhub_impersonator");

  return res;
}
