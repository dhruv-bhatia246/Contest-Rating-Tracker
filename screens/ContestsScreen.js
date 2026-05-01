import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

const PAGE_SIZE = 10;

const PLATFORM_COLORS = {
  LeetCode: '#FFA116',
  Codeforces: '#4fc3f7',
  CodeChef: '#66bb6a',
};

const PLATFORM_ICONS = {
  LeetCode: 'code-slash',
  Codeforces: 'globe-outline',
  CodeChef: 'restaurant-outline',
};

export const ContestsScreen = () => {
  const { colors, accent } = useTheme();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [reminders, setReminders] = useState({});

  useEffect(() => {
    loadReminders();
    fetchAllContests();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem('contest_reminders');
      if (stored) setReminders(JSON.parse(stored));
    } catch (e) {}
  };

  const saveReminders = async (updated) => {
    setReminders(updated);
    await AsyncStorage.setItem('contest_reminders', JSON.stringify(updated));
  };

  const fetchAllContests = async () => {
    try {
      const [cfContests, lcContests, ccContests] = await Promise.all([
        fetchCodeforcesContests(),
        fetchLeetcodeContests(),
        fetchCodechefContests(),
      ]);
      const all = [...cfContests, ...lcContests, ...ccContests]
        .filter(c => c.startTime > Date.now())
        .sort((a, b) => a.startTime - b.startTime);
      setContests(all);
    } catch (e) {
      console.warn('Failed to fetch contests', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCodeforcesContests = async () => {
    try {
      const res = await fetch('https://codeforces.com/api/contest.list');
      const json = await res.json();
      if (json.status !== 'OK') return [];
      return json.result
        .filter(c => c.phase === 'BEFORE')
        .map(c => ({
          id: `cf_${c.id}`,
          name: c.name,
          platform: 'Codeforces',
          startTime: c.startTimeSeconds * 1000,
          duration: c.durationSeconds * 1000,
          url: `https://codeforces.com/contest/${c.id}`,
        }));
    } catch (e) {
      return [];
    }
  };

  const fetchLeetcodeContests = async () => {
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ allContests { title titleSlug startTime duration } }`,
        }),
      });
      const json = await res.json();
      const now = Date.now();
      return (json?.data?.allContests || [])
        .filter(c => c.startTime * 1000 > now)
        .map(c => ({
          id: `lc_${c.titleSlug}`,
          name: c.title,
          platform: 'LeetCode',
          startTime: c.startTime * 1000,
          duration: c.duration * 1000,
          url: `https://leetcode.com/contest/${c.titleSlug}`,
        }));
    } catch (e) {
      return [];
    }
  };

  const fetchCodechefContests = async () => {
    try {
      const res = await fetch('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all');
      const json = await res.json();
      const upcoming = json?.future_contests || [];
      return upcoming.map(c => ({
        id: `cc_${c.contest_code}`,
        name: c.contest_name,
        platform: 'CodeChef',
        startTime: new Date(c.contest_start_date_iso).getTime(),
        duration: c.contest_duration * 60 * 1000,
        url: `https://www.codechef.com/${c.contest_code}`,
      }));
    } catch (e) {
      return [];
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setDisplayCount(PAGE_SIZE);
    fetchAllContests().finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (displayCount < contests.length) {
      setDisplayCount(prev => prev + PAGE_SIZE);
    }
  };

  const toggleReminder = async (contest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const key = contest.id;

    if (reminders[key]) {
      // Cancel existing reminder
      try {
        await Notifications.cancelScheduledNotificationAsync(reminders[key]);
      } catch (e) {}
      const updated = { ...reminders };
      delete updated[key];
      await saveReminders(updated);
      Alert.alert('Reminder Removed', `Reminder for "${contest.name}" has been cancelled.`);
    } else {
      // Read user's preferred reminder time
      const savedMinutes = await AsyncStorage.getItem('reminder_minutes');
      const minutes = parseInt(savedMinutes) || 30;
      const triggerTime = contest.startTime - minutes * 60 * 1000;
      if (triggerTime <= Date.now()) {
        Alert.alert('Too Late', `This contest starts in less than ${minutes} minutes.`);
        return;
      }
      const label = minutes >= 60 ? (minutes >= 1440 ? '1 day' : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`) : `${minutes} minutes`;
      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${contest.platform} Contest Starting Soon`,
            body: `"${contest.name}" starts in ${label}!`,
            sound: 'default',
          },
          trigger: { date: new Date(triggerTime) },
        });
        const updated = { ...reminders, [key]: notifId };
        await saveReminders(updated);
        Alert.alert('Reminder Set', `You'll be notified ${label} before "${contest.name}".`);
      } catch (e) {
        Alert.alert('Error', 'Failed to schedule reminder.');
      }
    }
  };

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = timestamp - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Tomorrow, ${time}`;
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${date}, ${time}`;
  };

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const renderContest = ({ item, index }) => {
    const platformColor = PLATFORM_COLORS[item.platform];
    const hasReminder = !!reminders[item.id];

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(Math.min(index * 60, 300))}>
        <View style={[styles.contestCard, { backgroundColor: colors.card, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 }]}>
          <View style={styles.contestHeader}>
            <View style={[styles.platformBadge, { backgroundColor: platformColor + '20' }]}>
              <Ionicons name={PLATFORM_ICONS[item.platform]} size={14} color={platformColor} />
              <Text style={[styles.platformText, { color: platformColor }]}>{item.platform}</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleReminder(item)}
              style={[styles.reminderButton, { backgroundColor: hasReminder ? accent + '22' : colors.surface }]}
            >
              <Ionicons name={hasReminder ? 'notifications' : 'notifications-outline'} size={18} color={hasReminder ? accent : colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.contestName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.contestDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatDate(item.startTime)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatDuration(item.duration)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (displayCount >= contests.length) return null;
    return (
      <ActivityIndicator style={{ paddingVertical: 20 }} color={accent} />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : contests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No upcoming contests found</Text>
        </View>
      ) : (
        <FlatList
          data={contests.slice(0, displayCount)}
          keyExtractor={(item) => item.id}
          renderItem={renderContest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 120 },
  contestCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  contestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  platformBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  platformText: { fontSize: 12, fontWeight: '600', marginLeft: 5 },
  reminderButton: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  contestName: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  contestDetails: { flexDirection: 'row', gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 13 },
});
