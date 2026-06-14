export const Colors = {
  primary: '#6C63FF',
  secondary: '#FF6584',
  accent: '#43C6AC',
  warning: '#FF9F43',
  background: '#F0F2FF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
};

export const Gradients = {
  primary:   ['#6C63FF', '#8B85FF'] as const,
  secondary: ['#FF6584', '#FF8FA3'] as const,
  accent:    ['#43C6AC', '#5DE6C8'] as const,
  warning:   ['#FF9F43', '#FFC371'] as const,
};

export const CollectionColors = [
  '6C63FF', 'FF6584', '43C6AC', 'FF9F43',
  '48C9B0', 'E74C3C', '3498DB', '9B59B6',
];

export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
};
