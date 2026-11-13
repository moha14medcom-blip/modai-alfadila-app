/* Offline demo rivals — only used in LOCAL MODE so the social features can be
   exercised end-to-end before Supabase keys are configured. */

import { makeProfile } from './profile';
import type { Profile } from './types';

export const DEMO_PLAYERS: Profile[] = [
  makeProfile('demo-1', 'salma@demo.local', {
    username: 'salma',
    displayName: 'سلمى 🌿',
    level: 14,
    xp: 320,
    egp: 180,
    totalTasks: 96,
    totalFocusMin: 1450,
    streak: 12,
  }),
  makeProfile('demo-2', 'ahmed@demo.local', {
    username: 'ahmed',
    displayName: 'أحمد 🚀',
    level: 21,
    xp: 640,
    egp: 420,
    totalTasks: 210,
    totalFocusMin: 2980,
    streak: 23,
  }),
  makeProfile('demo-3', 'nour@demo.local', {
    username: 'nour',
    displayName: 'نور ✨',
    level: 9,
    xp: 90,
    egp: 95,
    totalTasks: 58,
    totalFocusMin: 780,
    streak: 6,
  }),
  makeProfile('demo-4', 'youssef@demo.local', {
    username: 'youssef',
    displayName: 'يوسف 🦉',
    level: 6,
    xp: 40,
    egp: 60,
    totalTasks: 33,
    totalFocusMin: 410,
    streak: 3,
  }),
];

export const CHEER_TEMPLATES = [
  'كمّل كده يا بطل 💪',
  'إنت قدها! 🔥',
  'شد حيلك، الأسبوع لسه طويل ⚡',
  'ما تستسلمش، إنت قريب 🎯',
  'الله ينور عليك يا نجم ⭐',
  'خلّي الترتيب ده! 🏆',
];
