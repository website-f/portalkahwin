import { useLang } from '../context/LangContext';

export function LangToggle({ light }: { light?: boolean }) {
    const { lang, setLang } = useLang();
    return (
        <div className={`lang-toggle${light ? ' lang-toggle--light' : ''}`} role="group" aria-label="Language">
            <button className={lang === 'bm' ? 'on' : ''} onClick={() => setLang('bm')} aria-pressed={lang === 'bm'}>BM</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
        </div>
    );
}
