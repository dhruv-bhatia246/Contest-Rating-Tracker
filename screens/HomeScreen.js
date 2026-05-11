import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useResponsive } from '../utils/responsive';

const PLATFORM_COLORS = {
  leetcode: '#FFA116',
  codeforces: '#4fc3f7',
  codechef: '#66bb6a',
};

const PLATFORM_ICONS = {
  leetcode: 'code-slash',
  codeforces: 'globe-outline',
  codechef: 'restaurant-outline',
};

const PLATFORM_LABELS = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
};

export const HomeScreen = ({ navigation }) => {
  const { colors, accent } = useTheme();
  const { width, isTablet, contentPadding, maxContentWidth } = useResponsive();
  const CARD_WIDTH = Math.min(Math.max(width - (isTablet ? 48 : 40), 320), 560);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState({});
  const [contests, setContests] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef(null);
  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveCardIndex(viewableItems[0].index);
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const loadData = useCallback(async () => {
    try {
      // Load enabled platforms and cached data
      const lcEnabled = await AsyncStorage.getItem('platform_leetcode');
      const cfEnabled = await AsyncStorage.getItem('platform_codeforces');
      const ccEnabled = await AsyncStorage.getItem('platform_codechef');

      const enabled = {
        leetcode: lcEnabled !== 'false',
        codeforces: cfEnabled !== 'false',
        codechef: ccEnabled !== 'false',
      };

      const platformData = {};

      if (enabled.leetcode) {
        const username = await AsyncStorage.getItem('lcusername');
        if (username) {
          let cached = await AsyncStorage.getItem('cache_lc');
          if (!cached) {
            try {
              const QUERY = `query {
                userContestRanking(username: "${username}") { attendedContestsCount rating globalRanking totalParticipants topPercentage }
                userContestRankingHistory(username: "${username}") { attended rating contest { title startTime } }
                matchedUser(username: "${username}") { username profile { userAvatar } submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } }
                allQuestionsCount { difficulty count }
              }`;
              const res = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: QUERY }),
              });
              const json = await res.json();
              if (json?.data?.matchedUser) {
                await AsyncStorage.setItem('cache_lc', JSON.stringify(json.data));
                cached = JSON.stringify(json.data);
              }
            } catch (e) {}
          }
          const data = cached ? JSON.parse(cached) : null;
          const rating = data?.userContestRanking?.rating;
          const totalSolved = data?.matchedUser?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count;
          const contests = data?.userContestRanking?.attendedContestsCount;
          const topPercent = data?.userContestRanking?.topPercentage;
          platformData.leetcode = { username, rating: rating ? Math.round(rating) : null, solved: totalSolved, contests, topPercent };
        }
      }

      if (enabled.codeforces) {
        const username = await AsyncStorage.getItem('cfusername');
        if (username) {
          let cached = await AsyncStorage.getItem('cache_cf');
          let cachedInfo = await AsyncStorage.getItem('cache_cf_info');
          if (!cached) {
            try {
              const res = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
              const json = await res.json();
              if (json?.status === 'OK') {
                await AsyncStorage.setItem('cache_cf', JSON.stringify(json.result));
                cached = JSON.stringify(json.result);
              }
            } catch (e) {}
          }
          if (!cachedInfo) {
            try {
              const res = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
              const json = await res.json();
              if (json?.status === 'OK' && json.result?.[0]) {
                await AsyncStorage.setItem('cache_cf_info', JSON.stringify(json.result[0]));
                cachedInfo = JSON.stringify(json.result[0]);
              }
            } catch (e) {}
          }
          const data = cached ? JSON.parse(cached) : null;
          const info = cachedInfo ? JSON.parse(cachedInfo) : null;
          platformData.codeforces = {
            username,
            rating: info?.rating || null,
            maxRating: info?.maxRating || null,
            rank: info?.rank || null,
            contests: Array.isArray(data) ? data.length : 0,
          };
        }
      }

      if (enabled.codechef) {
        const username = await AsyncStorage.getItem('ccusername');
        if (username) {
          let cached = await AsyncStorage.getItem('cache_cc');
          if (!cached) {
            try {
              const res = await fetch(`https://www.codechef.com/users/${username}`);
              const html = await res.text();
              const ratingMatch = html.match(/var\s+all_rating\s*=\s*(\[.*?\]);/s);
              const starsMatch = html.match(/class="rating"\s*.*?(\d)\s*star/i);
              const ratingData = ratingMatch ? JSON.parse(ratingMatch[1]).map(r => ({ rating: r.rating, code: r.code, name: r.name })) : [];
              const stars = starsMatch ? starsMatch[1] : null;
              const ccData = { ratingData, stars };
              await AsyncStorage.setItem('cache_cc', JSON.stringify(ccData));
              cached = JSON.stringify(ccData);
            } catch (e) {}
          }
          const data = cached ? JSON.parse(cached) : null;
          const lastRating = data?.ratingData?.length > 0 ? data.ratingData[data.ratingData.length - 1]?.rating : null;
          platformData.codechef = {
            username,
            rating: lastRating || null,
            stars: data?.stars || null,
            contests: data?.ratingData?.length || 0,
          };
        }
      }

      setPlatforms(platformData);
      setActiveCardIndex(0);

      // Fetch upcoming contests
      await fetchUpcomingContests();
    } catch (e) {
      console.warn('HomeScreen load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcomingContests = async () => {
    try {
      const [cfRes, lcRes, ccRes] = await Promise.allSettled([
        fetchCfContests(),
        fetchLcContests(),
        fetchCcContests(),
      ]);
      const all = [
        ...(cfRes.status === 'fulfilled' ? cfRes.value : []),
        ...(lcRes.status === 'fulfilled' ? lcRes.value : []),
        ...(ccRes.status === 'fulfilled' ? ccRes.value : []),
      ]
        .filter(c => c.startTime > Date.now())
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, 5);
      setContests(all);
    } catch (e) {}
  };

  const fetchCfContests = async () => {
    const res = await fetch('https://codeforces.com/api/contest.list');
    const json = await res.json();
    if (json.status !== 'OK') return [];
    return json.result
      .filter(c => c.phase === 'BEFORE')
      .map(c => ({
        id: `cf_${c.id}`, name: c.name, platform: 'Codeforces',
        startTime: c.startTimeSeconds * 1000, duration: c.durationSeconds * 1000,
      }));
  };

  const fetchLcContests = async () => {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{ allContests { title titleSlug startTime duration } }` }),
    });
    const json = await res.json();
    return (json?.data?.allContests || [])
      .filter(c => c.startTime * 1000 > Date.now())
      .map(c => ({
        id: `lc_${c.titleSlug}`, name: c.title, platform: 'LeetCode',
        startTime: c.startTime * 1000, duration: c.duration * 1000,
      }));
  };

  const fetchCcContests = async () => {
    const res = await fetch('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all');
    const json = await res.json();
    return (json?.future_contests || []).map(c => ({
      id: `cc_${c.contest_code}`, name: c.contest_name, platform: 'CodeChef',
      startTime: new Date(c.contest_start_date_iso).getTime(), duration: c.contest_duration * 60 * 1000,
    }));
  };

  useEffect(() => { loadData(); }, [loadData]);

  // Reload data whenever the screen comes into focus (e.g. returning from Settings)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Auto-scroll carousel every 4 seconds
  const platformKeys = Object.keys(platforms);
  const autoScrollPaused = useRef(false);

  useEffect(() => {
    if (platformKeys.length <= 1) return;
    const interval = setInterval(() => {
      if (autoScrollPaused.current) return;
      setActiveCardIndex(prev => {
        const next = (prev + 1) % platformKeys.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [platformKeys.length]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const diffDays = Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Tomorrow, ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  };

  const formatDuration = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: contentPadding }]}
      contentContainerStyle={[styles.scrollContent, { maxWidth: maxContentWidth, alignSelf: 'center' }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      {/* Platform Rating Cards */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>YOUR RATINGS</Text>
      </Animated.View>

      {platformKeys.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Ionicons name="person-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No platforms enabled yet</Text>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <FlatList
            ref={carouselRef}
            data={platformKeys}
            keyExtractor={(item) => item}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingRight: 0 }}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            onScrollBeginDrag={() => { autoScrollPaused.current = true; }}
            onScrollEndDrag={() => { autoScrollPaused.current = false; }}
            renderItem={({ item: key }) => {
              const p = platforms[key];
              const color = PLATFORM_COLORS[key];
              const icon = PLATFORM_ICONS[key];
              const label = PLATFORM_LABELS[key];

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Ratings', { tab: label })}
                  style={{ width: CARD_WIDTH, marginRight: 12 }}
                >
                  <LinearGradient
                    colors={[color + '18', colors.cardGradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.ratingCard, { borderWidth: 1, borderColor: color + '25', ...Platform.select({ ios: { shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 3 } }) }]}
                  >
                    <View style={styles.ratingCardHeader}>
                      <View style={[styles.platformBadge, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={18} color={color} />
                        <Text style={[styles.platformBadgeText, { color }]}>{label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>

                    <View style={styles.statsGrid}>
                      {key === 'leetcode' && (
                        <>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.rating != null ? p.rating : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Rating</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.topPercent != null ? `${p.topPercent.toFixed(1)}%` : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Top</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.contests != null ? p.contests : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Contests</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.solved || '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Solved</Text>
                          </View>
                        </>
                      )}

                      {key === 'codeforces' && (
                        <>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.rating != null ? p.rating : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Rating</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.maxRating != null ? p.maxRating : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Max Rating</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.contests != null ? p.contests : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Contests</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.rank || '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Rank</Text>
                          </View>
                        </>
                      )}

                      {key === 'codechef' && (
                        <>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.rating != null ? p.rating : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Rating</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.stars ? `${p.stars}★` : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Stars</Text>
                          </View>
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{p.contests != null ? p.contests : '—'}</Text>
                            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Contests</Text>
                          </View>
                          <View style={styles.gridItem} />
                        </>
                      )}
                    </View>

                    {!p.username && (
                      <View style={[styles.noUserBanner, { backgroundColor: color + '15' }]}>
                        <Ionicons name="information-circle-outline" size={16} color={color} />
                        <Text style={[styles.noUserText, { color }]}>Tap to set username and fetch data</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            }}
          />
          {platformKeys.length > 1 && (
            <View style={styles.dotsContainer}>
              {platformKeys.map((key, i) => (
                <View
                  key={key}
                  style={[
                    styles.dot,
                    { backgroundColor: i === activeCardIndex ? PLATFORM_COLORS[key] : colors.border },
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* Upcoming Contests */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UPCOMING CONTESTS</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Ratings', { tab: 'Contests' })}
            disabled={loading}
            style={loading ? { opacity: 0.5 } : null}
          >
            <Text style={[styles.seeAll, { color: accent }]}>See all</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {contests.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Ionicons name="trophy-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming contests</Text>
        </View>
      ) : (
        contests.map((contest, index) => {
          const pColor = {
            LeetCode: PLATFORM_COLORS.leetcode,
            Codeforces: PLATFORM_COLORS.codeforces,
            CodeChef: PLATFORM_COLORS.codechef,
          }[contest.platform];
          const pIcon = {
            LeetCode: PLATFORM_ICONS.leetcode,
            Codeforces: PLATFORM_ICONS.codeforces,
            CodeChef: PLATFORM_ICONS.codechef,
          }[contest.platform];

          return (
            <Animated.View key={contest.id} entering={FadeInDown.duration(400).delay(450 + index * 60)}>
              <View style={[styles.contestCard, { backgroundColor: colors.card, ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 }, android: { elevation: 2 } }) }]}>
                <View style={styles.contestLeft}>
                  <View style={[styles.contestDot, { backgroundColor: pColor }]} />
                  <View style={styles.contestInfo}>
                    <Text style={[styles.contestName, { color: colors.textPrimary }]} numberOfLines={1}>{contest.name}</Text>
                    <View style={styles.contestMeta}>
                      <View style={[styles.contestPlatformBadge, { backgroundColor: pColor + '18' }]}>
                        <Ionicons name={pIcon} size={11} color={pColor} />
                        <Text style={[styles.contestPlatformText, { color: pColor }]}>{contest.platform}</Text>
                      </View>
                      <Text style={[styles.contestDate, { color: colors.textSecondary }]}>{formatDate(contest.startTime)}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.contestDuration, { color: colors.textSecondary }]}>{formatDuration(contest.duration)}</Text>
              </View>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  seeAll: { fontSize: 15, fontWeight: '600' },

  ratingCard: { borderRadius: 16, padding: 18 },
  ratingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  platformBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  platformBadgeText: { fontSize: 15, fontWeight: '600', marginLeft: 6 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', paddingVertical: 8, alignItems: 'center' },
  gridValue: { fontSize: 24, fontWeight: '800' },
  gridLabel: { fontSize: 13, marginTop: 2 },

  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },

  noUserBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginTop: 14, gap: 8 },
  noUserText: { fontSize: 15, fontWeight: '500' },

  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 15, marginTop: 8 },

  contestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, marginBottom: 10 },
  contestLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  contestDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  contestInfo: { flex: 1 },
  contestName: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
  contestMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contestPlatformBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, gap: 4 },
  contestPlatformText: { fontSize: 13, fontWeight: '600' },
  contestDate: { fontSize: 14 },
  contestDuration: { fontSize: 14, fontWeight: '500' },
});
