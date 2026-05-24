import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/events/:path*",
    "/learning/:path*",
    "/inbox/:path*",
    "/checklist/:path*",
    "/onboarding/:path*",
  ],
};
