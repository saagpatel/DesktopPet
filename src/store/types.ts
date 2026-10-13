import type { AnimationState, ShopItemId, TimerPreset } from "../lib/constants";

export interface PetState {
  currentStage: number;
  animationState: AnimationState;
  accessories: ShopItemId[];
  ownedAccessories?: ShopItemId[];
  totalPomodoros: number;
  speciesId: string;
  evolutionThresholds: number[];
  mood: string;
  energy: number;
  hunger: number;
  cleanliness: number;
  affection: number;
  personality: string;
  evolutionPath: string;
  skin: string;
  scene: string;
  lastInteraction: string | null;
  lastCareUpdateAt: string;
}

export interface PomodoroSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  workDuration: number;
  breakDuration: number;
}

export interface CoinBalance {
  total: number;
  spent: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  rewardClaimed?: boolean;
  createdAt: string;
}

export interface DailyGoal {
  id: string;
  description: string;
  target: number;
  progress: number;
  date: string;
}

export interface Settings {
  timerPreset: TimerPreset;
  notificationsEnabled: boolean;
  toastNotificationsEnabled: boolean;
  trayBadgeEnabled: boolean;
  notificationWhitelist: string[];
  soundsEnabled: boolean;
  soundVolume: number;
  quietModeEnabled: boolean;
  focusModeEnabled: boolean;
  animationBudget: "low" | "medium" | "high";
  contextAwareChillEnabled: boolean;
  chillOnFullscreen: boolean;
  chillOnMeetings: boolean;
  chillOnHeavyTyping: boolean;
  meetingHosts: string[];
  heavyTypingThresholdCpm: number;
  enabledSeasonalPacks: string[];
  validatedSpeciesPacks: string[];
  uiTheme: string;
  petSkin: string;
  petScene: string;
  focusGuardrailsEnabled: boolean;
  focusGuardrailsWorkOnly: boolean;
  focusAllowlist: string[];
  focusBlocklist: string[];
}

export interface SettingsPatch {
  timerPreset?: TimerPreset;
  notificationsEnabled?: boolean;
  toastNotificationsEnabled?: boolean;
  trayBadgeEnabled?: boolean;
  notificationWhitelist?: string[];
  soundsEnabled?: boolean;
  soundVolume?: number;
  quietModeEnabled?: boolean;
  focusModeEnabled?: boolean;
  animationBudget?: "low" | "medium" | "high";
  contextAwareChillEnabled?: boolean;
  chillOnFullscreen?: boolean;
  chillOnMeetings?: boolean;
  chillOnHeavyTyping?: boolean;
  meetingHosts?: string[];
  heavyTypingThresholdCpm?: number;
  enabledSeasonalPacks?: string[];
  validatedSpeciesPacks?: string[];
  uiTheme?: string;
  petSkin?: string;
  petScene?: string;
  focusGuardrailsEnabled?: boolean;
  focusGuardrailsWorkOnly?: boolean;
  focusAllowlist?: string[];
  focusBlocklist?: string[];
}

export interface TimerRuntimeState {
  phase: "idle" | "work" | "break" | "celebrating";
  secondsLeft: number;
  totalSeconds: number;
  paused: boolean;
  sessionId: string | null;
  sessionsCompleted: number;
  preset: TimerPreset;
  lastUpdatedAt: string;
}

export interface UserProgress {
  xpTotal: number;
  level: number;
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalSessions: number;
  totalFocusMinutes: number;
  totalTasksCompleted: number;
}

export interface DailySummary {
  date: string;
  sessionsCompleted: number;
  focusMinutes: number;
  tasksCompleted: number;
  goalsCompleted: number;
  coinsEarned: number;
  xpEarned: number;
  guardrailsInterventions: number;
  highNudges: number;
}

export interface CustomizationLoadout {
  name: string;
  uiTheme: string;
  petSkin: string;
  petScene: string;
  accessories: string[];
}

export interface FocusGuardrailsStatus {
  enabled: boolean;
  active: boolean;
  phase: string;
  matchedBlocklist: string[];
  matchedAllowlist: string[];
  blockedHostsCount: number;
  nudgeLevel: string;
  recommendedAction: string;
  message: string;
}

export interface PetEvent {
  id: string;
  kind: string;
  description: string;
  createdAt: string;
  resolved: boolean;
}

export interface PetQuest {
  id: string;
  kind: string;
  title: string;
  description: string;
  targetSessions: number;
  completedSessions: number;
  rewardCoins: number;
  createdAt: string;
}

export interface FocusGuardrailEvent {
  id: string;
  phase: string;
  hosts: string[];
  matchedBlocklist: string[];
  nudgeLevel: string;
  recommendedAction: string;
  createdAt: string;
}

export type AchievementCategory =
  "focus" | "streak" | "pet" | "progression" | "special";

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
  hidden: boolean;
}

export interface AchievementState {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlockedId: string | null;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  locked: number;
  focus_total?: number;
  focus_unlocked?: number;
  streak_total?: number;
  streak_unlocked?: number;
  pet_total?: number;
  pet_unlocked?: number;
  progression_total?: number;
  progression_unlocked?: number;
  special_total?: number;
  special_unlocked?: number;
}

export interface AppState {
  pet: PetState;
  coins: CoinBalance;
  tasks: Task[];
  goals: DailyGoal[];
  sessions: PomodoroSession[];
  settings: Settings;
  timerRuntime: TimerRuntimeState;
  progress: UserProgress;
  summaries: DailySummary[];
}

export interface AppSnapshot {
  format: string;
  schemaVersion: number;
  exportedAt: string;
  pet: PetState;
  coins: CoinBalance;
  tasks: Task[];
  goals: DailyGoal[];
  sessions: PomodoroSession[];
  settings: Settings;
  timerRuntime: TimerRuntimeState;
  progress: UserProgress;
  summaries: DailySummary[];
  customizationLoadouts: CustomizationLoadout[];
  petEvents: PetEvent[];
  petActiveQuest: PetQuest | null;
  focusGuardrailEvents: FocusGuardrailEvent[];
  achievementState: AchievementState;
  questRecentFocus: number;
  questRecentCare: number;
  questLastKind: string | null;
  questLastRollAt: string | null;
  breakEvents: string[];
}

export interface AppDiagnostics {
  appVersion: string;
  schemaVersion: number;
  currentSchemaVersion: number;
  exportedAt: string;
  os: string;
  arch: string;
  tasksCount: number;
  sessionsCount: number;
  summariesCount: number;
  guardrailEventsCount: number;
  hasActiveQuest: boolean;
}
