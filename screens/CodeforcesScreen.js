import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, TextInput, Modal, Image, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { notifyRatingChange } from '../utils/notificationHelper';
import { useResponsive } from '../utils/responsive';

const getRankColor = (rank) => {
  if (!rank) return '#888';
  const r = rank.toLowerCase();
  if (r.includes('legendary') || r.includes('tourist')) return '#ff0000';
  if (r.includes('international grandmaster')) return '#ff0000';
  if (r.includes('grandmaster')) return '#ff3333';
  if (r.includes('international master')) return '#ff8c00';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('candidate master')) return '#aa00aa';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  return '#808080';
};

export const CodeforcesScreen = () => {
  const { colors, accent } = useTheme();
  const { width, contentPadding, maxContentWidth } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [history, setHistory] = useState(null);
  const [username, setUsername] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cachedRating, setCachedRating] = useState(null);

  const fetchData = async () => {
    if (!username) return;
    try {
      const [infoRes, ratingRes] = await Promise.all([
        fetch(`https://codeforces.com/api/user.info?handles=${username}`),
        fetch(`https://codeforces.com/api/user.rating?handle=${username}`),
      ]);
      const infoJson = await infoRes.json();
      const ratingJson = await ratingRes.json();

      if (infoJson.status === 'OK') {
        setCfData(infoJson.result[0]);
      } else {
        Alert.alert('Error', 'Username not found');
        setShowModal(true);
        return;
      }
      if (ratingJson.status === 'OK') {
        const newRating = ratingJson.result[ratingJson.result.length - 1]?.newRating;
        if (newRating && cachedRating && newRating !== cachedRating) {
          notifyRatingChange('Codeforces', cachedRating, newRating);
        }
        setHistory(ratingJson.result);
        if (newRating) setCachedRating(newRating);
        await AsyncStorage.setItem('cache_cf', JSON.stringify(ratingJson.result));
      }
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('cfusername').then(async (val) => {
      if (val) {
        setUsername(val);
        const cached = await AsyncStorage.getItem('cache_cf');
        if (cached) {
          try {
            setHistory(JSON.parse(cached));
            const data = JSON.parse(cached);
            if (data && data.length > 0) {
              setCachedRating(data[data.length - 1].newRating);
            }
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
    AsyncStorage.setItem('cfusername', trimmed);
    setUsername(trimmed);
    setShowModal(false);
    setInputValue('');
  };

  const handleCancel = () => {
    setShowModal(false);
    setInputValue('');
  };

  const getRatings = () => {
    if (!history || history.length === 0) return [];
    return history.map(h => ({ value: h.newRating }));
  };

  const getLastContest = () => {
    if (!history || history.length === 0) return null;
    const last = history[history.length - 1];
    const delta = last.newRating - last.oldRating;
    return { name: last.contestName, delta };
  };

  const usernameModal = (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Codeforces Username</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter your handle to track ratings</Text>
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

  if (loading && !cfData) {
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
        <Ionicons name="globe-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Enter your Codeforces username to get started</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={() => setShowModal(true)}>
          <Text style={styles.retryText}>Set Username</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratings = getRatings();
  const lastContest = getLastContest();
  const rankColor = getRankColor(cfData?.rank);

  const chartWidth = Math.min(width - contentPadding * 2, 760);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: contentPadding }]}> 
      {usernameModal}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { maxWidth: maxContentWidth, alignSelf: 'center' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* Header Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <LinearGradient colors={['#4fc3f7' + '18', colors.cardGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.headerCard, { borderWidth: 1, borderColor: '#4fc3f7' + '25', ...Platform.select({ ios: { shadowColor: '#4fc3f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 4 } }) }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {cfData?.titlePhoto ? (
                <Image source={{ uri: cfData.titlePhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: accent + '22', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color={accent} />
                </View>
              )}
              <View style={styles.headerInfo}>
                <Text style={[styles.platformLabel, { color: accent }]}>Codeforces</Text>
                <Text style={[styles.username, { color: colors.textPrimary }]}>{cfData?.handle}</Text>
                <Text style={[styles.rank, { color: rankColor }]}>{cfData?.rank}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }} style={[styles.editButton, { backgroundColor: accent + '22' }]}>
              <Ionicons name="pencil" size={16} color={accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cfData?.rating || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cfData?.maxRating || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{history?.length || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Contests</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Last Contest */}
        {lastContest && (
          <Animated.View entering={FadeInDown.duration(500).delay(250)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Last Contest</Text>
            <Text style={[styles.contestName, { color: colors.textSecondary }]} numberOfLines={2}>{lastContest.name}</Text>
            <View style={styles.deltaRow}>
              <Ionicons
                name={lastContest.delta >= 0 ? "arrow-up" : "arrow-down"}
                size={18}
                color={lastContest.delta >= 0 ? "#00c853" : "#ff5252"}
              />
              <Text style={[styles.deltaText, { color: lastContest.delta >= 0 ? "#00c853" : "#ff5252" }]}>
                {lastContest.delta >= 0 ? '+' : ''}{lastContest.delta}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Rating Chart */}
        {ratings.length > 1 && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Rating History</Text>
            <LineChart
              data={ratings}
              width={chartWidth}
              height={180}
              curved
              areaChart
              hideDataPoints
              color="#4fc3f7"
              startFillColor="#4fc3f7"
              endFillColor="#4fc3f7"
              startOpacity={0.25}
              endOpacity={0}
              thickness={2.5}
              initialSpacing={8}
              endSpacing={8}
              spacing={(chartWidth - 56) / Math.max(ratings.length - 1, 1)}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              hideRules
              pointerConfig={{
                pointerStripColor: colors.border,
                pointerStripWidth: 1,
                pointerColor: '#4fc3f7',
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
  rank: { fontSize: 15, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  editButton: { padding: 8, borderRadius: 8 },
  statsRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 14, marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  contestName: { fontSize: 15 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  deltaText: { fontSize: 20, fontWeight: '700', marginLeft: 4 },
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