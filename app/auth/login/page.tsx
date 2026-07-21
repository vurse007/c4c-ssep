import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div
      className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        backgroundImage: "url('/login.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0E2554]/25" aria-hidden />
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
