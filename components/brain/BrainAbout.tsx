import { AboutButton } from '@/components/system-g/AboutButton';

/**
 * /brain "About this page" (S05 F05.3, F05.17): the Pipeline prose and the
 * Query path explainer, moved off the working surface word for word.
 */
export function BrainAbout({ storeShort }: { storeShort: string }) {
  return (
    <AboutButton>
      <h3>1 · מאגר מוח</h3>
      <p>
        <code>{storeShort}</code>
: plain <code>.md</code> קבצים, מקור האמת. <code>סנכרון מנוע</code> walks the git repo
        and pushes changed pages up.
      </p>
      <h3>2 · מנוע שורת הפקודה</h3>
      <p>חיתוך, הטמעה, ניתוב: המנוע בין הדיסק למסד. הבריאות והבדיקות נפתחות מכרטיס הרופא.</p>
      <h3>3 · מסד וקטורים</h3>
      <p>
        Each page is split into chunks; every chunk gets a ZeroEntropy embedding stored in a <code>וקטור</code> column.
        Postgres holds both the text (tsvector) and the vectors, so one database answers keyword and semantic queries.
      </p>
      <p>
        Free tier pauses on idle — when hybrid queries fail, unpause from the Supabase dashboard. The brain-store on disk
        keeps working regardless.
      </p>
      <h3>מסלול שאילתה</h3>
      <p>
        What happens when an agent calls <code>שאילתת מנוע</code> — hybrid retrieval with an honest fallback.
      </p>
      <ol>
        <li>שאלה: שאילתה בשפה טבעית ממך או מריצת סוכן.</li>
        <li>הרחבת שאילתה: המנוע משכתב את השאלה לגרסאות חיפוש.</li>
        <li>חיפוש מילים: התאמת טקסט מלא על קטעים.</li>
        <li>חיפוש וקטורי: שכנים קרובים על ההטמעות.</li>
        <li>מיזוג דירוג: שתי הרשימות מתמזגות לדירוג אחד.</li>
        <li>קטעים מדורגים: העמודים העליונים עם קטע, חוזרים לסוכן.</li>
      </ol>
      <p>
        Fallback, local grep: if Supabase is paused or unreachable, the OS greps the markdown brain-store directly — fewer
        smarts, zero downtime.
      </p>
    </AboutButton>
  );
}
