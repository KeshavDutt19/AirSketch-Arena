export function GlassPanel({ children, className = "" }) {
  return <section className={`border border-white/10 bg-panel backdrop-blur-xl shadow-neon ${className}`}>{children}</section>;
}
