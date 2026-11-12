import { getDb } from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { RangePill } from '@/components/tasks/RangePill';
import { TasksView } from '@/components/tasks/TasksView';
import { linkedTask, resolveRange } from '@/lib/tasks-metrics';
import { getAppearance } from '@/lib/appearance-server';
import { treeFor } from '@/lib/appearance';
import { buildAgentDirectory } from '@/lib/agent-directory';
import { TasksG } from '@/components/tasks/TasksG';
import { loadMonday } from '@/lib/connectors/monday';
import { LiveMissing, MondayTasksPanel } from '@/components/live/LivePanels';

export const dynamic = 'force-dynamic';

/**
 * Tasks — the overhaul from docs/TASKS-REDESIGN.md. The range lives in the
 * URL and is resolved here, so every metric on the page is computed against
 * one window rather than each panel choosing its own.
 */
async function TasksPage(query?: { searchParams?: { range?: string; task?: string } }): Promise<React.ReactNode>;
async function TasksPage(query: { searchParams?: Promise<{ range?: string; task?: string }> }): Promise<React.ReactNode>;
async function TasksPage(query?: { searchParams?: { range?: string; task?: string } | Promise<{ range?: string; task?: string }> }): Promise<React.ReactNode> {
  const searchParams = await query?.searchParams;
  const db = getDb();
  // `props?` because the smoke test renders every page with no arguments at
  // all; a default parameter here would fail Next's generated PageProps.
  const range = resolveRange(searchParams?.range);
  const tasks = db.agentTasks.all();
  // ?task=<id> (Home's Needs you, the composer): open the board on that task
  const linked = linkedTask(tasks, searchParams?.task);
  // a year of runs covers the widest range the pill offers
  const runs = db.agentRuns.recent(5000);
  const monday = await loadMonday().catch(() => null);

  // GladOS tree (glados-ui SPEC S04 §4.3, X5): same data, kit presentation.
  const board = (
    <>
      {monday?.tasks && <MondayTasksPanel board={monday.tasks} />}
      {monday && monday.missing.length > 0 && <LiveMissing what="לוח המשימות לא מחובר." />}
    </>
  );
  if (treeFor(await getAppearance(), '/tasks') === 'glados') {
    return (
      <div>
        {board}
        <TasksG tasks={tasks} runs={runs} dir={buildAgentDirectory(db)} rangeId={range.id} rangeDays={range.days} rangeLabel={range.label} now={Date.now()} linked={linked} />
      </div>
    );
  }

  return (
    <div>
      {board}
      <PageHeader
        eyebrow="עבודת הסוכנים בלוח"
        title="משימות"
        right={<RangePill range={range.id} />}
      />
      <TasksView
        tasks={tasks}
        runs={runs}
        agents={db.agents.all()}
        departments={db.departments.all()}
        rangeDays={range.days}
        rangeLabel={range.label}
        now={Date.now()}
        linked={linked}
      />
    </div>
  );
}
export default TasksPage;
