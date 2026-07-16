import {
  mapBookingRow,
  mapForumComments,
  mapForumPost,
  mapNotificationRow,
} from './mappers';

describe('database mappers', () => {
  it('maps joined booking details into the appointment model', () => {
    const booking = mapBookingRow({
      id: 'booking-1',
      professional_id: 'barber-1',
      booking_start_time: '2026-07-20T09:30:00.000Z',
      status: 'confirmed',
      total_price: 900,
      payment_status: 'paid',
      payment_method: 'card',
      is_mobile_service: true,
      service_address: 'Algiers',
      professionals: {
        business_name: 'صالون حلاقي',
        business_address: 'باب الزوار',
        profiles: { full_name: 'أمين', avatar_url: '/amine.webp' },
      },
      services: {
        id: 'service-1',
        name: 'حلاقة',
        price: 900,
        duration_minutes: 30,
        category: 'haircut',
      },
      reviews: [{ id: 'review-1', rating: 5 }],
    });

    expect(booking.barberName).toBe('صالون حلاقي');
    expect(booking.services[0]?.name).toBe('حلاقة');
    expect(booking.paymentMethod).toBe('card');
    expect(booking.isMobileService).toBe(true);
    expect(booking.reviewed).toBe(true);
    expect(booking.rating).toBe(5);
  });

  it('maps database notification timestamps and metadata', () => {
    expect(mapNotificationRow({
      id: 'notification-1',
      title: 'حجز جديد',
      message: 'تم الحجز',
      type: 'booking',
      read: false,
      created_at: '2026-07-16T10:00:00.000Z',
      metadata: { action_url: '/appointments' },
    })).toEqual(expect.objectContaining({
      createdAt: '2026-07-16T10:00:00.000Z',
      actionUrl: '/appointments',
      type: 'booking',
    }));
  });

  it('maps live forum records without unsafe casts', () => {
    const post = mapForumPost({
      id: 'post-1',
      author_id: 'user-1',
      title: 'نصيحة',
      content: 'محتوى مفيد',
      likes_count: 2,
      comments_count: 1,
      views_count: 10,
      created_at: '2026-07-16T10:00:00.000Z',
      profiles: {
        full_name: 'محمد',
        user_role: 'barber',
        verification_status: 'verified',
      },
      forum_categories: { slug: 'tips' },
    }, true);

    expect(post.category).toBe('tips');
    expect(post.authorRole).toBe('barber');
    expect(post.isVerified).toBe(true);
    expect(post.isLiked).toBe(true);
    expect(post.comments).toEqual([]);
  });

  it('builds nested forum comment replies', () => {
    const comments = mapForumComments([
      {
        id: 'parent',
        author_id: 'user-1',
        content: 'أصل',
        parent_id: null,
        profiles: { full_name: 'الأول' },
      },
      {
        id: 'reply',
        author_id: 'user-2',
        content: 'رد',
        parent_id: 'parent',
        profiles: { full_name: 'الثاني' },
      },
    ]);

    expect(comments).toHaveLength(1);
    expect(comments[0]?.replies[0]?.id).toBe('reply');
  });
});
