import type {
  AppNotification,
  Booking,
  ForumCategory,
  ForumComment,
  ForumPost,
  Review,
  Service,
  ServiceCategory,
} from '@/types';

type UnknownRow = Record<string, unknown>;

function asRow(value: unknown): UnknownRow {
  if (Array.isArray(value)) return asRow(value[0]);
  return value && typeof value === 'object' ? value as UnknownRow : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function appRole(value: unknown): ForumPost['authorRole'] {
  if (value === 'admin' || value === 'moderator') return 'admin';
  if (value === 'barber') return 'barber';
  if (value === 'specialist') return 'expert';
  return 'user';
}

function appForumCategory(value: unknown): ForumCategory {
  const slug = asString(value, 'general');
  const supported: ForumCategory[] = [
    'general', 'discussions', 'tips', 'tips-tricks', 'products',
    'hairstyles', 'showcase', 'questions', 'competitions', 'verified-only',
  ];
  return supported.includes(slug as ForumCategory) ? slug as ForumCategory : 'general';
}

function mapService(value: unknown): Service | null {
  const row = asRow(value);
  const id = asString(row.id);
  if (!id) return null;
  return {
    id,
    name: asString(row.name, 'خدمة'),
    price: asNumber(row.price),
    duration: asNumber(row.duration_minutes, 30),
    description: asString(row.description) || undefined,
    category: asString(row.category, 'haircut') as ServiceCategory,
  };
}

export function mapBookingRow(value: unknown): Booking {
  const row = asRow(value);
  const professional = asRow(row.professionals);
  const professionalProfile = asRow(professional.profiles);
  const bookingServices = Array.isArray(row.booking_services)
    ? row.booking_services.map(entry => mapService(asRow(entry).services)).filter((service): service is Service => service !== null)
    : [];
  const service = mapService(row.services);
  const reviews = Array.isArray(row.reviews) ? row.reviews.map(asRow) : [];
  const startTime = asString(row.booking_start_time);
  const preferredDate = asString(row.preferred_date);
  const timeSetByBarber = row.time_set_by_barber === true;
  const status = asString(row.status, 'pending') as Booking['status'];
  const date = preferredDate || (startTime ? startTime.split('T')[0] : '');
  const time = timeSetByBarber || status !== 'pending'
    ? (startTime ? (startTime.split('T')[1] || '').slice(0, 5) : '')
    : '';

  return {
    id: asString(row.id),
    barberId: asString(row.professional_id),
    barberName: asString(professional.business_name)
      || asString(professionalProfile.full_name)
      || 'حلاق',
    barberAvatar: asString(professionalProfile.avatar_url, '/logo-icon.png'),
    services: bookingServices.length > 0 ? bookingServices : service ? [service] : [],
    date,
    time,
    timeSetByBarber,
    preferredTimeOfDay: (asString(row.preferred_time_of_day, 'any') as Booking['preferredTimeOfDay']),
    status,
    totalPrice: asNumber(row.total_price),
    discountAmount: asNumber(row.discount_amount) || undefined,
    note: asString(row.notes) || undefined,
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    location: asString(professional.business_address),
    isMobileService: row.is_mobile_service === true,
    paymentMethod: (asString(row.payment_method, 'cash')) as Booking['paymentMethod'],
    paymentStatus: asString(row.payment_status, 'pending') as Booking['paymentStatus'],
    reviewed: reviews.length > 0,
    rating: typeof reviews[0]?.rating === 'number' ? reviews[0].rating as number : undefined,
    address: asString(row.service_address) || undefined,
  };
}

export function mapNotificationRow(value: unknown): AppNotification {
  const row = asRow(value);
  const metadata = asRow(row.metadata);
  const allowedTypes: AppNotification['type'][] = [
    'booking', 'message', 'forum', 'promo', 'system', 'competition',
  ];
  const rawType = asString(row.type, 'system') as AppNotification['type'];
  const actionUrl = asString(metadata.action_url)
    || (asString(metadata.booking_id) ? '/appointments' : '')
    || (asString(metadata.conversation_id) ? `/chat/${asString(metadata.conversation_id)}` : '')
    || (asString(metadata.post_id) ? `/post/${asString(metadata.post_id)}` : '');
  return {
    id: asString(row.id),
    title: asString(row.title, 'إشعار'),
    message: asString(row.message),
    type: allowedTypes.includes(rawType) ? rawType : 'system',
    read: row.read === true,
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    actionUrl: actionUrl || undefined,
    image: asString(metadata.image) || undefined,
  };
}

export function mapForumPost(value: unknown, isLiked = false): ForumPost {
  const row = asRow(value);
  const profile = asRow(row.profiles);
  const category = asRow(row.forum_categories);
  return {
    id: asString(row.id),
    authorId: asString(row.author_id),
    authorName: asString(profile.full_name, 'مستخدم'),
    authorAvatar: asString(profile.avatar_url, '/logo-icon.png'),
    authorRole: appRole(profile.user_role),
    isVerified: profile.verification_status === 'verified'
      || profile.verification_status === 'premium',
    title: asString(row.title),
    content: asString(row.content),
    image: asString(row.image_url) || undefined,
    category: appForumCategory(category.slug),
    tags: [],
    likes: asNumber(row.likes_count),
    comments: [],
    views: asNumber(row.views_count),
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    isLiked,
    isPinned: row.is_pinned === true,
    isAnnouncement: row.type === 'announcement',
  };
}

function mapForumCommentRow(value: unknown): ForumComment {
  const row = asRow(value);
  const profile = asRow(row.profiles);
  return {
    id: asString(row.id),
    authorId: asString(row.author_id),
    authorName: asString(profile.full_name, 'مستخدم'),
    authorAvatar: asString(profile.avatar_url, '/logo-icon.png'),
    authorRole: appRole(profile.user_role),
    isVerified: profile.verification_status === 'verified'
      || profile.verification_status === 'premium',
    content: asString(row.content),
    likes: asNumber(row.likes_count),
    replies: [],
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    isLiked: false,
  };
}

export function mapForumComments(values: unknown[]): ForumComment[] {
  const entries = values.map(value => ({
    comment: mapForumCommentRow(value),
    parentId: asString(asRow(value).parent_id) || null,
  }));
  const byId = new Map(entries.map(entry => [entry.comment.id, entry.comment]));
  const roots: ForumComment[] = [];

  for (const entry of entries) {
    if (entry.parentId && byId.has(entry.parentId)) {
      byId.get(entry.parentId)?.replies.push(entry.comment);
    } else {
      roots.push(entry.comment);
    }
  }
  return roots;
}

export function mapReviewRow(value: unknown): Review {
  const row = asRow(value);
  const profile = asRow(row.profiles);
  return {
    id: asString(row.id),
    authorId: asString(row.reviewer_id),
    authorName: asString(profile.full_name, 'عميل'),
    authorAvatar: asString(profile.avatar_url, '/logo-icon.png'),
    rating: asNumber(row.rating),
    comment: asString(row.comment),
    date: asString(row.created_at, new Date(0).toISOString()),
    likes: 0,
  };
}
