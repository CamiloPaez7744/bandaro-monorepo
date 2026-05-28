import { StyleSheet, Text, View } from 'react-native';

import { theme, getPalette } from '@/constants/theme';

type Analysis = {
  score: number;
  status: 'excellent' | 'good' | 'needs-adjustment';
  metrics: {
    shoulderTilt: number;
    hipTilt: number;
    torsoLean: number;
    elbowAngle: number;
    headOffset: number;
    stanceWidth: number;
  };
  tips: string[];
};

type Props = {
  analysis: Analysis | null;
  title: string;
  sectionLabel: string;
  tipsLabel: string;
  noTipsLabel: string;
  metricLabels: Record<keyof Analysis['metrics'], string>;
  palette: ReturnType<typeof getPalette>;
};

const getStatusTone = (status: Analysis['status']) => {
  if (status === 'excellent') return '#22c55e';
  if (status === 'good') return '#f59e0b';
  return '#ef4444';
};

export function MetricsDashboard({ analysis, title, sectionLabel, tipsLabel, noTipsLabel, metricLabels, palette }: Props) {
  const styles = getStyles(palette);

  if (!analysis) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>{sectionLabel}</Text>
      </View>
    );
  }

  const tone = getStatusTone(analysis.status);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{sectionLabel}</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: tone }]}> 
          <Text style={[styles.statusText, { color: tone }]}>{analysis.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {(Object.keys(analysis.metrics) as (keyof Analysis['metrics'])[]).map((key) => (
          <View key={key} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metricLabels[key]}</Text>
            <Text style={styles.metricValue}>{analysis.metrics[key].toFixed(1)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>{tipsLabel}</Text>
        {analysis.tips.length > 0 ? (
          analysis.tips.map((tip) => (
            <Text key={tip} style={styles.tipItem}>
              • {tip}
            </Text>
          ))
        ) : (
          <Text style={styles.tipItem}>{noTipsLabel}</Text>
        )}
      </View>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: '900',
    },
    subtitle: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 2,
    },
    empty: {
      color: palette.muted,
      fontSize: 13,
    },
    statusPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${palette.card}`,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48%',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 12,
      gap: 6,
    },
    metricLabel: {
      color: palette.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    metricValue: {
      color: palette.text,
      fontSize: 24,
      fontWeight: '900',
    },
    tipsCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 14,
      gap: 6,
    },
    tipsTitle: {
      color: palette.primary,
      fontSize: 12,
      textTransform: 'uppercase',
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    tipItem: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 19,
    },
  });
