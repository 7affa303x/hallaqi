/**
 * Hallaqi - Skeleton Loaders
 * Shimmer loading states for better perceived performance
 */
import { memo } from 'react';

// Base shimmer style
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '0.5rem',
};

// Inject shimmer keyframes
const shimmerCSS = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export const SkeletonBarberCard = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="rounded-2xl overflow-hidden border mb-3" style={{ backgroundColor: '#fff', borderColor: '#CCFBF1' }}>
      <div className="h-32" style={shimmerStyle} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-xl" style={{ ...shimmerStyle, borderRadius: '0.75rem' }} />
          <div className="flex-1">
            <div className="h-4 w-24 mb-1" style={shimmerStyle} />
            <div className="h-3 w-16" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
          </div>
        </div>
        <div className="h-3 w-full mb-1" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
        <div className="h-3 w-2/3" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
      </div>
    </div>
  </>
));

export const SkeletonChatMessage = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="flex justify-end mb-3">
      <div className="max-w-[75%]">
        <div className="px-3.5 py-2.5 rounded-2xl" style={{ ...shimmerStyle, width: '200px', height: '40px', borderBottomRightRadius: '4px' }} />
        <div className="h-2 w-10 mt-1 mr-1" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
      </div>
    </div>
  </>
));

export const SkeletonBookingCard = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="rounded-2xl border mb-3 overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#CCFBF1' }}>
      <div className="h-8" style={{ ...shimmerStyle, borderRadius: 0 }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl" style={{ ...shimmerStyle, borderRadius: '0.75rem' }} />
          <div className="flex-1">
            <div className="h-4 w-24 mb-1" style={shimmerStyle} />
            <div className="h-3 w-32" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
          </div>
        </div>
        <div className="h-3 w-full mb-2" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
        <div className="h-3 w-3/4" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
      </div>
    </div>
  </>
));

export const SkeletonProfile = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="pb-20">
      <div className="h-48" style={{ ...shimmerStyle, borderRadius: 0 }} />
      <div className="px-4 -mt-10 relative z-10">
        <div className="w-20 h-20 rounded-2xl border-4" style={{ ...shimmerStyle, borderRadius: '1rem', borderColor: '#F0FDFA' }} />
      </div>
      <div className="px-4 mt-4 space-y-3">
        <div className="h-5 w-32" style={shimmerStyle} />
        <div className="h-4 w-full" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
        <div className="h-4 w-2/3" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
      </div>
    </div>
  </>
));

export const SkeletonForumPost = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="rounded-2xl border mb-3 p-3" style={{ backgroundColor: '#fff', borderColor: '#CCFBF1' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl" style={{ ...shimmerStyle, borderRadius: '0.75rem' }} />
        <div>
          <div className="h-3 w-24 mb-1" style={shimmerStyle} />
          <div className="h-2 w-16" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
        </div>
      </div>
      <div className="h-4 w-full mb-1" style={shimmerStyle} />
      <div className="h-4 w-3/4 mb-1" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
      <div className="h-3 w-1/2" style={{ ...shimmerStyle, borderRadius: '0.25rem' }} />
    </div>
  </>
));

export const SkeletonMap = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="rounded-2xl overflow-hidden" style={{ ...shimmerStyle, height: '160px', borderRadius: '1rem' }} />
  </>
));

export const SkeletonMarketplaceCard = memo(() => (
  <>
    <style>{shimmerCSS}</style>
    <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
      <div className="h-28" style={shimmerStyle} />
      <div className="p-2 space-y-2">
        <div className="h-3 w-4/5" style={shimmerStyle} />
        <div className="h-3 w-1/2" style={shimmerStyle} />
      </div>
    </div>
  </>
));

SkeletonBarberCard.displayName = 'SkeletonBarberCard';
SkeletonChatMessage.displayName = 'SkeletonChatMessage';
SkeletonBookingCard.displayName = 'SkeletonBookingCard';
SkeletonProfile.displayName = 'SkeletonProfile';
SkeletonForumPost.displayName = 'SkeletonForumPost';
SkeletonMap.displayName = 'SkeletonMap';
SkeletonMarketplaceCard.displayName = 'SkeletonMarketplaceCard';
