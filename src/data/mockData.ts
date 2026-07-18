import type { Barber, Booking, Chat, ForumPost, Competition, AIFeature, AppNotification, User } from '@/types';

export const mockBarbers: Barber[] = [
  {
    id: '1', name: 'عمر الحلاق', wilaya: 'الجزائر العاصمة',
    avatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=300&fit=crop',
    rating: 4.9, reviewCount: 328, location: 'باب الزوار', distance: '1.2 كم',
    isActive: true, isVerified: true, tags: ['active', 'scissors-user', 'verified', 'top-rated'],
    services: [
      { id: 's1', name: 'قص شعر كلاسيكي', price: 300, duration: 30, category: 'haircut', description: 'قصة نظيفة بالمقص والماكينة' },
      { id: 's2', name: 'قص شعر عصري', price: 400, duration: 45, category: 'haircut', description: 'تصميم عصري مع fade' },
      { id: 's3', name: 'تحديد لحية', price: 200, duration: 20, category: 'beard', description: 'تحديد دقيق للحية بالشفرة' },
      { id: 's4', name: 'عناية كاملة', price: 800, duration: 90, category: 'package', description: 'قص شعر + لحية + غسيل + styling' },
    ],
    priceRange: 'متوسط',
    workingHours: { 'saturday': { open: '08:00', close: '20:00', isOpen: true }, 'sunday': { open: '08:00', close: '20:00', isOpen: true }, 'monday': { open: '08:00', close: '20:00', isOpen: true }, 'tuesday': { open: '08:00', close: '20:00', isOpen: true }, 'wednesday': { open: '08:00', close: '20:00', isOpen: true }, 'thursday': { open: '08:00', close: '20:00', isOpen: true }, 'friday': { open: '14:00', close: '20:00', isOpen: true } },
    isMobile: false, usesScissors: true, yearsOfExperience: 15,
    bio: 'حلاق محترف بخبرة 15 سنة متخصص في القصات الكلاسيكية والعصرية',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'premium',
    followers: 2450, following: 120, likes: 8920, isFollowing: true,
    reviews: [
      { id: 'r1', authorId: 'u1', authorName: 'كريم بن عمر', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'أفضل حلاق في باب الزوار! يعرف شو يدير بالضبط. القصة تبقى مضبوطة لأسبوعين.', date: '2025-07-01', likes: 12 },
      { id: 'r2', authorId: 'u2', authorName: 'محمد صالح', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'خدمة احترافية ونظافة ممتازة. السعر مناسب جداً للجودة.', date: '2025-06-28', likes: 8, reply: 'شكراً أخ محمد، شرفتنا!' },
      { id: 'r3', authorId: 'u3', authorName: 'أحمد لزرق', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', rating: 4, comment: 'شاطر بزاف، بس العتابار يتملا بسرعة. يستحسن الحجز مسبقاً.', date: '2025-06-25', likes: 5 },
    ],
  },
  {
    id: '2', name: 'كريم الذهبي', wilaya: 'وهران',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=300&fit=crop',
    rating: 4.7, reviewCount: 186, location: 'سيدي الهواري', distance: '3.5 كم',
    isActive: true, isVerified: true, tags: ['mobile', 'active', 'quick', 'verified'],
    services: [
      { id: 's5', name: 'قص منزلي', price: 500, duration: 30, category: 'haircut', description: 'قص شعر في منزلك مع جميع المعدات' },
      { id: 's6', name: 'عناية منزلية كاملة', price: 1200, duration: 60, category: 'package', description: 'بكج كامل في منزلك' },
    ],
    priceRange: 'مرتفع',
    workingHours: { 'saturday': { open: '09:00', close: '21:00', isOpen: true }, 'sunday': { open: '09:00', close: '21:00', isOpen: true }, 'monday': { open: '09:00', close: '21:00', isOpen: true }, 'tuesday': { open: '09:00', close: '21:00', isOpen: true }, 'wednesday': { open: '09:00', close: '21:00', isOpen: true }, 'thursday': { open: '09:00', close: '21:00', isOpen: true }, 'friday': { open: '15:00', close: '21:00', isOpen: true } },
    isMobile: true, usesScissors: true, yearsOfExperience: 8,
    bio: 'حلاق متنقل يأتي لبيتك مع جميع المعدات الاحترافية',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'pro',
    followers: 980, following: 45, likes: 3450, isFollowing: false,
    reviews: [
      { id: 'r4', authorId: 'u4', authorName: 'نور الدين', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'خدمة رائعة! يجي للدار في الوقت المحدد وكل المعدات معاه. أنصح بزاف.', date: '2025-07-05', likes: 15 },
      { id: 'r5', authorId: 'u5', authorName: 'ياسين بن يوسف', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', rating: 4, comment: 'ممتاز للي ما يقدرش يروح للصالون. الأسعار شوية مرتفعة بصح الخدمة تستاهل.', date: '2025-06-30', likes: 7 },
    ],
  },
  {
    id: '3', name: 'أمين الحرفي', wilaya: 'قسنطينة',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=300&fit=crop',
    rating: 4.5, reviewCount: 92, location: 'وسط المدينة', distance: '5.1 كم',
    isActive: false, isVerified: false, tags: ['old-school', 'scissors-user'],
    services: [
      { id: 's7', name: 'قص تقليدي', price: 250, duration: 40, category: 'haircut', description: 'قص بالمقص التقليدي' },
      { id: 's8', name: 'حلاقة كلاسيكية', price: 200, duration: 30, category: 'haircut', description: 'حلاقة كلاسيكية بالشفرة' },
    ],
    priceRange: 'منخفض',
    workingHours: { 'saturday': { open: '08:00', close: '18:00', isOpen: true }, 'sunday': { open: '08:00', close: '18:00', isOpen: true }, 'monday': { open: '08:00', close: '18:00', isOpen: true }, 'tuesday': { open: '08:00', close: '18:00', isOpen: true }, 'wednesday': { open: '08:00', close: '18:00', isOpen: true }, 'thursday': { open: '08:00', close: '18:00', isOpen: true }, 'friday': { open: '00:00', close: '00:00', isOpen: false } },
    isMobile: false, usesScissors: true, yearsOfExperience: 25,
    bio: 'حلاق تقليدي بخبرة 25 سنة في الحلاقة الكلاسيكية بالمقص فقط',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop'],
    hasIdCard: false, idCardVerified: false, isSubscribed: false,
    followers: 320, following: 15, likes: 890, isFollowing: false,
    reviews: [
      { id: 'r6', authorId: 'u6', authorName: 'رشيد حمادي', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', rating: 5, comment: '25 سنة خبرة باينة! القصة بالمقص يد واحدة. السعر في متناول الجميع.', date: '2025-06-20', likes: 20 },
    ],
  },
  {
    id: '4', name: 'ياسين الأنيق', wilaya: 'الجزائر العاصمة',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=300&fit=crop',
    rating: 4.8, reviewCount: 215, location: 'حيدرة', distance: '0.8 كم',
    isActive: true, isVerified: true, tags: ['active', 'trending', 'premium', 'verified'],
    services: [
      { id: 's9', name: 'قص فاخر', price: 600, duration: 45, category: 'haircut', description: 'قصة فاخرة مع كل التفاصيل' },
      { id: 's10', name: 'صبغة شعر', price: 1500, duration: 120, category: 'coloring', description: 'صبغة احترافية بأفضل الماركات' },
      { id: 's11', name: 'عناية بالوجه', price: 400, duration: 30, category: 'facial', description: 'تنظيف وترطيب للبشرة' },
      { id: 's12', name: 'تسريحة زفاف', price: 3000, duration: 180, category: 'styling', description: 'تسريحة كاملة للعريس' },
    ],
    priceRange: 'فاخر',
    workingHours: { 'saturday': { open: '09:00', close: '22:00', isOpen: true }, 'sunday': { open: '09:00', close: '22:00', isOpen: true }, 'monday': { open: '09:00', close: '22:00', isOpen: true }, 'tuesday': { open: '09:00', close: '22:00', isOpen: true }, 'wednesday': { open: '09:00', close: '22:00', isOpen: true }, 'thursday': { open: '09:00', close: '22:00', isOpen: true }, 'friday': { open: '14:00', close: '20:00', isOpen: true } },
    isMobile: false, usesScissors: false, yearsOfExperience: 10,
    bio: 'صالون فاخر يقدم خدمات الحلاقة العصرية والعناية الشخصية',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1593702295094-aea2c4ee13fc?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'premium',
    followers: 3100, following: 200, likes: 12400, isFollowing: true,
    reviews: [
      { id: 'r7', authorId: 'u7', authorName: 'فؤاد مراد', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'الصالون فاخر والخدمة عالمية. الصبغة طلعت ممتازة والعناية بالوجه رائعة.', date: '2025-07-03', likes: 18 },
      { id: 'r8', authorId: 'u8', authorName: 'سمير بن علي', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'أحسن صالون في حيدرة. الديكور عصري والنظافة على أعلى مستوى.', date: '2025-06-29', likes: 22, reply: 'شكراً لك أخ سمير! نسعد بزيارتك دائماً' },
    ],
  },
  {
    id: '5', name: 'نورالدين المتنقل', wilaya: 'البليدة',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=300&fit=crop',
    rating: 4.6, reviewCount: 78, location: 'بني مراد', distance: '8.2 كم',
    isActive: true, isVerified: true, tags: ['mobile', 'new', 'quick', 'verified'],
    services: [
      { id: 's13', name: 'قص سريع منزلي', price: 350, duration: 20, category: 'haircut', description: 'قص سريع في بيتك' },
      { id: 's14', name: 'حلاقة كاملة منزلية', price: 700, duration: 45, category: 'package', description: 'قص + لحية + غسيل في المنزل' },
    ],
    priceRange: 'متوسط',
    workingHours: { 'saturday': { open: '08:00', close: '20:00', isOpen: true }, 'sunday': { open: '08:00', close: '20:00', isOpen: true }, 'monday': { open: '08:00', close: '20:00', isOpen: true }, 'tuesday': { open: '08:00', close: '20:00', isOpen: true }, 'wednesday': { open: '08:00', close: '20:00', isOpen: true }, 'thursday': { open: '08:00', close: '20:00', isOpen: true }, 'friday': { open: '14:00', close: '19:00', isOpen: true } },
    isMobile: true, usesScissors: false, yearsOfExperience: 3,
    bio: 'حلاق متنقل جديد يقدم خدمة سريعة ونظيفة في بيتك',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'basic',
    followers: 450, following: 30, likes: 1200, isFollowing: false,
    reviews: [
      { id: 'r9', authorId: 'u9', authorName: 'عبد الكريم', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', rating: 4, comment: 'شاب جديد بصح ناشط وملتزم بالوقت. سعر مناسب جداً.', date: '2025-07-04', likes: 6 },
    ],
  },
  {
    id: '6', name: 'سمير الفنان', wilaya: 'الجزائر العاصمة',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=300&fit=crop',
    rating: 4.9, reviewCount: 412, location: 'بوزريعة', distance: '4.3 كم',
    isActive: true, isVerified: true, tags: ['active', 'top-rated', 'premium', 'trending', 'verified'],
    services: [
      { id: 's15', name: 'قص فني', price: 500, duration: 45, category: 'haircut', description: 'قصة فنية إبداعية' },
      { id: 's16', name: 'تصميم ذقن', price: 350, duration: 30, category: 'beard', description: 'تصميم احترافي للذقن' },
      { id: 's17', name: 'صبغة احترافية', price: 2000, duration: 150, category: 'coloring', description: 'صبغة بلاتينيوم أو ألوان خاصة' },
      { id: 's18', name: 'بكج العريس', price: 5000, duration: 240, category: 'package', description: 'بكج كامل للعريس يوم الزفاف' },
    ],
    priceRange: 'فاخر',
    workingHours: { 'saturday': { open: '09:00', close: '23:00', isOpen: true }, 'sunday': { open: '09:00', close: '23:00', isOpen: true }, 'monday': { open: '09:00', close: '23:00', isOpen: true }, 'tuesday': { open: '09:00', close: '23:00', isOpen: true }, 'wednesday': { open: '09:00', close: '23:00', isOpen: true }, 'thursday': { open: '09:00', close: '23:00', isOpen: true }, 'friday': { open: '14:00', close: '21:00', isOpen: true } },
    isMobile: false, usesScissors: true, yearsOfExperience: 12,
    bio: 'فنان حلاقة يقدم تصاميم فريدة وإبداعية',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1593702295094-aea2c4ee13fc?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'premium',
    followers: 5600, following: 180, likes: 18900, isFollowing: true,
    reviews: [
      { id: 'r10', authorId: 'u10', authorName: 'مهدي سامي', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'فنان بمعنى الكلمة! كل قصة تاعو تحفة فنية. الصبغة البلاتينيوم اللي درهالي راوعة.', date: '2025-07-06', likes: 35 },
      { id: 'r11', authorId: 'u11', authorName: 'وليد عمر', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'بكج العريس تحفة! خدمة VIP من الألف للياء. كل شيء كان مضبوط.', date: '2025-06-28', likes: 42, reply: 'تشرفت بخدمتك يوم زفافك أخ وليد! في ذمة الله' },
      { id: 'r12', authorId: 'u12', authorName: 'أمين طارق', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'نمبر 1 في الجزائر العاصمة. تقلقش تروح عندو.', date: '2025-06-15', likes: 55 },
    ],
  },
  {
    id: '7', name: 'عبد الرحمان الشاطئ', wilaya: 'عنابة',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=300&fit=crop',
    rating: 4.7, reviewCount: 134, location: 'وسط المدينة', distance: '0.5 كم',
    isActive: true, isVerified: true, tags: ['active', 'verified', 'top-rated', 'trending'],
    services: [
      { id: 's19', name: 'قص عصري', price: 350, duration: 30, category: 'haircut', description: 'أحدث القصات العالمية' },
      { id: 's20', name: 'عناية باللحية', price: 250, duration: 25, category: 'beard', description: 'تغذية وتهذيب اللحية' },
      { id: 's21', name: 'غسيل وتدليك', price: 300, duration: 20, category: 'facial', description: 'غسيل عميق مع تدليك الرأس' },
    ],
    priceRange: 'متوسط',
    workingHours: { 'saturday': { open: '08:00', close: '21:00', isOpen: true }, 'sunday': { open: '08:00', close: '21:00', isOpen: true }, 'monday': { open: '08:00', close: '21:00', isOpen: true }, 'tuesday': { open: '08:00', close: '21:00', isOpen: true }, 'wednesday': { open: '08:00', close: '21:00', isOpen: true }, 'thursday': { open: '08:00', close: '21:00', isOpen: true }, 'friday': { open: '13:00', close: '20:00', isOpen: true } },
    isMobile: false, usesScissors: true, yearsOfExperience: 7,
    bio: 'حلاق شبابي متخصص في القصات العالمية والشاطئية',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop'],
    hasIdCard: true, idCardVerified: true, isSubscribed: true, subscriptionPlan: 'pro',
    followers: 1780, following: 89, likes: 6200, isFollowing: false,
    reviews: [
      { id: 'r13', authorId: 'u13', authorName: 'إسلام بوجمعة', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', rating: 5, comment: 'أحسن حلاق في عنابة. القصات العالمية يديرهم بإتقان.', date: '2025-07-07', likes: 19 },
    ],
  },
  {
    id: '8', name: 'إبراهيم الصحراوي', wilaya: 'ورقلة',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=300&fit=crop',
    rating: 4.4, reviewCount: 56, location: 'وسط المدينة', distance: '1.0 كم',
    isActive: true, isVerified: false, tags: ['new', 'quick', 'old-school'],
    services: [
      { id: 's22', name: 'قص كلاسيكي', price: 200, duration: 25, category: 'haircut', description: 'قص سريع ونظيف' },
      { id: 's23', name: 'تحديد', price: 150, duration: 15, category: 'beard', description: 'تحديد بسيط' },
    ],
    priceRange: 'منخفض',
    workingHours: { 'saturday': { open: '07:00', close: '20:00', isOpen: true }, 'sunday': { open: '07:00', close: '20:00', isOpen: true }, 'monday': { open: '07:00', close: '20:00', isOpen: true }, 'tuesday': { open: '07:00', close: '20:00', isOpen: true }, 'wednesday': { open: '07:00', close: '20:00', isOpen: true }, 'thursday': { open: '07:00', close: '20:00', isOpen: true }, 'friday': { open: '13:00', close: '19:00', isOpen: true } },
    isMobile: false, usesScissors: false, yearsOfExperience: 2,
    bio: 'حلاق شاب في الجنوب الجزائري، أسعار منخفضة وخدمة ممتازة',
    portfolio: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop'],
    hasIdCard: false, idCardVerified: false, isSubscribed: false,
    followers: 180, following: 12, likes: 450, isFollowing: false,
    reviews: [],
  },
];

export const mockBookings: Booking[] = [
  {
    id: 'b1', barberId: '1', barberName: 'عمر الحلاق',
    barberAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face',
    services: [
      { id: 's1', name: 'قص شعر كلاسيكي', price: 300, duration: 30, category: 'haircut' },
      { id: 's3', name: 'تحديد لحية', price: 200, duration: 20, category: 'beard' },
    ],
    date: '2025-07-10', time: '10:00', status: 'confirmed', totalPrice: 500,
    note: 'أرغب في قصة قصيرة جداً', createdAt: '2025-07-09T08:00:00',
    location: 'صالون عمر - باب الزوار', isMobileService: false,
    paymentMethod: 'ccp', paymentStatus: 'paid', reviewed: false,
  },
  {
    id: 'b2', barberId: '4', barberName: 'ياسين الأنيق',
    barberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    services: [{ id: 's9', name: 'قص فاخر', price: 600, duration: 45, category: 'haircut' }],
    date: '2025-07-12', time: '14:30', status: 'pending', totalPrice: 600,
    createdAt: '2025-07-09T09:30:00', location: 'صالون ياسين - حيدرة',
    isMobileService: false, paymentMethod: 'baridi-mob', paymentStatus: 'pending', reviewed: false,
  },
  {
    id: 'b3', barberId: '2', barberName: 'كريم الذهبي',
    barberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    services: [{ id: 's6', name: 'عناية منزلية كاملة', price: 1200, duration: 60, category: 'package' }],
    date: '2025-07-08', time: '16:00', status: 'completed', totalPrice: 1200,
    createdAt: '2025-07-05T10:00:00', location: 'المنزل - وهران',
    isMobileService: true, paymentMethod: 'cash', paymentStatus: 'paid', reviewed: true, rating: 5,
  },
];

export const mockChats: Chat[] = [
  {
    id: 'c1', participantId: '1', participantName: 'عمر الحلاق',
    participantAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face',
    lastMessage: 'تمام، بانتظارك غداً إن شاء الله', lastMessageTime: '10:30', unreadCount: 2, isOnline: true,
    messages: [
      { id: 'm1', senderId: '1', content: 'مرحباً، هل يمكنني حجز موعد لغداً؟', timestamp: '10:00', type: 'text', isRead: true },
      { id: 'm2', senderId: 'me', content: 'نعم متى تريد؟', timestamp: '10:05', type: 'text', isRead: true },
      { id: 'm3', senderId: '1', content: 'العاشرة صباحاً مناسبة', timestamp: '10:15', type: 'text', isRead: true },
      { id: 'm4', senderId: 'me', content: 'تم الحجز، ننتظرك', timestamp: '10:20', type: 'booking', isRead: true },
      { id: 'm5', senderId: '1', content: 'تمام، بانتظارك غداً إن شاء الله', timestamp: '10:30', type: 'text', isRead: false },
    ],
  },
  {
    id: 'c2', participantId: '2', participantName: 'كريم الذهبي',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    lastMessage: 'أين عنوانك بالضبط؟', lastMessageTime: 'أمس', unreadCount: 1, isOnline: false,
    messages: [
      { id: 'm6', senderId: '2', content: 'مرحباً، هل تريد خدمة منزلية؟', timestamp: '09:00', type: 'text', isRead: true },
      { id: 'm7', senderId: 'me', content: 'نعم أريد حلاقة كاملة', timestamp: '09:30', type: 'text', isRead: true },
      { id: 'm8', senderId: '2', content: 'أين عنوانك بالضبط؟', timestamp: '10:00', type: 'text', isRead: false },
    ],
  },
  {
    id: 'c3', participantId: '6', participantName: 'سمير الفنان',
    participantAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    lastMessage: 'شكراً على الزيارة', lastMessageTime: 'الأحد', unreadCount: 0, isOnline: true,
    messages: [
      { id: 'm9', senderId: '6', content: 'كيف كانت التجربة؟', timestamp: '20:00', type: 'text', isRead: true },
      { id: 'm10', senderId: 'me', content: 'ممتازة جداً شكراً', timestamp: '20:30', type: 'text', isRead: true },
      { id: 'm11', senderId: '6', content: 'شكراً على الزيارة', timestamp: '21:00', type: 'text', isRead: true },
    ],
  },
];

export const mockForumPosts: ForumPost[] = [
  {
    id: 'f1', authorId: '1', authorName: 'عمر الحلاق', authorAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face',
    authorRole: 'barber', isVerified: true, title: 'نصائح للعناية بالشعر في فصل الصيف',
    content: 'مع ارتفاع درجات الحرارة، من المهم جداً العناية بالشعر بشكل خاص. إليكم بعض النصائح المهمة:\n\n1. رطبوا شعركم باستمرار\n2. استخدموا شامبو خالي من السلفات\n3. تجنبوا الغسيل المتكرر\n4. استخدموا واقي حراري قبل السشوار\n5. تناولوا فيتامينات للشعر',
    category: 'tips-tricks', tags: ['عناية', 'صيف', 'نصائح'], likes: 45,
    comments: [
      { id: 'fc1', authorId: '10', authorName: 'أحمد المستخدم', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', authorRole: 'user', isVerified: false, content: 'شكراً على النصائح القيمة!', likes: 5, replies: [], createdAt: '2025-07-09T09:00:00', isLiked: false },
    ],
    views: 320, createdAt: '2025-07-09T08:00:00', isLiked: true, isPinned: true, isAnnouncement: false,
  },
  {
    id: 'f2', authorId: '20', authorName: 'إدارة التطبيق', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    authorRole: 'admin', isVerified: true, title: 'مسابقة الحلاق الأكثر تفاعلاً لهذا الشهر',
    content: 'انضموا إلى مسابقتنا الشهرية واربحوا شارة المتفاعل الذهبية! الشروط بسيطة:\n\n1. الإجابة على أسئلة المستخدمين\n2. نشر محتوى مفيد في المنتدى\n3. الحصول على إعجابات وتفاعلات\n4. الرد على التعليقات بسرعة',
    category: 'competitions', tags: ['مسابقة', 'شارة', 'جوائز'], likes: 128,
    comments: [
      { id: 'fc2', authorId: '1', authorName: 'عمر الحلاق', authorAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face', authorRole: 'barber', isVerified: true, content: 'أنا مستعد للتحدي!', likes: 12, replies: [{ id: 'fcr1', authorId: '6', authorName: 'سمير الفنان', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', authorRole: 'barber', isVerified: true, content: 'بالتوفيق للجميع!', likes: 3, replies: [], createdAt: '2025-07-09T10:00:00', isLiked: false }], createdAt: '2025-07-09T09:30:00', isLiked: false },
    ],
    views: 850, createdAt: '2025-07-08T10:00:00', isLiked: true, isPinned: true, isAnnouncement: true,
  },
  {
    id: 'f3', authorId: '30', authorName: 'خبير التجميل كريم', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    authorRole: 'expert', isVerified: true, title: 'أفضل منتجات الشعر للعناية اليومية',
    content: 'بعد تجربة مكثفة، إليكم قائمة بأفضل المنتجات المتوفرة في الجزائر:\n\n1. زيت الأرغان الطبيعي\n2. شامبو Nivea Men\n3. واكس الشعر Got2b\n4. بلسم Pantene Pro-V',
    category: 'discussions', tags: ['منتجات', 'عناية', 'توصيات'], likes: 67,
    comments: [
      { id: 'fc3', authorId: '40', authorName: 'محمد المستخدم', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', authorRole: 'user', isVerified: false, content: 'هل هذه المنتجات متوفرة في الصيدليات؟', likes: 2, replies: [{ id: 'fcr2', authorId: '30', authorName: 'خبير التجميل كريم', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', authorRole: 'expert', isVerified: true, content: 'نعم متوفرة في معظم الصيدليات الكبرى', likes: 1, replies: [], createdAt: '2025-07-09T11:00:00', isLiked: false }], createdAt: '2025-07-09T10:30:00', isLiked: false },
    ],
    views: 540, createdAt: '2025-07-07T14:00:00', isLiked: false, isPinned: false, isAnnouncement: false,
  },
  {
    id: 'f4', authorId: '50', authorName: 'مستخدم موثق', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
    authorRole: 'user', isVerified: true, title: 'تجربتي مع الحلاق المتنقل - رأي صادق',
    content: 'جربت خدمة الحلاق المتنقل لأول مرة وأردت مشاركة تجربتي معكم. كانت تجربة ممتازة ووفرت وقت كثير. الحلاق جاء في الوقت المحدد وكان محترف جداً.',
    category: 'verified-only', tags: ['تجربة', 'حلاق متنقل', 'رأي'], likes: 34,
    comments: [
      { id: 'fc4', authorId: '2', authorName: 'كريم الذهبي', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', authorRole: 'barber', isVerified: true, content: 'شكراً على تقييمك الصادق!', likes: 8, replies: [], createdAt: '2025-07-09T12:00:00', isLiked: false },
    ],
    views: 280, createdAt: '2025-07-06T16:00:00', isLiked: false, isPinned: false, isAnnouncement: false,
  },
  {
    id: 'f5', authorId: '6', authorName: 'سمير الفنان', authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    authorRole: 'barber', isVerified: true, title: 'عرض خاص: خصم 20% على الصبغة هذا الأسبوع',
    content: 'احتفالاً بمرور عام على افتتاح الصالون، نقدم خصماً خاصاً لجميع عملائنا الكرام:\n\nخصم 20% على جميع أنواع الصبغة هذا الأسبوع فقط! احجزوا موعدكم الآن.',
    category: 'general', tags: ['عرض', 'خصم', 'صبغة'], likes: 89,
    comments: [
      { id: 'fc5', authorId: '60', authorName: 'فاطمة الزبونة', authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', authorRole: 'user', isVerified: false, content: 'ممتاز! سأحجز موعداً', likes: 4, replies: [], createdAt: '2025-07-09T13:00:00', isLiked: false },
    ],
    views: 670, createdAt: '2025-07-05T09:00:00', isLiked: true, isPinned: false, isAnnouncement: false,
  },
];

export const mockCompetitions: Competition[] = [
  {
    id: 'comp1', title: 'الحلاق الأكثر تفاعلاً - يوليو 2025', description: 'نافس لتكون الحلاق الأكثر تفاعلاً في المنتدى هذا الشهر',
    type: 'monthly', startDate: '2025-07-01', endDate: '2025-07-31',
    participants: [
      { userId: '1', userName: 'عمر الحلاق', userAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face', score: 850, rank: 1 },
      { userId: '6', userName: 'سمير الفنان', userAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', score: 720, rank: 2 },
      { userId: '4', userName: 'ياسين الأنيق', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', score: 540, rank: 3 },
    ],
    prize: 'شارة المتفاعل الذهبية + اشتراك مجاني لمدة شهر', badgeReward: 'gold-active', status: 'active',
    rules: ['الإجابة على أسئلة المستخدمين', 'نشر محتوى مفيد في المنتدى', 'الحصول على إعجابات وتفاعلات', 'الرد على التعليقات بسرعة'],
  },
  {
    id: 'comp2', title: 'مسابقة الأسبوع - أفضل قصة شعر', description: 'شارك بأفضل صورة لقصة شعر قمت بها هذا الأسبوع',
    type: 'weekly', startDate: '2025-07-07', endDate: '2025-07-13',
    participants: [
      { userId: '6', userName: 'سمير الفنان', userAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', score: 120, rank: 1 },
      { userId: '1', userName: 'عمر الحلاق', userAvatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop&crop=face', score: 95, rank: 2 },
    ],
    prize: 'شارة الإبداع + ظهور مميز في الصفحة الرئيسية', badgeReward: 'creative', status: 'active',
    rules: ['نشر صورة واضحة للقصة', 'شرح تقنية القص المستخدمة', 'الحصول على أكبر عدد من الإعجابات'],
  },
];

export const mockAIFeatures: AIFeature[] = [
  { id: 'ai1', name: 'تحليل وجهك', description: 'اكتشف نوع وجهك والقصة المناسبة', icon: 'ScanFace', status: 'coming-soon', category: 'analysis' },
  { id: 'ai2', name: 'تجربة افتراضية', description: 'جرب قصات مختلفة افتراضياً', icon: 'Camera', status: 'coming-soon', category: 'virtual-try' },
  { id: 'ai3', name: 'نصيحة AI', description: 'احصل على نصيحة مخصصة للعناية بشعرك', icon: 'Sparkles', status: 'available', category: 'advice' },
  { id: 'ai4', name: 'اختيار اللون', description: 'اكتشف أفضل ألوان الصبغة لك', icon: 'Palette', status: 'coming-soon', category: 'color' },
  { id: 'ai5', name: 'تحليل الشعر', description: 'حلل نوع شعرك وحالته', icon: 'Microscope', status: 'beta', category: 'analysis' },
  { id: 'ai6', name: 'تصميم تسريحة', description: 'صمم تسريحتك الخاصة بالAI', icon: 'Wand2', status: 'coming-soon', category: 'style' },
];

export const mockNotifications: AppNotification[] = [
  { id: 'n1', title: 'تذكير بالموعد', message: 'موعدك مع عمر الحلاق غداً الساعة 10:00', type: 'booking', read: false, createdAt: '2025-07-09T08:00:00' },
  { id: 'n2', title: 'رسالة جديدة', message: 'عمر الحلاق: تمام، بانتظارك غداً', type: 'message', read: false, createdAt: '2025-07-09T10:30:00' },
  { id: 'n3', title: 'رد على منشورك', message: 'سمير الفنان علق على منشورك في المنتدى', type: 'forum', read: true, createdAt: '2025-07-08T15:00:00' },
  { id: 'n4', title: 'عرض خاص!', message: 'خصم 20% على الصبغة لدى سمير الفنان', type: 'promo', read: false, createdAt: '2025-07-09T09:00:00' },
  { id: 'n5', title: 'مسابقة جديدة', message: 'انضم إلى مسابقة الأسبوع وأظهر إبداعك', type: 'competition', read: true, createdAt: '2025-07-07T12:00:00' },
];

export const mockCurrentUser: User = {
  id: '100', name: 'أحمد الزبون', email: 'ahmed@example.com', phone: '+213550123456',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
  isVerified: true, idCardVerified: true, role: 'user', joinedDate: '2025-01-15',
  bio: 'مهتم بالعناية بالشعر واللحية', location: 'الجزائر العاصمة', wilaya: 'الجزائر العاصمة',
  followers: 45, following: 12, bookings: [], savedBarbers: ['1', '4', '6'],
  notificationsEnabled: true, theme: 'modern', language: 'ar', isSubscribed: false,
  badges: [
    { id: 'badge1', name: 'مستخدم موثق', icon: 'BadgeCheck', description: 'تم توثيق حسابك بالبطاقة التعريفية', earnedAt: '2025-01-20', color: '#22C55E' },
    { id: 'badge2', name: 'أول حجز', icon: 'Calendar', description: 'أجريت أول حجز عبر التطبيق', earnedAt: '2025-02-01', color: '#3B82F6' },
  ],
  stats: { totalBookings: 15, totalSpent: 8500, favoriteBarber: 'عمر الحلاق', streakDays: 5, points: 1250, rank: 'فضي' },
  linkedAccounts: [
    { provider: 'google', connected: true, username: 'ahmed@gmail.com' },
    { provider: 'facebook', connected: false },
    { provider: 'apple', connected: false },
    { provider: 'instagram', connected: true, username: '@ahmed_style' },
  ],
};

export const barberTags = [
  { key: 'active', label: 'متفاعل', color: '#22C55E', icon: 'Zap' },
  { key: 'old-school', label: 'تقليدي', color: '#78716C', icon: 'Scissors' },
  { key: 'scissors-user', label: 'يستخدم المقص', color: '#8B5CF6', icon: 'Scissors' },
  { key: 'mobile', label: 'متنقل', color: '#3B82F6', icon: 'Car' },
  { key: 'verified', label: 'موثق', color: '#0EA5E9', icon: 'BadgeCheck' },
  { key: 'trending', label: 'رائج', color: '#F59E0B', icon: 'TrendingUp' },
  { key: 'new', label: 'جديد', color: '#10B981', icon: 'Sparkles' },
  { key: 'top-rated', label: 'الأعلى تقييماً', color: '#EAB308', icon: 'Star' },
  { key: 'quick', label: 'سريع', color: '#06B6D4', icon: 'Clock' },
  { key: 'premium', label: 'فاخر', color: '#A855F7', icon: 'Crown' },
] as const;

export const serviceCategories = [
  { key: 'haircut', label: 'قص شعر', icon: 'Scissors' },
  { key: 'beard', label: 'لحية', icon: 'User' },
  { key: 'facial', label: 'عناية بالوجه', icon: 'Sparkles' },
  { key: 'coloring', label: 'صبغة', icon: 'Palette' },
  { key: 'styling', label: 'تسريحة', icon: 'Wand2' },
  { key: 'package', label: 'باقات', icon: 'Package' },
] as const;

export const forumCategories = [
  { key: 'general', label: 'عام', icon: 'MessageCircle', color: '#3B82F6' },
  { key: 'discussions', label: 'نقاشات', icon: 'Users', color: '#8B5CF6' },
  { key: 'tips-tricks', label: 'نصائح وحيل', icon: 'Lightbulb', color: '#F59E0B' },
  { key: 'showcase', label: 'معرض الأعمال', icon: 'Image', color: '#10B981' },
  { key: 'questions', label: 'أسئلة', icon: 'HelpCircle', color: '#EF4444' },
  { key: 'competitions', label: 'مسابقات', icon: 'Trophy', color: '#EAB308' },
  { key: 'verified-only', label: 'للموثقين فقط', icon: 'Shield', color: '#0EA5E9' },
] as const;

export const subscriptionPlans = [
  {
    id: 'free', name: 'مجاني', price: 0, period: 'شهرياً',
    features: ['البحث عن حلاقين', 'حجز موعد واحد يومياً', 'المشاركة في المنتدى العام', '5 رسائل يومياً'],
    ccpInfo: { accountNumber: '', cardNumber: '' },
  },
  {
    id: 'basic', name: 'أساسي', price: 500, period: 'شهرياً',
    features: ['كل مميزات المجانية', 'حجوزات غير محدودة', 'رسائل غير محدودة', 'ظهور مميز في البحث', 'إحصائيات أساسية', 'دعم فني'],
    ccpInfo: { accountNumber: '007999990000000012345678', cardNumber: '1234567890123456' },
  },
  {
    id: 'professional', name: 'احترافي', price: 1200, period: 'شهرياً',
    features: ['كل مميزات الأساسي', 'شارة موثق ذهبية', 'أولوية في البحث', 'إحصائيات متقدمة', 'تخصيص البروفايل', 'دعم فني أولي', 'إعلانات مخفضة'],
    ccpInfo: { accountNumber: '007999990000000087654321', cardNumber: '9876543210987654' },
  },
  {
    id: 'business', name: 'أعمال', price: 2500, period: 'شهرياً',
    features: ['كل مميزات الاحترافي', 'شارة بريميوم الماسية', 'أعلى أولوية في البحث', 'تحليلات AI', 'تقارير شاملة', 'دعم فني 24/7', 'إعلانات مجانية', 'وصول مبكر للميزات الجديدة', 'API للربط الخارجي'],
    ccpInfo: { accountNumber: '007999990000000055555555', cardNumber: '5555555555555555' },
  },
] as const;

export const settingsSections = [
  {
    title: 'المظهر',
    items: [
      { id: 'theme', label: 'السمة', icon: 'Palette', description: 'اختر سمة التطبيق المفضلة', type: 'select' },
      { id: 'animation', label: 'نمط الحركة', icon: 'Sparkles', description: 'اختر نمط الانتقالات والحركات', type: 'select' },
      { id: 'language', label: 'اللغة', icon: 'Globe', description: 'العربية / الفرنسية / الإنجليزية', type: 'select' },
      { id: 'country', label: 'البلد', icon: 'MapPin', description: 'اختر بلدك من قائمة دول العالم', type: 'select' },
      { id: 'currency', label: 'العملة', icon: 'CreditCard', description: 'عملات الوطن العربي + دولار + يورو', type: 'select' },
      { id: 'fontSize', label: 'حجم الخط', icon: 'Type', description: 'صغير / متوسط / كبير', type: 'select' },
    ],
  },
  {
    title: 'الإشعارات',
    items: [
      { id: 'pushNotifications', label: 'الإشعارات الفورية', icon: 'Bell', description: 'تلقي إشعارات فورية', type: 'toggle' },
      { id: 'emailNotifications', label: 'إشعارات البريد', icon: 'Mail', description: 'تلقي إشعارات عبر البريد', type: 'toggle' },
      { id: 'smsNotifications', label: 'إشعارات الرسائل', icon: 'MessageSquare', description: 'تلقي إشعارات عبر SMS', type: 'toggle' },
      { id: 'bookingReminders', label: 'تذكير المواعيد', icon: 'Calendar', description: 'تذكير قبل الموعد بساعة', type: 'toggle' },
      { id: 'promotions', label: 'العروض والتخفيضات', icon: 'Percent', description: 'تلقي العروض الخاصة', type: 'toggle' },
      { id: 'forumReplies', label: 'ردود المنتدى', icon: 'MessageCircle', description: 'إشعار عند الرد على منشوراتك', type: 'toggle' },
      { id: 'competitionUpdates', label: 'تحديثات المسابقات', icon: 'Trophy', description: 'إشعارات المسابقات والنتائج', type: 'toggle' },
      { id: 'newFollowers', label: 'متابعين جدد', icon: 'UserPlus', description: 'إشعار عند متابعة جديدة', type: 'toggle' },
    ],
  },
  {
    title: 'الخصوصية',
    items: [
      { id: 'profileVisible', label: 'إظهار البروفايل', icon: 'Eye', description: 'السماح للآخرين برؤية بروفايلك', type: 'toggle' },
      { id: 'showLocation', label: 'إظهار الموقع', icon: 'MapPin', description: 'مشاركة موقعك مع الحلاقين', type: 'toggle' },
      { id: 'showBookings', label: 'إظهار الحجوزات', icon: 'Calendar', description: 'عرض سجل حجوزاتك', type: 'toggle' },
      { id: 'allowMessages', label: 'الرسائل الواردة', icon: 'MessageSquare', description: 'من يمكنه مراسلتك', type: 'select' },
      { id: 'blockList', label: 'الحظر', icon: 'Ban', description: 'إدارة قائمة الحظر', type: 'link' },
    ],
  },
  {
    title: 'الحساب',
    items: [
      { id: 'editProfile', label: 'تعديل البروفايل', icon: 'User', description: 'تحديث المعلومات الشخصية', type: 'link' },
      { id: 'services', label: 'إدارة الخدمات', icon: 'Scissors', description: 'إضافة وتعديل الخدمات', type: 'link' },
      { id: 'idVerification', label: 'توثيق الهوية', icon: 'Shield', description: 'التحقق من هويتك بالبطاقة', type: 'link' },
      { id: 'changePassword', label: 'تغيير كلمة المرور', icon: 'Lock', description: 'تحديث كلمة المرور', type: 'link' },
      { id: 'twoFactor', label: 'المصادقة الثنائية', icon: 'Smartphone', description: 'تفعيل 2FA', type: 'toggle' },
      { id: 'linkedAccounts', label: 'الحسابات المرتبطة', icon: 'Link', description: 'ربط بحسابات التواصل', type: 'link' },
      { id: 'subscription', label: 'الاشتراك', icon: 'Crown', description: 'متوقف عند الإطلاق — خطط مدفوعة لاحقاً', type: 'link' },
      { id: 'paymentMethods', label: 'طرق الدفع', icon: 'CreditCard', description: 'نقدي متاح · بطاقة/CCP متوقف', type: 'link' },
      { id: 'baridiMob', label: 'ربط بريدي موب', icon: 'Wallet', description: 'متوقف', type: 'link' },
    ],
  },
  {
    title: 'الدعم',
    items: [
      { id: 'helpCenter', label: 'مركز المساعدة', icon: 'HelpCircle', description: 'أسئلة شائعة ودليل الاستخدام', type: 'link' },
      { id: 'contactUs', label: 'اتصل بنا', icon: 'Phone', description: 'التواصل مع فريق الدعم', type: 'link' },
      { id: 'reportBug', label: 'الإبلاغ عن مشكلة', icon: 'Bug', description: 'أبلغنا عن أي خطأ', type: 'link' },
      { id: 'featureRequest', label: 'اقتراح ميزة', icon: 'Lightbulb', description: 'شاركنا أفكارك', type: 'link' },
    ],
  },
  {
    title: 'حول',
    items: [
      { id: 'aboutApp', label: 'عن التطبيق', icon: 'Info', description: 'Hallaqi v12 — العناية الشخصية الموثوقة', type: 'link' },
      { id: 'privacyPolicy', label: 'سياسة الخصوصية', icon: 'FileText', description: 'قراءة سياسة الخصوصية', type: 'link' },
      { id: 'termsOfService', label: 'شروط الاستخدام', icon: 'FileText', description: 'قراءة الشروط والأحكام', type: 'link' },
      { id: 'licenses', label: 'التراخيص', icon: 'FileCode', description: 'تراخيص مفتوحة المصدر', type: 'link' },
    ],
  },
  {
    title: 'خطر',
    items: [
      { id: 'clearCache', label: 'مسح الذاكرة المؤقتة', icon: 'Trash2', description: 'مسح البيانات المؤقتة', type: 'action' },
      { id: 'exportData', label: 'تصدير البيانات', icon: 'Download', description: 'تحميل نسخة من بياناتك', type: 'action' },
      { id: 'deleteAccount', label: 'حذف الحساب', icon: 'AlertTriangle', description: 'حذف الحساب نهائياً', type: 'danger' },
      { id: 'logout', label: 'تسجيل الخروج', icon: 'LogOut', description: 'خروج آمن من التطبيق', type: 'danger' },
    ],
  },
] as const;

export const futureFeatures = [
  { id: 'ff1', name: 'AI Virtual Try-On', description: 'تجربة القصات افتراضياً بالذكاء الاصطناعي', category: 'AI', icon: 'ScanFace', eta: 'Q3 2025' },
  { id: 'ff2', name: 'Video Consultations', description: 'استشارات فيديو مباشرة مع الحلاقين', category: 'Communication', icon: 'Video', eta: 'Q3 2025' },
  { id: 'ff3', name: 'AR Hair Color Preview', description: 'معاينة لون الصبغة بالواقع المعزز', category: 'AI', icon: 'Palette', eta: 'Q4 2025' },
  { id: 'ff4', name: 'Barber Marketplace', description: 'متجر لبيع منتجات العناية بالشعر', category: 'E-commerce', icon: 'ShoppingBag', eta: 'Q4 2025' },
  { id: 'ff5', name: 'Loyalty Program', description: 'نظام نقاط ولاء متكامل', category: 'Rewards', icon: 'Gift', eta: 'Q3 2025' },
  { id: 'ff6', name: 'Group Bookings', description: 'حجوزات جماعية للمناسبات', category: 'Booking', icon: 'Users', eta: 'Q4 2025' },
  { id: 'ff7', name: 'Barber Academy', description: 'دورات تعليمية للحلاقين', category: 'Education', icon: 'GraduationCap', eta: 'Q1 2026' },
  { id: 'ff8', name: 'Live Streaming', description: 'بث مباشر لجلسات الحلاقة', category: 'Social', icon: 'Radio', eta: 'Q1 2026' },
  { id: 'ff9', name: 'Smart Scheduling', description: 'جدولة ذكية بالذكاء الاصطناعي', category: 'AI', icon: 'Brain', eta: 'Q1 2026' },
  { id: 'ff10', name: 'Barber Analytics Dashboard', description: 'لوحة تحليلات متقدمة للحلاقين', category: 'Analytics', icon: 'BarChart3', eta: 'Q2 2026' },
  { id: 'ff11', name: 'Multi-City Expansion', description: 'التوسع لجميع مدن الجزائر', category: 'Growth', icon: 'Map', eta: 'Q2 2026' },
  { id: 'ff12', name: 'Voice Commands', description: 'التحكم بالتطبيق بالأوامر الصوتية', category: 'AI', icon: 'Mic', eta: 'Q2 2026' },
];
