interface BrandLogoProps {
  variant?: 'symbol' | 'wordmark' | 'icon';
  className?: string;
  priority?: boolean;
}

const sources = {
  symbol: '/logo-symbol.svg',
  wordmark: '/logo-wordmark.svg',
  icon: '/logo-icon.svg',
};

export default function BrandLogo({
  variant = 'symbol',
  className = '',
  priority = false,
}: BrandLogoProps) {
  return (
    <img
      src={sources[variant]}
      alt="Hallaqi"
      className={`object-contain ${variant === 'wordmark' ? 'rounded-xl' : 'rounded-lg'} ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
