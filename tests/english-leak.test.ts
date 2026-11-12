import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ALLOW = new Set(["API","AdPilot","Attio","CLI","CSV","CalDAV","English","FounderOS","GitHub","Gmail","Google","Holdings","IMAP","JSON","MRK","Monday","Notion","Postgres","SQLite","SUMIT","Slack","Stripe","Superset","Trakyo","URL","WhatsApp","Adscout","Apify","Arcads","Beehiiv","Claude","Ctrl","Elements","Flash","Foreplay","GoHighLevel","Higgsfield","Instagram","MIOSA","Meta","Omni","ROAS","Soul","UGC","Wise","Zernio","Zoho"]);
const ATTR = /(?:aria-label|title|placeholder|alt)=(?:"([^"]*)"|'([^']*)')/g;
const TEXT = />([^<>{}\n]*)</g;
const WORD = /[A-Za-z][A-Za-z0-9]{3,}/g;

function leaks(src: string): boolean {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const chunks = [
    ...[...clean.matchAll(ATTR)].map((m) => m[1] ?? m[2] ?? ''),
    ...[...clean.matchAll(TEXT)].map((m) => m[1] ?? ''),
  ];
  return chunks.some((chunk) => [...chunk.matchAll(WORD)].some((m) => m[0].length >= 4 && !ALLOW.has(m[0])));
}

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else if (name.endsWith('.tsx')) out.push(rel);
  }
  return out;
}

/** Files that still show English in visible JSX. Remove a path when that file is translated. */
const REMAINING = [
  "app/compute/page.tsx",
  "app/dev/g-kit/KitGallery.tsx",
  "app/dev/l-kit/LegacyKitSpecimen.tsx",
  "app/dev/l-kit/page.tsx",
  "app/integrations/page.tsx",
  "app/lead-magnets/page.tsx",
  "app/roadmap/page.tsx",
  "app/setup/page.tsx",
  "app/skills/NewSkillIntake.tsx",
  "app/skills/page.tsx",
  "components/AgentChat.tsx",
  "components/AgentPanel.tsx",
  "components/AgentWorkPanel.tsx",
  "components/ApiKeys.tsx",
  "components/AppearancePicker.tsx",
  "components/BusinessIncomeChart.tsx",
  "components/CommandPalette.tsx",
  "components/ConductorCard.tsx",
  "components/ConductorChat.tsx",
  "components/ConductorPanel.tsx",
  "components/ConnectFlow.tsx",
  "components/GraphDirectory.tsx",
  "components/Home6Chart.tsx",
  "components/Home6Console.tsx",
  "components/PillarRadar.tsx",
  "components/RouteSkeleton.tsx",
  "components/SharePie.tsx",
  "components/Sidebar.tsx",
  "components/SkillHierarchy.tsx",
  "components/SkillsExplorer.tsx",
  "components/SkillsGrid.tsx",
  "components/SparkIcon.tsx",
  "components/StatementUploader.tsx",
  "components/ThemePicker.tsx",
  "components/Topbar.tsx",
  "components/WorkflowCanvas.tsx",
  "components/blueprint/AskBar.tsx",
  "components/blueprint/HierarchyCanvas.tsx",
  "components/blueprint/HierarchyInspector.tsx",
  "components/blueprint/HierarchySearch.tsx",
  "components/blueprint/HierarchyWorkspace.tsx",
  "components/brand-deals/DealBoard.tsx",
  "components/brand-deals/DealBoardG.tsx",
  "components/chats/ChatsClassic.tsx",
  "components/chats/ChatsG.tsx",
  "components/chats/ChatsLegacy.tsx",
  "components/comms-fo/CommsFoClassic.tsx",
  "components/comms-fo/CommsFoG.tsx",
  "components/compute/ComputeConsole.tsx",
  "components/compute/ComputeG.tsx",
  "components/fo-classic/kit.tsx",
  "components/g/Controls.tsx",
  "components/g/GDiff.tsx",
  "components/g/GDotMatrix.tsx",
  "components/g/GStackedBar.tsx",
  "components/g/GTimelineStrip.tsx",
  "components/g/Numbers.tsx",
  "components/g/States.tsx",
  "components/g/XYChart.tsx",
  "components/g/viz-shared.tsx",
  "components/integrations/ApiKeysG.tsx",
  "components/integrations/IntegrationBrowser.tsx",
  "components/lead-magnets/LeadMagnetsClassic.tsx",
  "components/lead-magnets/LeadMagnetsG.tsx",
  "components/lead-magnets/LeadMagnetsLegacy.tsx",
  "components/legacy/AppearanceLegacy.tsx",
  "components/legacy/Charts.tsx",
  "components/legacy/Dialog.tsx",
  "components/legacy/Numbers.tsx",
  "components/legacy/Shell.tsx",
  "components/legacy/States.tsx",
  "components/legacy/Surfaces.tsx",
  "components/login/LoginG.tsx",
  "components/login/LoginL.tsx",
  "components/roadmap/RoadmapG.tsx",
  "components/setup/SetupG.tsx",
  "components/skills/SkillsG.tsx",
  "components/tasks/Board.tsx",
  "components/tasks/TimeGrid.tsx",
  "components/trading/TradingClassic.tsx",
  "components/trading/TradingError.tsx",
  "components/trading/TradingG.tsx",
  "components/trading/TradingLegacy.tsx",
  "components/ui/Toast.tsx",
  "components/usage/UsageClassic.tsx",
  "components/usage/UsageG.tsx",
  "components/usage/UsageLegacy.tsx",
  "components/wizard/Conversation.tsx",
  "components/wizard/CreateAgentModal.tsx",
  "components/wizard/CrewPanel.tsx",
  "components/wizard/DeleteProjectConfirm.tsx",
  "components/wizard/SessionsTab.tsx",
  "components/wizard/WizardG.tsx",
  "components/wizard/WizardHeader.tsx",
  "components/wizard/WizardL.tsx"
] as const;

describe('English leak', () => {
  test('app/ and components/ JSX does not add a new English file', () => {
    const found = [...walk(path.join(process.cwd(), 'app'), 'app'), ...walk(path.join(process.cwd(), 'components'), 'components')]
      .filter((rel) => leaks(readFileSync(path.join(process.cwd(), rel), 'utf8')))
      .sort();
    expect(found).toEqual([...REMAINING]);
  });
});
