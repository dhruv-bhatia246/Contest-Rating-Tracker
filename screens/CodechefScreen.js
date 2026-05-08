import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions, TextInput, Modal, Image, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { notifyRatingChange } from '../utils/notificationHelper';

const screenWidth = Dimensions.get("window").width;

const getStarColor = (stars) => {
  if (stars >= 7) return '#6C3B2A';
  if (stars >= 6) return '#FFBF00';
  if (stars >= 5) return '#684273';
  if (stars >= 4) return '#3366CC';
  if (stars >= 3) return '#1E7D22';
  if (stars >= 2) return '#666';
  return '#888';
};

export const CodechefScreen = () => {
  const { colors, accent } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cachedRating, setCachedRating] = useState(null);

  const fetchData = async () => {
    if (!username) return;
    try {
      const res = await fetch(`https://www.codechef.com/users/${username}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const html = await res.text();

      // Check if user exists
      if (html.includes('Page Not Found') || html.includes('not found')) {
        Alert.alert('Error', 'Username not found');
        setShowModal(true);
        return;
      }

      // Extract rating data from embedded JS
      const ratingMatch = html.match(/var all_rating = (\[.*?\]);/);
      const ratingData = ratingMatch ? JSON.parse(ratingMatch[1]) : [];

      // Extract current rating
      const currentRatingMatch = html.match(/class="rating-number">\s*(\d+)/);
      const currentRating = currentRatingMatch ? parseInt(currentRatingMatch[1]) : null;

      // Extract highest rating
      const highestMatch = html.match(/\(Highest Rating (\d+)\)/);
      const highestRating = highestMatch ? parseInt(highestMatch[1]) : null;

      // Extract stars from rating-star span
      const starsMatch = html.match(/rating-star.*?(\d+)/);
      const stars = starsMatch ? starsMatch[1] : null;

      // Extract global rank (value appears before "Global Rank" text)
      const globalRankMatch = html.match(/<strong>\s*(\d+)\s*<\/strong>[\s\S]*?Global Rank/);
      const globalRank = globalRankMatch ? globalRankMatch[1] : null;

      // Extract name
      const nameMatch = html.match(/class="h2-style">(.*?)<\/h2/s);
      const name = nameMatch ? nameMatch[1].trim() : username;

      // Extract profile picture
      const avatarMatch = html.match(/class="user-details-container"[\s\S]*?<img[^>]+src="([^"]+)"/);
      const avatar = avatarMatch ? avatarMatch[1] : null;

      const newData = {
        name,
        avatar,
        currentRating,
        highestRating,
        stars,
        globalRank,
        ratingData: ratingData.map(r => ({
          rating: parseInt(r.rating),
          name: r.name,
          rank: parseInt(r.rank),
          code: r.code,
        })),
      };

      if (currentRating && cachedRating && currentRating !== cachedRating) {
        notifyRatingChange('CodeChef', cachedRating, currentRating);
      }

      setUserData(newData);
      if (currentRating) setCachedRating(currentRating);
      await AsyncStorage.setItem('cache_cc', JSON.stringify(newData));
      setError(null);
    } catch (e) {
      setError(e?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('ccusername').then(async (val) => {
      if (val) {
        setUsername(val);
        const cached = await AsyncStorage.getItem('cache_cc');
        if (cached) {
          try {
            setUserData(JSON.parse(cached));
            const data = JSON.parse(cached);
            setCachedRating(data.currentRating);
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
    AsyncStorage.setItem('ccusername', trimmed);
    setUsername(trimmed);
    setShowModal(false);
    setInputValue('');
  };

  const handleCancel = () => {
    setShowModal(false);
    setInputValue('');
  };

  const getRatingHistory = () => {
    if (!userData?.ratingData) return [];
    return userData.ratingData.map(r => ({ value: r.rating }));
  };

  const getRecentContests = () => {
    if (!userData?.ratingData) return [];
    return userData.ratingData.slice(-5).reverse();
  };

  const usernameModal = (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>CodeChef Username</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter your handle to track ratings</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="e.g. admin"
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

  if (loading && !userData) {
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
        <Ionicons name="restaurant-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Enter your CodeChef username to get started</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={() => setShowModal(true)}>
          <Text style={styles.retryText}>Set Username</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratings = getRatingHistory();
  const recentContests = getRecentContests();
  const stars = userData?.stars ? parseInt(userData.stars) : 0;
  const starColor = getStarColor(stars);

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
        <LinearGradient colors={['#66bb6a' + '18', colors.cardGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.headerCard, { borderWidth: 1, borderColor: '#66bb6a' + '25', ...Platform.select({ ios: { shadowColor: '#66bb6a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 4 } }) }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: accent + '22', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color={accent} />
                </View>
              )}
              <View style={styles.headerInfo}>
                <Text style={[styles.platformLabel, { color: accent }]}>CodeChef</Text>
                <Text style={[styles.username, { color: colors.textPrimary }]}>{userData?.name || username}</Text>
                <View style={styles.starsRow}>
                  {Array.from({ length: stars || 0 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={16} color={starColor} />
                  ))}
                  {stars > 0 && <Text style={[styles.starText, { color: starColor }]}> {userData?.stars}</Text>}
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }} style={[styles.editButton, { backgroundColor: accent + '22' }]}>
              <Ionicons name="pencil" size={16} color={accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{userData?.currentRating || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{userData?.highestRating || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Highest</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{userData?.globalRank || userData?.countryRank || '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Global Rank</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* Rating Chart */}
        {ratings.length > 1 && (
          <Animated.View entering={FadeInDown.duration(500).delay(250)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Rating History</Text>
            <LineChart
              data={ratings}
              width={screenWidth - 120}
              height={180}
              curved
              areaChart
              hideDataPoints
              color="#66bb6a"
              startFillColor="#66bb6a"
              endFillColor="#66bb6a"
              startOpacity={0.25}
              endOpacity={0}
              thickness={2.5}
              initialSpacing={8}
              endSpacing={8}
              spacing={(screenWidth - 136) / Math.max(ratings.length - 1, 1)}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              hideRules
              pointerConfig={{
                pointerStripColor: colors.border,
                pointerStripWidth: 1,
                pointerColor: '#66bb6a',
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

        {/* Recent Contests */}
        {recentContests.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={[styles.card, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 }, android: { elevation: 3 } }) }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Contests</Text>
            {recentContests.map((contest, index) => (
              <View key={index} style={[styles.contestItem, { borderBottomColor: colors.border }]}>
                <View style={styles.contestInfo}>
                  <Text style={[styles.contestName, { color: colors.textPrimary }]} numberOfLines={1}>{contest.name || contest.code || `Contest ${index + 1}`}</Text>
                  <Text style={[styles.contestRating, { color: colors.textSecondary }]}>Rating: {contest.rating}</Text>
                </View>
                {contest.rank && (
                  <Text style={styles.contestRank}>#{contest.rank}</Text>
                )}
              </View>
            ))}
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
  username: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  starText: { fontSize: 15, fontWeight: '600' },
  editButton: { padding: 8, borderRadius: 8 },
  statsRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 14, marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  contestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  contestInfo: { flex: 1, marginRight: 12 },
  contestName: { fontSize: 15 },
  contestRating: { fontSize: 14, marginTop: 2 },
  contestRank: { color: '#66bb6a', fontSize: 15, fontWeight: '600' },
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
