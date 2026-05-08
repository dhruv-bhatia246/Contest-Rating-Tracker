import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions, TextInput, Modal, Image, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { notifyRatingChange } from '../utils/notificationHelper';

const screenWidth = Dimensions.get("window").width;

export const LeetcodeScreen = () => {
  const { colors, accent } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lcData, setLcData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [cachedRating, setCachedRating] = useState(null);

  const fetchData = async () => {
    if (!username) return;
    try {
      const QUERY = `
        query {
          userContestRanking(username: "${username}") {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
          }
          userContestRankingHistory(username: "${username}") {
            attended
            rating
            contest { title startTime }
          }
          matchedUser(username: "${username}") {
            username
            profile { userAvatar }
            submitStats: submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
          allQuestionsCount { difficulty count }
        }`;
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY }),
      });
      const json = await res.json();
      if (json?.data?.matchedUser) {
        const newRating = json.data.userContestRanking?.rating;
        if (newRating && cachedRating && newRating !== cachedRating) {
          notifyRatingChange('LeetCode', cachedRating, newRating);
        }
        setLcData(json.data);
        if (newRating) setCachedRating(newRating);
        await AsyncStorage.setItem('cache_lc', JSON.stringify(json.data));
        setError(null);
      } else {
        Alert.alert('Error', 'Username not found');
        setShowModal(true);
      }
    } catch (e) {
      setError(e?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('lcusername').then(async (val) => {
      if (val) {
        setUsername(val);
        const cached = await AsyncStorage.getItem('cache_lc');
        if (cached) {
          try {
            setLcData(JSON.parse(cached));
            setCachedRating(JSON.parse(cached).userContestRanking?.rating);
            setLoading(false);
          } catch (e) {
            setLoading(true);
          }
        }
      } else {
        setShowModal(true);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (username) { setLoading(true); fetchData(); }
  }, [username]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const handleSubmitUsername = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    AsyncStorage.setItem('lcusername', trimmed);
    setUsername(trimmed);
    setShowModal(false);
    setInputValue('');
  };

  const handleCancel = () => {
    setShowModal(false);
    setInputValue('');
  };

  const getContestRatings = () => {
    if (!lcData?.userContestRankingHistory) return [];
    return lcData.userContestRankingHistory
      .filter(h => h.attended)
      .map(h => ({ value: Math.round(h.rating) }));
  };

  const getProgressData = () => {
    const stats = lcData?.matchedUser?.submitStats?.acSubmissionNum;
    const total = lcData?.allQuestionsCount;
    if (!stats || !total || stats.length < 4 || total.length < 4) return [];
    return [
      { label: 'Easy', solved: stats[1]?.count || 0, total: total[1]?.count || 1, color: '#00b8a3' },
      { label: 'Medium', solved: stats[2]?.count || 0, total: total[2]?.count || 1, color: '#ffc11d' },
      { label: 'Hard', solved: stats[3]?.count || 0, total: total[3]?.count || 1, color: '#ef4643' },
    ];
  };

  const getSolvedCounts = () => {
    const stats = lcData?.matchedUser?.submitStats?.acSubmissionNum;
    if (!stats || stats.length < 4) return { easy: 0, medium: 0, hard: 0 };
    return { easy: stats[1]?.count || 0, medium: stats[2]?.count || 0, hard: stats[3]?.count || 0 };
  };

  const usernameModal = (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>LeetCode Username</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter your username to track ratings</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="e.g. tourist"
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary, styles.modalButtonLeft, { backgroundColor: colors.surface }]} onPress={handleCancel}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: accent }]} onPress={handleSubmitUsername}>
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !lcData) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {usernameModal}
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {usernameModal}
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!username) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {usernameModal}
        <Ionicons name="code-slash" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Enter your LeetCode username to get started</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={() => setShowModal(true)}>
          <Text style={styles.retryText}>Set Username</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contestRatings = getContestRatings();
  const progressData = getProgressData();
  const currentRating = lcData?.userContestRanking?.rating;
  const topPercent = lcData?.userContestRanking?.topPercentage;
  const contests = lcData?.userContestRanking?.attendedContestsCount;
  const totalSolved = lcData?.matchedUser?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {usernameModal}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* Header Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <LinearGradient colors={['#FFA116' + '18', colors.cardGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.headerCard, { borderWidth: 1, borderColor: '#FFA116' + '25', ...Platform.select({ ios: { shadowColor: '#FFA116', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 4 } }) }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {lcData?.matchedUser?.profile?.userAvatar ? (
                <Image source={{ uri: lcData.matchedUser.profile.userAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: accent + '22', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color={accent} />
                </View>
              )}
              <View style={styles.headerInfo}>
                <Text style={[styles.platformLabel, { color: accent }]}>LeetCode</Text>
                <Text style={[styles.username, { color: colors.textPrimary }]}>{username}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }} style={[styles.editButton, { backgroundColor: accent + '22' }]}>
              <Ionicons name="pencil" size={16} color={accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{currentRating ? Math.round(currentRating) : '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{topPercent ? `${topPercent.toFixed(1)}%` : '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{contests || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Contests</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalSolved || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Solved</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Rating Chart */}
        {contestRatings.length > 1 && (
          <Animated.View entering={FadeInDown.duration(500).delay(250)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Rating History</Text>
            <LineChart
              data={contestRatings}
              width={screenWidth - 120}
              height={180}
              curved
              areaChart
              hideDataPoints
              color={accent}
              startFillColor={accent}
              endFillColor={accent}
              startOpacity={0.25}
              endOpacity={0}
              thickness={2.5}
              initialSpacing={8}
              endSpacing={8}
              spacing={(screenWidth - 136) / Math.max(contestRatings.length - 1, 1)}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              hideRules
              pointerConfig={{
                pointerStripColor: colors.border,
                pointerStripWidth: 1,
                pointerColor: accent,
                radius: 5,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                pointerLabelComponent: (items) => (
                  <View style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{items[0].value}</Text>
                  </View>
                ),
              }}
            />
          </Animated.View>
        )}

        {/* Problem Progress */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Problem Progress</Text>
          {progressData.map((item) => (
            <View key={item.label} style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <View style={[styles.problemDot, { backgroundColor: item.color }]} />
                <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
                  {item.solved}/{item.total}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                <View style={[styles.progressFill, { width: `${Math.min((item.solved / item.total) * 100, 100)}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  headerCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 14 },
  headerInfo: { flexShrink: 1 },
  platformLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  username: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  editButton: { padding: 8, borderRadius: 8 },
  statsRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 14, marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  progressRow: { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  problemDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  progressLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  progressCount: { fontSize: 15 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalContent: { borderRadius: 20, padding: 28, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  modalSubtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 17, borderWidth: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { borderRadius: 12, padding: 14, flex: 1, alignItems: 'center' },
  modalButtonSecondary: {},
  modalButtonLeft: { marginRight: 10 },
  modalButtonText: { fontSize: 17, fontWeight: '600' },
  modalButtonTextSecondary: {},
});