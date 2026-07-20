'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────
type TriggerType =
  | 'job_completed'
  | 'lead_created'
  | 'shift_started'
  | 'insurance_expiring'
  | 'maintenance_due'
  | 'invoice_overdue'
  | 'auction_job'
  | 'weather_alert'
  | 'customer_reorder'
  | 'payment_received';

type ActionType =
  | 'create_invoice'
  | 'send_survey'
  | 'notify_dispatchers'
  | 'auto_assign'
  | 'send_message'
  | 'send_reminder'
  | 'create_task'
  | 'send_payment_reminder'
  | 'auto_accept'
  | 'pre_position'
  | 'apply_discount'
  | 'send_email'
  | 'send_sms';

type ConditionField = 'driver' | 'amount' | 'city' | 'priority' | 'customer_type' | 'distance' | 'time_of_day';
type ConditionOperator = 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_equals';

interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  triggerLabel: string;
  conditions: Condition[];
  actions: { type: ActionType; label: string; detail: string }[];
  enabled: boolean;
  runsToday: number;
  totalRuns: number;
  createdAt: string;
}

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface TaskQueueItem {
  id: string;
  ruleName: string;
  action: string;
  status: TaskStatus;
  createdAt: string;
  retryCount: number;
}

// ─── Seed data ───────────────────────────────────────────────────
const initialRules: AutomationRule[] = [
  {
    id: 'r1', name: 'Auto-Invoice on Completion', description: 'When a job is marked completed, automatically create an invoice and send it to the customer.',
    trigger: 'job_completed', triggerLabel: 'Job Completed',
    conditions: [], actions: [{ type: 'create_invoice', label: 'Create Invoice', detail: 'Generate from job line items' }, { type: 'send_email', label: 'Send to Customer', detail: 'Email invoice PDF' }],
    enabled: true, runsToday: 14, totalRuns: 1283, createdAt: '2026-01-15',
  },
  {
    id: 'r2', name: 'Satisfaction Survey (24h)', description: 'Wait 24 hours after job completion, then send a satisfaction survey to the customer.',
    trigger: 'job_completed', triggerLabel: 'Job Completed',
    conditions: [], actions: [{ type: 'send_survey', label: 'Send Survey', detail: 'Wait 24h → email survey link' }],
    enabled: true, runsToday: 11, totalRuns: 987, createdAt: '2026-01-20',
  },
  {
    id: 'r3', name: 'Dispatcher Alert + Auto-Assign', description: 'When a new lead is created, notify all dispatchers. If only one driver is available, auto-assign.',
    trigger: 'lead_created', triggerLabel: 'New Lead Created',
    conditions: [], actions: [{ type: 'notify_dispatchers', label: 'Notify Dispatchers', detail: 'Push + SMS to all on-duty dispatchers' }, { type: 'auto_assign', label: 'Auto-Assign', detail: 'Assign if 1 driver available' }],
    enabled: true, runsToday: 8, totalRuns: 654, createdAt: '2026-02-01',
  },
  {
    id: 'r4', name: 'Driver Online Notification', description: 'When a driver starts their shift, notify dispatch with "Driver online" status.',
    trigger: 'shift_started', triggerLabel: 'Shift Started',
    conditions: [], actions: [{ type: 'send_message', label: 'Notify Dispatch', detail: 'Send "Driver online" to dispatch channel' }],
    enabled: true, runsToday: 6, totalRuns: 430, createdAt: '2026-02-10',
  },
  {
    id: 'r5', name: 'Insurance Expiry Reminder', description: 'Send a reminder to the company when insurance expires in 30 days.',
    trigger: 'insurance_expiring', triggerLabel: 'Insurance Expiring (30d)',
    conditions: [], actions: [{ type: 'send_reminder', label: 'Send Reminder', detail: 'Email company admin + create renewal task' }],
    enabled: false, runsToday: 0, totalRuns: 42, createdAt: '2026-02-15',
  },
  {
    id: 'r6', name: 'Maintenance Due Alert', description: 'When vehicle maintenance is due, create a task and notify the fleet manager.',
    trigger: 'maintenance_due', triggerLabel: 'Maintenance Due',
    conditions: [], actions: [{ type: 'create_task', label: 'Create Task', detail: 'Assign to fleet manager with vehicle details' }, { type: 'send_reminder', label: 'Notify Fleet Mgr', detail: 'Push notification' }],
    enabled: true, runsToday: 2, totalRuns: 198, createdAt: '2026-03-01',
  },
  {
    id: 'r7', name: 'Overdue Invoice Reminder', description: 'When an invoice is overdue by 7 days, send a payment reminder to the customer.',
    trigger: 'invoice_overdue', triggerLabel: 'Invoice Overdue (7d)',
    conditions: [], actions: [{ type: 'send_payment_reminder', label: 'Payment Reminder', detail: 'Email + SMS with payment link' }],
    enabled: true, runsToday: 5, totalRuns: 321, createdAt: '2026-03-10',
  },
  {
    id: 'r8', name: 'Auto-Accept Auction Jobs', description: 'Automatically accept jobs from auctions if the pickup is within the service area.',
    trigger: 'auction_job', triggerLabel: 'New Auction Job',
    conditions: [{ field: 'distance', operator: 'less_than', value: '25' }], actions: [{ type: 'auto_accept', label: 'Auto-Accept', detail: 'Accept if within 25 mi service radius' }],
    enabled: false, runsToday: 0, totalRuns: 87, createdAt: '2026-03-15',
  },
  {
    id: 'r9', name: 'Weather Alert Protocol', description: 'When a severe weather alert is issued, pre-position trucks and notify all drivers.',
    trigger: 'weather_alert', triggerLabel: 'Weather Alert',
    conditions: [], actions: [{ type: 'pre_position', label: 'Pre-Position Trucks', detail: 'Move to strategic staging areas' }, { type: 'send_message', label: 'Notify All Drivers', detail: 'Push + SMS emergency broadcast' }],
    enabled: true, runsToday: 0, totalRuns: 23, createdAt: '2026-04-01',
  },
  {
    id: 'r10', name: 'Loyalty Discount', description: 'When a returning customer places a new order, automatically apply a loyalty discount.',
    trigger: 'customer_reorder', triggerLabel: 'Customer Reorder',
    conditions: [{ field: 'customer_type', operator: 'equals', value: 'returning' }], actions: [{ type: 'apply_discount', label: 'Apply Discount', detail: '10% loyalty discount on total' }],
    enabled: true, runsToday: 3, totalRuns: 156, createdAt: '2026-04-10',
  },
];

const initialTaskQueue: TaskQueueItem[] = [
  { id: 't1', ruleName: 'Auto-Invoice on Completion', action: 'Create Invoice → #INV-4821', status: 'completed', createdAt: '2 min ago', retryCount: 0 },
  { id: 't2', ruleName: 'Dispatcher Alert + Auto-Assign', action: 'Notify Dispatchers → Lead #L-903', status: 'running', createdAt: '5 min ago', retryCount: 0 },
  { id: 't3', ruleName: 'Satisfaction Survey (24h)', action: 'Send Survey → Job #J-1187', status: 'pending', createdAt: '12 min ago', retryCount: 0 },
  { id: 't4', ruleName: 'Overdue Invoice Reminder', action: 'Payment Reminder → #INV-4790', status: 'failed', createdAt: '18 min ago', retryCount: 2 },
  { id: 't5', ruleName: 'Maintenance Due Alert', action: 'Create Task → Truck #T-07', status: 'completed', createdAt: '25 min ago', retryCount: 0 },
  { id: 't6', ruleName: 'Loyalty Discount', action: 'Apply 10% → Order #O-5523', status: 'completed', createdAt: '30 min ago', retryCount: 0 },
  { id: 't7', ruleName: 'Auto-Invoice on Completion', action: 'Create Invoice → #INV-4822', status: 'pending', createdAt: '32 min ago', retryCount: 0 },
  { id: 't8', ruleName: 'Driver Online Notification', action: 'Notify Dispatch → Driver Mike R.', status: 'completed', createdAt: '45 min ago', retryCount: 0 },
];

// ─── Helpers ─────────────────────────────────────────────────────
const statusColors: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  running: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

const triggerIcons: Record<TriggerType, string> = {
  job_completed: '✅',
  lead_created: '📋',
  shift_started: '🔄',
  insurance_expiring: '🛡️',
  maintenance_due: '🔧',
  invoice_overdue: '💰',
  auction_job: '🔨',
  weather_alert: '⛈️',
  customer_reorder: '🔁',
  payment_received: '💳',
};

const triggerOptions: { value: TriggerType; label: string }[] = [
  { value: 'job_completed', label: 'Job Status Change' },
  { value: 'lead_created', label: 'New Lead Created' },
  { value: 'shift_started', label: 'Shift Started / Ended' },
  { value: 'insurance_expiring', label: 'Insurance Expiring' },
  { value: 'maintenance_due', label: 'Vehicle Maintenance Due' },
  { value: 'invoice_overdue', label: 'Invoice Overdue' },
  { value: 'auction_job', label: 'New Auction Job' },
  { value: 'weather_alert', label: 'Weather Alert' },
  { value: 'customer_reorder', label: 'Customer Reorder' },
  { value: 'payment_received', label: 'Payment Received' },
];

const conditionFieldOptions: { value: ConditionField; label: string }[] = [
  { value: 'driver', label: 'Driver' },
  { value: 'amount', label: 'Amount' },
  { value: 'city', label: 'City' },
  { value: 'priority', label: 'Priority' },
  { value: 'customer_type', label: 'Customer Type' },
  { value: 'distance', label: 'Distance (mi)' },
  { value: 'time_of_day', label: 'Time of Day' },
];

const operatorOptions: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'contains', label: 'contains' },
];

const actionOptions: { value: ActionType; label: string }[] = [
  { value: 'create_invoice', label: 'Create Invoice' },
  { value: 'send_survey', label: 'Send Satisfaction Survey' },
  { value: 'notify_dispatchers', label: 'Notify Dispatchers' },
  { value: 'auto_assign', label: 'Auto-Assign Driver' },
  { value: 'send_message', label: 'Send Message' },
  { value: 'send_reminder', label: 'Send Reminder' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_payment_reminder', label: 'Send Payment Reminder' },
  { value: 'auto_accept', label: 'Auto-Accept Job' },
  { value: 'pre_position', label: 'Pre-Position Trucks' },
  { value: 'apply_discount', label: 'Apply Loyalty Discount' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_sms', label: 'Send SMS' },
];

// ─── Sub-components (outside render) ────────────────────────────
const Badge = ({ status }: { status: TaskStatus }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status].bg} ${statusColors[status].text}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status].dot}`} />
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-1">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <span className="text-3xl font-semibold text-gray-900 tracking-tight">{value}</span>
    {sub && <span className="text-xs text-gray-400">{sub}</span>}
  </div>
);

let ruleCounter = 0;

// ─── Component ───────────────────────────────────────────────────
export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);
  const [taskQueue, setTaskQueue] = useState<TaskQueueItem[]>(initialTaskQueue);
  const [activeTab, setActiveTab] = useState<'rules' | 'create' | 'queue'>('rules');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newTrigger, setNewTrigger] = useState<TriggerType>('job_completed');
  const [newConditions, setNewConditions] = useState<Condition[]>([]);
  const [newActions, setNewActions] = useState<{ type: ActionType; detail: string }[]>([]);

  // Wizard draft action / condition
  const [draftCondition, setDraftCondition] = useState<Condition>({ field: 'driver', operator: 'equals', value: '' });
  const [draftAction, setDraftAction] = useState<ActionType>('send_email');
  const [draftActionDetail, setDraftActionDetail] = useState('');

  // Stats
  const totalRunsToday = rules.reduce((s, r) => s + r.runsToday, 0);
  const totalCompleted = taskQueue.filter(t => t.status === 'completed').length;
  const enabledCount = rules.filter(r => r.enabled).length;

  // ─── Handlers ────────────────────────────────────────────────
  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addCondition = () => {
    if (!draftCondition.value) return;
    setNewConditions(prev => [...prev, { ...draftCondition }]);
    setDraftCondition({ field: 'driver', operator: 'equals', value: '' });
  };

  const removeCondition = (idx: number) => {
    setNewConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const addAction = () => {
    if (!draftAction) return;
    setNewActions(prev => [...prev, { type: draftAction, detail: draftActionDetail || actionOptions.find(a => a.value === draftAction)?.label || '' }]);
    setDraftActionDetail('');
  };

  const removeAction = (idx: number) => {
    setNewActions(prev => prev.filter((_, i) => i !== idx));
  };

  const finishWizard = () => {
    if (!newRuleName.trim()) return;
    const rule: AutomationRule = {
      id: `r${++ruleCounter}`,
      name: newRuleName,
      description: newRuleDesc,
      trigger: newTrigger,
      triggerLabel: triggerOptions.find(t => t.value === newTrigger)?.label || newTrigger,
      conditions: newConditions,
      actions: newActions.map(a => ({ type: a.type, label: actionOptions.find(o => o.value === a.type)?.label || a.type, detail: a.detail })),
      enabled: true,
      runsToday: 0,
      totalRuns: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setRules(prev => [...prev, rule]);
    resetWizard();
    setActiveTab('rules');
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setNewRuleName('');
    setNewRuleDesc('');
    setNewTrigger('job_completed');
    setNewConditions([]);
    setNewActions([]);
    setDraftCondition({ field: 'driver', operator: 'equals', value: '' });
    setDraftAction('send_email');
    setDraftActionDetail('');
  };

  const retryTask = (id: string) => {
    setTaskQueue(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as TaskStatus, retryCount: t.retryCount + 1 } : t));
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Routine Automation</h1>
              <p className="text-sm text-gray-500 mt-1">Automate repetitive tasks so your team can focus on what matters.</p>
            </div>
            <button
              onClick={() => { setShowWizard(true); setActiveTab('create'); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              New Automation
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            <StatCard label="Automations Run Today" value={totalRunsToday} sub="Across all active rules" />
            <StatCard label="Active Rules" value={`${enabledCount} / ${rules.length}`} sub={`${rules.length - enabledCount} paused`} />
            <StatCard label="Tasks Completed" value={totalCompleted} sub="In current queue" />
            <StatCard label="Time Saved (est.)" value="6.2 hrs" sub="Based on avg. manual time" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mt-1">
          <nav className="flex gap-8 -mb-px">
            {([['rules', 'Automation Rules'], ['queue', 'Task Queue']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key || (activeTab === 'create' && key === 'rules')
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── RULES TAB ─────────────────────────────────────── */}
        {activeTab === 'rules' && !showWizard && (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{triggerIcons[rule.trigger]}</span>
                      <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
                      {!rule.enabled && (
                        <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Paused</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{rule.description}</p>

                    {/* Flow visualization */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium">
                        ⚡ {rule.triggerLabel}
                      </span>
                      {rule.conditions.length > 0 && rule.conditions.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md font-medium">
                          🔍 {c.field} {c.operator.replace('_', ' ')} {c.value}
                        </span>
                      ))}
                      {rule.actions.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md font-medium">
                            ⚙️ {a.label}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-400">Today</div>
                      <div className="text-sm font-semibold text-gray-700">{rule.runsToday}</div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${rule.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CREATE / WIZARD ─────────────────────────────── */}
        {activeTab === 'create' && showWizard && (
          <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center gap-3 mb-8">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    wizardStep >= s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>{s}</div>
                  {s < 4 && <div className={`flex-1 h-0.5 ${wizardStep > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-8 -mt-4">
              <span className="ml-10">Trigger</span>
              <span>Conditions</span>
              <span>Actions</span>
              <span className="mr-2">Review</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              {/* Step 1: Trigger */}
              {wizardStep === 1 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose a Trigger</h2>
                  <p className="text-sm text-gray-500 mb-5">What event should start this automation?</p>

                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                      <input
                        value={newRuleName}
                        onChange={e => setNewRuleName(e.target.value)}
                        placeholder="e.g. Auto-Invoice on Completion"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={newRuleDesc}
                        onChange={e => setNewRuleDesc(e.target.value)}
                        rows={2}
                        placeholder="Briefly describe what this automation does..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
                      <div className="grid grid-cols-2 gap-2">
                        {triggerOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setNewTrigger(opt.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm text-left transition-colors ${
                              newTrigger === opt.value
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <span>{triggerIcons[opt.value]}</span>
                            <span className="font-medium">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => newRuleName.trim() && setWizardStep(2)}
                      disabled={!newRuleName.trim()}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Conditions */}
              {wizardStep === 2 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Add Conditions</h2>
                  <p className="text-sm text-gray-500 mb-5">Optionally narrow down when this automation runs.</p>

                  {newConditions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {newConditions.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                          <span className="font-medium text-amber-800">{c.field}</span>
                          <span className="text-amber-600">{c.operator.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-amber-800">&ldquo;{c.value}&rdquo;</span>
                          <button onClick={() => removeCondition(i)} className="ml-auto text-amber-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Field</label>
                        <select
                          value={draftCondition.field}
                          onChange={e => setDraftCondition(p => ({ ...p, field: e.target.value as ConditionField }))}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {conditionFieldOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
                        <select
                          value={draftCondition.operator}
                          onChange={e => setDraftCondition(p => ({ ...p, operator: e.target.value as ConditionOperator }))}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {operatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                        <input
                          value={draftCondition.value}
                          onChange={e => setDraftCondition(p => ({ ...p, value: e.target.value }))}
                          placeholder="Value..."
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addCondition}
                      disabled={!draftCondition.value.trim()}
                      className="text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      + Add Condition
                    </button>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button onClick={() => setWizardStep(1)} className="px-4 py-2 text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors">Back</button>
                    <button onClick={() => setWizardStep(3)} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Continue</button>
                  </div>
                </div>
              )}

              {/* Step 3: Actions */}
              {wizardStep === 3 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose Actions</h2>
                  <p className="text-sm text-gray-500 mb-5">What should happen when the trigger fires?</p>

                  {newActions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {newActions.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                          <span className="text-green-500">⚙️</span>
                          <span className="font-medium text-green-800">{actionOptions.find(o => o.value === a.type)?.label}</span>
                          <span className="text-green-600">— {a.detail}</span>
                          <button onClick={() => removeAction(i)} className="ml-auto text-green-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
                        <select
                          value={draftAction}
                          onChange={e => setDraftAction(e.target.value as ActionType)}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Details</label>
                        <input
                          value={draftActionDetail}
                          onChange={e => setDraftActionDetail(e.target.value)}
                          placeholder="Additional details..."
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addAction}
                      className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                    >
                      + Add Action
                    </button>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button onClick={() => setWizardStep(2)} className="px-4 py-2 text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors">Back</button>
                    <button onClick={() => setWizardStep(4)} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Continue</button>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Activate */}
              {wizardStep === 4 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & Activate</h2>
                  <p className="text-sm text-gray-500 mb-5">Confirm your automation settings before activating.</p>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</div>
                      <div className="text-sm font-semibold text-gray-900">{newRuleName}</div>
                    </div>
                    {newRuleDesc && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</div>
                        <div className="text-sm text-gray-700">{newRuleDesc}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trigger</div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium">
                        ⚡ {triggerOptions.find(t => t.value === newTrigger)?.label}
                      </span>
                    </div>
                    {newConditions.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conditions</div>
                        <div className="flex flex-wrap gap-2">
                          {newConditions.map((c, i) => (
                            <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-sm font-medium">
                              {c.field} {c.operator.replace(/_/g, ' ')} &quot;{c.value}&quot;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Actions</div>
                      <div className="flex flex-col gap-2">
                        {newActions.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-green-500">⚙️</span>
                            <span className="font-medium text-gray-900">{actionOptions.find(o => o.value === a.type)?.label}</span>
                            <span className="text-gray-500">— {a.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Test preview */}
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Flow Preview
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-md font-semibold">⚡ {triggerOptions.find(t => t.value === newTrigger)?.label}</span>
                      {newConditions.length > 0 && newConditions.map((c, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md font-semibold">🔍 {c.field} {c.operator.replace(/_/g, ' ')} {c.value}</span>
                        </span>
                      ))}
                      {newActions.map((a, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-semibold">⚙️ {actionOptions.find(o => o.value === a.type)?.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button onClick={() => setWizardStep(3)} className="px-4 py-2 text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors">Back</button>
                    <div className="flex gap-3">
                      <button onClick={resetWizard} className="px-4 py-2 text-sm text-gray-600 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                      <button
                        onClick={finishWizard}
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        Activate Automation
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TASK QUEUE TAB ───────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Pending Automated Tasks</h2>
              <span className="text-xs text-gray-400">{taskQueue.length} tasks</span>
            </div>
            <div className="divide-y divide-gray-100">
              {taskQueue.map(task => (
                <div key={task.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <Badge status={task.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{task.ruleName}</div>
                    <div className="text-xs text-gray-500 truncate">{task.action}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{task.createdAt}</div>
                  {task.retryCount > 0 && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">×{task.retryCount} retries</span>
                  )}
                  {task.status === 'failed' && (
                    <button
                      onClick={() => retryTask(task.id)}
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex-shrink-0 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
