import React, { memo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';

const TouchableOpacity = ({
    style,
    activeOpacity = 0.7,
    children,
    disabled,
    ...props
}: any) => (
    <Pressable
        {...props}
        disabled={disabled}
        style={({ pressed }) => [
            typeof style === 'function' ? style({ pressed }) : style,
            pressed && !disabled && { opacity: activeOpacity },
        ]}
    >
        {children}
    </Pressable>
);
import {
  IconBrain,
  IconSparkles,
  IconPlayerPlay,
  IconTarget,
  IconCompass,
  IconNumbers,
  IconChevronDown,
  IconChevronUp,
  IconBulb,
  IconEye,
  IconEyeOff,
} from '@/src/presentation/components/icons';

import { useColorScheme } from '@/components/useColorScheme';
import { getPalette, theme } from '@/constants/theme';
import { WillieHoppeClock } from './WillieHoppeClock';
import {
  type TacticalSolution,
  type HoppeSpinEffect,
} from './billiardsPlaySolver';

interface TacticalSolverPanelProps {
  solution: TacticalSolution;
  solutions?: TacticalSolution[];
  onSelectSolution?: (solution: TacticalSolution) => void;
  onSimulateSolution: (solution: TacticalSolution) => void;
  isSimulating: boolean;
  systemDiamondMode: 'none' | 'llk_hoppe' | 'base_50';
  onToggleDiamondMode: (mode: 'none' | 'llk_hoppe' | 'base_50') => void;
  onSelectSpin?: (spin: HoppeSpinEffect) => void;
  showSolution?: boolean;
  onToggleShowSolution?: () => void;
}

export const TacticalSolverPanel = memo(function TacticalSolverPanel({
  solution,
  solutions,
  onSelectSolution,
  onSimulateSolution,
  isSimulating,
  systemDiamondMode,
  onToggleDiamondMode,
  onSelectSpin,
  showSolution = false,
  onToggleShowSolution,
}: TacticalSolverPanelProps) {
  const palette = getPalette(useColorScheme());
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header Row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.aiBadge}>
            <IconBrain size={16} color="#0284c7" />
            <Text style={styles.aiBadgeText}>Solucionador Táctico</Text>
          </View>
          <View style={styles.figurePill}>
            <Text style={styles.figurePillText}>{solution.figureName}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>{solution.confidence}% Acierto</Text>
          </View>
          {expanded ? (
            <IconChevronUp size={18} color={palette.muted} />
          ) : (
            <IconChevronDown size={18} color={palette.muted} />
          )}
        </View>
      </TouchableOpacity>

      {/* Alternative Candidates Pill Tabs (when multiple viable figures exist) */}
      {expanded && solutions && solutions.length > 1 && (
        <View style={styles.solutionsTabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.solutionsTabsScroll}
          >
            {solutions.map((sol, idx) => {
              const isSelected = sol.figureId === solution.figureId;
              return (
                <TouchableOpacity
                  key={`${sol.figureId}-${idx}`}
                  style={[
                    styles.solutionTabPill,
                    isSelected
                      ? styles.solutionTabPillActive
                      : { backgroundColor: palette.surfaceLow, borderColor: palette.border },
                  ]}
                  onPress={() => onSelectSolution?.(sol)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.solutionTabText,
                      isSelected ? styles.solutionTabTextActive : { color: palette.muted },
                    ]}
                  >
                    {idx === 0 ? '⭐ ' : ''}{sol.figureName} ({sol.confidence}%)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {expanded && (
        <View style={styles.bodyContent}>
          {/* Tactical Description */}
          <Text style={[styles.descriptionText, { color: palette.text }]}>
            {solution.description}
          </Text>

          {/* Grid of Key Technical Parameters */}
          <View style={styles.paramsGrid}>
            {/* Strike Type Card */}
            <View style={[styles.paramCard, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <View style={styles.paramCardHeader}>
                <IconTarget size={14} color="#10b981" />
                <Text style={[styles.paramCardLabel, { color: palette.muted }]}>Tipo de Golpe</Text>
              </View>
              <Text style={[styles.paramCardValue, { color: '#10b981' }]}>
                {solution.shotTypeName}
              </Text>
              <Text style={[styles.paramCardAdvice, { color: palette.muted }]} numberOfLines={2}>
                {solution.shotTypeAdvice}
              </Text>
            </View>

            {/* Ball Contact Thickness Card */}
            <View style={[styles.paramCard, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <View style={styles.paramCardHeader}>
                <IconCompass size={14} color="#f59e0b" />
                <Text style={[styles.paramCardLabel, { color: palette.muted }]}>Tome de Bola</Text>
              </View>
              <Text style={[styles.paramCardValue, { color: '#f59e0b' }]}>
                {solution.ballThickness} de Bola
              </Text>
              <Text style={[styles.paramCardAdvice, { color: palette.muted }]}>
                {solution.ballThickness === '1/2'
                  ? 'Contacto medio estándar a 30°'
                  : solution.ballThickness === '1/4'
                  ? 'Corte fino para conservar inercia'
                  : 'Contacto pleno con transferencia'}
              </Text>
            </View>
          </View>

          {/* Interactive Willie Hoppe Spin Clock & Diamond Systems Row */}
          <View style={styles.hoppeRow}>
            <View style={styles.hoppeCol}>
              <View style={styles.sectionHeaderRow}>
                <IconSparkles size={14} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Efecto según Willie Hoppe
                </Text>
              </View>
              <WillieHoppeClock
                selectedSpin={solution.hoppeSpin.code}
                onSelectSpin={onSelectSpin}
                size={160}
              />
            </View>

            <View style={styles.actionsCol}>
              {/* Diamond System Calculation if available */}
              {solution.diamondCalculation && (
                <View style={[styles.mathCard, { backgroundColor: `${palette.primary}12`, borderColor: `${palette.primary}35` }]}>
                  <View style={styles.mathHeader}>
                    <IconNumbers size={14} color={palette.primary} />
                    <Text style={[styles.mathTitle, { color: palette.primary }]}>
                      {solution.diamondCalculation.systemName}
                    </Text>
                  </View>
                  <Text style={[styles.mathFormula, { color: palette.text }]}>
                    {solution.diamondCalculation.formula}
                  </Text>
                </View>
              )}

              {/* Toggle Diamond Overlay Button */}
              <TouchableOpacity
                style={[
                  styles.diamondToggleBtn,
                  systemDiamondMode === 'llk_hoppe'
                    ? styles.diamondToggleBtnActive
                    : { borderColor: palette.border, backgroundColor: palette.surfaceLow },
                ]}
                onPress={() => {
                  onToggleDiamondMode(systemDiamondMode === 'llk_hoppe' ? 'none' : 'llk_hoppe');
                }}
              >
                <IconNumbers
                  size={16}
                  color={systemDiamondMode === 'llk_hoppe' ? '#ffffff' : palette.text}
                />
                <Text
                  style={[
                    styles.diamondToggleText,
                    {
                      color: systemDiamondMode === 'llk_hoppe' ? '#ffffff' : palette.text,
                    },
                  ]}
                >
                  {systemDiamondMode === 'llk_hoppe'
                    ? '📐 Diamantes LLK Activos'
                    : '📐 Ver Diamantes LLK (Hope)'}
                </Text>
              </TouchableOpacity>

              {/* Toggle Solution Path Visibility */}
              {onToggleShowSolution && (
                <TouchableOpacity
                  style={[
                    styles.toggleSolutionBtn,
                    showSolution
                      ? styles.toggleSolutionBtnActive
                      : { borderColor: palette.border, backgroundColor: palette.surfaceLow },
                  ]}
                  onPress={onToggleShowSolution}
                  activeOpacity={0.8}
                >
                  {showSolution ? (
                    <IconEyeOff size={16} color="#ffffff" />
                  ) : (
                    <IconBulb size={16} color={palette.primary} />
                  )}
                  <Text
                    style={[
                      styles.toggleSolutionBtnText,
                      showSolution ? styles.toggleSolutionBtnTextActive : { color: palette.text },
                    ]}
                  >
                    {showSolution ? 'Ocultar Línea de Solución' : 'Mostrar Línea de Solución'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Run Simulation Action Button */}
              <TouchableOpacity
                style={[
                  styles.simulateBtn,
                  isSimulating && styles.simulateBtnActive,
                ]}
                onPress={() => onSimulateSolution(solution)}
                disabled={isSimulating}
              >
                <IconPlayerPlay size={18} color="#ffffff" />
                <Text style={styles.simulateBtnText}>
                  {isSimulating ? 'Simulando Solución...' : 'Simular Trayectoria Ideal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  figurePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  figurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidencePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  confidenceText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#d97706',
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  descriptionText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  paramsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  paramCard: {
    flex: 1,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
  },
  paramCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paramCardLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  paramCardValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  paramCardAdvice: {
    fontSize: 10,
    lineHeight: 13.5,
  },
  hoppeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap',
  },
  hoppeCol: {
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionsCol: {
    flex: 1,
    minWidth: 200,
    gap: 10,
    justifyContent: 'center',
  },
  mathCard: {
    padding: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
  },
  mathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mathTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  mathFormula: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  diamondToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  diamondToggleBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  diamondToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleSolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  toggleSolutionBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  toggleSolutionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleSolutionBtnTextActive: {
    color: '#ffffff',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#10b981',
  },
  simulateBtnActive: {
    backgroundColor: '#059669',
    opacity: 0.8,
  },
  simulateBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  solutionsTabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  solutionsTabsScroll: {
    gap: 8,
    alignItems: 'center',
  },
  solutionTabPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  solutionTabPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  solutionTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  solutionTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
