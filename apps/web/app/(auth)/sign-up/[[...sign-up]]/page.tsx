import { SignUp } from "@clerk/nextjs";

/**
 * Clerk sign-up page.
 * Clerk's <SignUp /> handles the full form; appearance is configured via Clerk dashboard.
 */
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted gap-6 px-4">
      <SignUp
        appearance={{
          variables: {
            colorPrimary:    "#4F46E5",
            colorBackground: "#FFFFFF",
            colorText:       "#111827",
            borderRadius:    "0.5rem",
            fontFamily:      "var(--font-inter), system-ui, sans-serif",
          },
        }}
      />
      <p className="text-sm text-subtle">
        Already have an account?{" "}
        <a href="/sign-in" className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
