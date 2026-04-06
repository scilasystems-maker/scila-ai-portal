export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - Brand visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface-dark">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 via-surface-dark to-brand-blue/10" />
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-brand-purple/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-brand-blue/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-2/3 left-1/3 w-48 h-48 rounded-full bg-brand-cyan/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="SCILA AI" className="w-12 h-12" />
            <span className="text-2xl font-bold text-white">SCILA AI</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestiona tus agentes de IA
            <br />
            <span className="gradient-text">desde un solo lugar</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            Monitoriza conversaciones, analiza métricas y controla todos tus agentes de WhatsApp, Telegram y más.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            {["Métricas en tiempo real", "Multi-agente", "Dashboard inteligente", "Roles y permisos"].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-brand-purple/30 text-brand-purple-light bg-brand-purple/5"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
