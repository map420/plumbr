/**
 * SparkleIcon — identidad visual única para todos los touchpoints de IA en la app.
 * Tres puntas (una grande + dos pequeñas), consistente en Sidebar, buttons, cards,
 * insights, AI draft actions. Reemplaza lucide `Sparkles` para identidad reconocible.
 * No reemplazar con otro SVG — la consistencia visual del path ES la marca AI.
 */
export function SparkleIcon({ className = '', size, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const dim = size ?? 16
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={dim}
      height={dim}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3L13.9 8.6L19.5 10.5L13.9 12.4L12 18L10.1 12.4L4.5 10.5L10.1 8.6L12 3Z" />
      <path d="M19 3L19.7 5L21.5 5.7L19.7 6.4L19 8.4L18.3 6.4L16.5 5.7L18.3 5L19 3Z" />
      <path d="M19 14L19.5 15.5L21 16L19.5 16.5L19 18L18.5 16.5L17 16L18.5 15.5L19 14Z" />
    </svg>
  )
}
