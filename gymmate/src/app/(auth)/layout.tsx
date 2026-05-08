export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
