/** Ready-to-send chat templates for barbers. */
export interface MessageTemplate {
  id: string;
  label: string;
  body: string;
}

export const BARBER_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'confirm',
    label: 'تأكيد الحجز',
    body: 'مرحباً، تم تأكيد حجزك. ننتظرك في الوقت المحدد ✂️',
  },
  {
    id: 'delay',
    label: 'تأخير 10 دقائق',
    body: 'نعتذر، عندنا تأخير بسيط حوالي 10 دقائق. شكراً على تفهمك.',
  },
  {
    id: 'ready',
    label: 'جاهز الآن',
    body: 'مرحباً، صرت جاهز. تقدر تجي دابا إن أمكن.',
  },
  {
    id: 'thanks',
    label: 'شكر بعد الزيارة',
    body: 'شكراً على زيارتك! نتمنى تكون راضي على الخدمة. تقييمك يهمنا 🙏',
  },
  {
    id: 'followup',
    label: 'تذكير بعد أسبوعين',
    body: 'مرحباً، مرّ وقت من آخر قصة. إذا حاب تحجز موعد جديد راني جاهز.',
  },
  {
    id: 'closed',
    label: 'إغلاق مؤقت',
    body: 'نبلغك أن الصالون مغلق مؤقتاً اليوم. نقدر نعيد جدولة موعدك بسهولة.',
  },
];

export function fillTemplate(body: string, clientName?: string | null): string {
  if (!clientName) return body;
  return `أهلاً ${clientName}، ${body}`;
}
