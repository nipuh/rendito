export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dark relative overflow-hidden flex items-center justify-center px-4">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-coral/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-berry/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
