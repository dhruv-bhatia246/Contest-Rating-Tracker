import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../ThemeContext';

const screenWidth = Dimensions.get('window').width;

const buildRatings = (data) => {
  if (!data) return [];
  // LeetCode: { userContestRankingHistory: [{ rating }], ... }
  if (data.userContestRankingHistory) {
    return data.userContestRankingHistory
      .filter(entry => entry && entry.rating)
      .map(entry => Math.round(entry.rating));
  }
  // Codeforces: [ { newRating } ]
  if (Array.isArray(data) && data.length > 0 && data[0].newRating !== undefined) {
    return data.map(entry => entry.newRating).filter(Boolean);
  }
  // CodeChef: { ratingData: [{ rating }] }
  if (data.ratingData && Array.isArray(data.ratingData)) {
    return data.ratingData.map(entry => entry.rating).filter(Boolean);
  }
  // Generic array fallback
  if (Array.isArray(data)) {
    return data.map(entry => entry.rating || entry.newRating).filter(Boolean);
  }
  return [];
};

export const ComparisonScreen = () => {
  const { colors, accent } = useTheme();
  const [cachedData, setCachedData] = useState({});

  const loadCache = useCallback(async () => {
    const [lc, cf, cc] = await Promise.all([
      AsyncStorage.getItem('cache_lc'),
      AsyncStorage.getItem('cache_cf'),
      AsyncStorage.getItem('cache_cc'),
    ]);
    setCachedData({
      lc: lc ? JSON.parse(lc) : null,
      cf: cf ? JSON.parse(cf) : null,
      cc: cc ? JSON.parse(cc) : null,
    });
  }, []);

  useEffect(() => {
    loadCache();
    // Refresh when tab is revisited
    const interval = setInterval(loadCache, 3000);
    return () => clearInterval(interval);
  }, [loadCache]);

  const datasets = [];
  const platformMeta = [
    { key: 'lc', label: 'LeetCode', color: '#FFA116' },
    { key: 'cf', label: 'Codeforces', color: '#4fc3f7' },
    { key: 'cc', label: 'CodeChef', color: '#66bb6a' },
  ];

  const lengths = platformMeta.map((platform) => buildRatings(cachedData[platform.key]).length);
  const maxLength = Math.max(...lengths, 0);
  const labels = Array.from({ length: maxLength }, (_, index) => `${index + 1}`);

  platformMeta.forEach((platform) => {
    const data = buildRatings(cachedData[platform.key]).slice(-maxLength);
    if (data.length > 1) {
      const padded = Array.from({ length: maxLength - data.length }, () => null).concat(data);
      datasets.push({
        data: padded,
        color: () => platform.color,
        strokeWidth: 2,
      });
    }
  });

  const hasData = datasets.length > 0;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.card, { backgroundColor: colors.card }]}> 
        <Text style={[styles.title, { color: colors.textPrimary }]}>Comparison Summary</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>A quick view of your last platform ratings and progress.</Text>
      </View>

      {hasData ? (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Comparison</Text>
          <LineChart
            data={{ labels, datasets }}
            width={Math.min(screenWidth - 40, 760)}
            height={230}
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(148,163,184,${opacity})`,
              propsForDots: { r: '3' },
              propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border, strokeWidth: 0.5 },
            }}
            bezier
            withDots={false}
            withInnerLines={true}
            withOuterLines={false}
            style={styles.chart}
          />
          <View style={styles.legendRow}>
            {platformMeta.map((platform) => {
              const hasPlatform = buildRatings(cachedData[platform.key]).length > 1;
              return (
                hasPlatform && (
                  <View key={platform.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: platform.color }]} />
                    <Text style={[styles.legendText, { color: colors.textPrimary }]}>{platform.label}</Text>
                  </View>
                )
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}> 
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No cached comparison data yet.</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Refresh your platform screens once to populate this overview.</Text>
        </View>
      )}

      <View style={[styles.summaryGrid, { borderColor: colors.border }]}> 
        {platformMeta.map((platform) => {
          const data = buildRatings(cachedData[platform.key]);
          const latest = data.length > 0 ? data[data.length - 1] : '—';
          const previous = data.length > 1 ? data[data.length - 2] : null;
          const change = previous != null ? latest - previous : null;
          return (
            <View key={platform.key} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{platform.label}</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{latest}</Text>
              {change != null && (
                <Text style={[styles.summaryChange, { color: change >= 0 ? '#34d399' : '#fb7185' }]}>{change >= 0 ? `+${change}` : change}</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 18, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 20 },
  chartCard: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  chart: { borderRadius: 16, marginVertical: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { fontSize: 15 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, borderRadius: 18 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 15, textAlign: 'center' },
  summaryGrid: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2a2a3e', borderRadius: 18, overflow: 'hidden' },
  summaryCard: { padding: 18, borderBottomWidth: 1, borderColor: '#2a2a3e' },
  summaryLabel: { fontSize: 15, marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryChange: { marginTop: 4, fontSize: 15 },
});
