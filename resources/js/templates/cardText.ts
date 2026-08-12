import { useLang } from '../context/LangContext';

/**
 * Card-face copy, keyed by the Malay source string.
 *
 * The 20 templates were written with their labels inline, which is what makes
 * them readable as designs. Rather than gut every file into key lookups, the
 * Malay stays in place as the key and this table supplies the other languages —
 * so a template still reads `title={t('Atur Cara')}` and a missing entry simply
 * falls through to Malay instead of rendering blank.
 *
 * Only chrome is here. Names, the couple's own words, venue names and anything
 * else the host typed are never translated.
 */
const CARD_TEXT: Record<string, { en: string; zh: string }> = {
    // Cover
    'Walimatulurus': { en: 'The Wedding Of', zh: '婚宴' },
    'Save The Date': { en: 'Save the Date', zh: '敬请预留' },
    'Skrol': { en: 'Scroll', zh: '向下滑动' },
    'Ketik untuk membuka jemputan': { en: 'Tap to open the invitation', zh: '点击打开请柬' },

    // Couple
    'Pasangan Bahagia': { en: 'The Happy Couple', zh: '新婚佳偶' },
    'Pengantin': { en: 'The Couple', zh: '新人' },

    // Programme
    'Atur Cara': { en: 'Programme', zh: '婚礼流程' },
    'Rentak Majlis': { en: 'Order of Events', zh: '仪式流程' },
    'Tertib Majlis': { en: 'Order of Events', zh: '仪式流程' },

    // Venue
    'Lokasi Majlis': { en: 'Venue', zh: '婚宴地点' },
    'Lokasi': { en: 'Venue', zh: '地点' },
    'Tempat Berlangsung': { en: 'Where It Happens', zh: '举行地点' },
    'Tarikh Majlis': { en: 'Wedding Date', zh: '婚礼日期' },

    // Contact
    'Hubungi': { en: 'Contact', zh: '联系我们' },
    'Hubungi Kami': { en: 'Contact Us', zh: '联系我们' },
    'Sebarang Pertanyaan': { en: 'For Any Enquiries', zh: '如有疑问' },

    // Gallery
    'Galeri Memori': { en: 'Photo Gallery', zh: '婚纱相册' },
    'Galeri': { en: 'Gallery', zh: '相册' },
    'Kenangan': { en: 'Memories', zh: '美好回忆' },

    // Wishes
    'Ucapan Kasih': { en: 'Wishes & Prayers', zh: '祝福留言' },
    'Ucapan & Doa': { en: 'Wishes & Prayers', zh: '祝福与祈愿' },
    'Ucapan': { en: 'Wishes', zh: '祝福' },
    'Doa & Restu': { en: 'Blessings', zh: '祝福与祈祷' },

    // Gifts
    'Senarai Hadiah': { en: 'Gift Registry', zh: '礼物清单' },
    'Tanda Kasih': { en: 'A Token of Love', zh: '一点心意' },
    'Tanda Ingatan': { en: 'A Keepsake', zh: '纪念心意' },
    'Salam Kasih': { en: 'Wedding Gift', zh: '礼金' },
    'Salam Kaut': { en: 'Wedding Gift', zh: '礼金' },

    // RSVP
    'RSVP Kehadiran': { en: 'RSVP', zh: '出席回复' },
    'Khabarkan Kehadiran': { en: 'Let Us Know', zh: '告知出席' },
    'Kesahihan Kehadiran': { en: 'Confirm Attendance', zh: '确认出席' },
    'RSVP': { en: 'RSVP', zh: '出席回复' },

    // Countdown
    'Menuju Hari Bahagia': { en: 'Counting Down', zh: '倒计时' },
    'Kira Detik Bahagia': { en: 'Countdown', zh: '幸福倒计时' },
    'Kira Detik': { en: 'Countdown', zh: '倒计时' },
    'Menghitung Hari': { en: 'Counting the Days', zh: '倒数计时' },
    'Hari': { en: 'Days', zh: '天' },
    'Jam': { en: 'Hours', zh: '时' },
    'Minit': { en: 'Minutes', zh: '分' },
    'Saat': { en: 'Seconds', zh: '秒' },
};

export type CardT = (bm: string) => string;

/** Translator for card-face labels. Malay in, active language out. */
export function useCardText(): CardT {
    const { lang } = useLang();
    if (lang === 'bm') return (bm) => bm;
    return (bm) => CARD_TEXT[bm]?.[lang] ?? bm;
}
