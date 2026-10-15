import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#FAFAFA]">
      <div className="w-full max-w-sm">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl font-serif font-normal">
              Check your email
            </CardTitle>
            <CardDescription>We sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Click the link in the email to verify your address and finish
              creating your account. If you don&apos;t see it within a few
              minutes, check your spam folder.
            </p>
            <Link
              href="/auth/login"
              className="underline underline-offset-4 font-medium text-primary"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
