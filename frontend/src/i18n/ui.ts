/**
 * Interface chrome strings, EN + AR.
 *
 * Editorial content (titles, descriptions, header/footer copy, feed metadata)
 * lives in Sanity — see `podcastSettings`. This file only covers the fixed
 * furniture of the interface, which has no reason to be editable.
 *
 * Both languages are always rendered into the markup and toggled with the
 * `.lang-ar` class on <html>, exactly like forms.sudanartarchive.com. That
 * keeps the switch instant and avoids i18n routing.
 */
export const ui = {
  episodes: { en: 'Episodes', ar: 'الحلقات' },
  allEpisodes: { en: 'All episodes', ar: 'كل الحلقات' },
  season: { en: 'Season', ar: 'الموسم' },
  episode: { en: 'Episode', ar: 'حلقة' },
  explicit: { en: 'Explicit', ar: 'محتوى صريح' },
  comingSoon: { en: 'Episodes coming soon.', ar: 'الحلقات قريباً.' },
  audioComingSoon: { en: 'Audio coming soon.', ar: 'الصوت قريباً.' },
  playEpisode: { en: 'Play episode', ar: 'تشغيل الحلقة' },
  pauseEpisode: { en: 'Pause episode', ar: 'إيقاف الحلقة' },
  seek: { en: 'Seek', ar: 'تقديم' },
  notFoundTitle: { en: 'Page Not Found', ar: 'الصفحة غير موجودة' },
  notFoundBody: {
    en: "The page you're looking for doesn't exist or may have been moved.",
    ar: 'الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.',
  },
  backToEpisodes: { en: '← Back to Episodes', ar: 'العودة إلى الحلقات →' },
  mainNav: { en: 'Main navigation', ar: 'التنقل الرئيسي' },
  socialLinks: { en: 'Social links', ar: 'روابط التواصل' },
  allRightsReserved: { en: 'All rights reserved', ar: 'جميع الحقوق محفوظة' },
  hoursShort: { en: 'hr', ar: 'س' },
  minutesShort: { en: 'min', ar: 'د' },
  secondsShort: { en: 'sec', ar: 'ث' },
} as const;
