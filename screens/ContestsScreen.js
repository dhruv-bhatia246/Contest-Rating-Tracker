import React, { useState, useEffect } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useIsFocused } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const LEETCODE_QUERY = `
  query {
    allContests {
      title
      startTime
      duration
      status
    }
  }`;

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const screenWidth = Dimensions.get("window").width;

export const ContestScreen = (props) => {
  const isFocused = useIsFocused();
  const [allContests, setAllContests] = useState([]);
  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [notifyUpcoming, setNotifyUpcoming] = useState(true);
  const [notifyStarting, setNotifyStarting] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAllContests();
  }, []);

  useEffect(() => {
    loadSettings();
    registerForPushNotifications();
  }, []);

  // Add a new useEffect to watch for changes to showFinished setting
  useEffect(() => {
    const checkSettings = async () => {
      const showFinishedSetting = await AsyncStorage.getItem('showFinished');
      const newShowFinished = showFinishedSetting === 'true';
      
      // If the setting has changed, reload the contests
      if (newShowFinished !== showFinished) {
        setShowFinished(newShowFinished);
        setLoading(true);
        fetchAllContests();
      }
    };
    
    checkSettings();
  }, [isFocused]);

  useEffect(() => {
    if (isFocused) {
      const now = Date.now();
      // Only fetch if we haven't fetched in the last 5 minutes or if we're refreshing
      if (now - lastFetchTime > CACHE_DURATION || refreshing) {
        setLoading(true);
        fetchAllContests();
      }
    }
  }, [isFocused, refreshing]);

  const loadSettings = async () => {
    try {
      const showFinishedSetting = await AsyncStorage.getItem('showFinished');
      const notifyUpcomingSetting = await AsyncStorage.getItem('notifyUpcoming');
      const notifyStartingSetting = await AsyncStorage.getItem('notifyStarting');
      
      setShowFinished(showFinishedSetting === 'true');
      setNotifyUpcoming(notifyUpcomingSetting !== 'false');
      setNotifyStarting(notifyStartingSetting !== 'false');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      
      if (status !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted!');
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  };

  const scheduleContestNotification = async (contest) => {
    if (!notifyUpcoming && !notifyStarting) return;

    const startTime = contest.startTimeSeconds || contest.startTime;
    const now = Date.now() / 1000;
    const timeUntilStart = (typeof startTime === 'number' ? startTime : startTime / 1000) - now;

    // Don't schedule if contest has already started
    if (timeUntilStart <= 0) return;

    try {
      // Notification for upcoming contest (24 hours before)
      if (notifyUpcoming && timeUntilStart > 24 * 60 * 60) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Upcoming Contest',
            body: `${contest.name || contest.title} starts in 24 hours!`,
          },
          trigger: {
            seconds: timeUntilStart - 24 * 60 * 60,
          },
        });
      }

      // Notification for contest starting soon (30 minutes before)
      if (notifyStarting && timeUntilStart > 30 * 60) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Contest Starting Soon',
            body: `${contest.name || contest.title} starts in 30 minutes!`,
          },
          trigger: {
            seconds: timeUntilStart - 30 * 60,
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const getContestStatus = (contest) => {
    const now = Date.now() / 1000;
    const startTime = contest.startTimeSeconds || contest.startTime / 1000;
    const duration = contest.durationSeconds || contest.duration;
    const endTime = startTime + duration;

    if (now < startTime) {
      return {
        status: 'Upcoming',
        color: '#10B981', // Green
        platform: contest.platform
      };
    } else if (now >= startTime && now <= endTime) {
      return {
        status: 'Ongoing',
        color: '#3B82F6', // Blue
        platform: contest.platform
      };
    } else {
      return {
        status: 'Finished',
        color: '#6B7280', // Gray
        platform: contest.platform
      };
    }
  };

  const formatDuration = (durationSeconds) => {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'Codeforces':
        return '#FF3C32';
      case 'LeetCode':
        return '#FFA116';
      case 'CodeChef':
        return '#5B4638';
      default:
        return '#6B7280';
    }
  };

  const fetchAllContests = async () => {
    try {
      // Fetch Codeforces contests
      const cfResponse = await fetch('https://codeforces.com/api/contest.list');
      const cfData = await cfResponse.json();
      const cfContests = cfData.result.map(contest => ({
        ...contest,
        platform: 'Codeforces'
      }));

      // Fetch LeetCode contests using the new query
      const lcResponse = await fetch(LEETCODE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: LEETCODE_QUERY
        }),
      });
      const lcData = await lcResponse.json();
      const lcContests = lcData?.data?.allContests ? lcData.data.allContests.map(contest => ({
        ...contest,
        platform: 'LeetCode',
        startTimeSeconds: new Date(contest.startTime).getTime() / 1000,
        durationSeconds: contest.duration * 60,
        name: contest.title
      })) : [];

      // Fetch CodeChef contests
      const ccResponse = await fetch('https://www.codechef.com/api/list/contests/all');
      const ccData = await ccResponse.json();
      const ccContests = [...ccData.future_contests, ...ccData.present_contests].map(contest => ({
        ...contest,
        platform: 'CodeChef',
        startTimeSeconds: new Date(contest.start_date).getTime() / 1000,
        durationSeconds: contest.duration * 60,
        name: contest.contest_name
      }));

      // Combine and sort all contests
      const allContests = [...cfContests, ...lcContests, ...ccContests];
      setAllContests(allContests);
      setLastFetchTime(Date.now());

      // Schedule notifications for upcoming contests
      if (notifyUpcoming || notifyStarting) {
        allContests.forEach(contest => {
          const status = getContestStatus(contest);
          if (status.status === 'Upcoming') {
            scheduleContestNotification(contest);
          }
        });
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching contests:', error);
      setError(error.message);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getData = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color="#3B82F6" />
    }

    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }

    // Filter and sort contests
    const filteredContests = allContests.filter(contest => {
      const status = getContestStatus(contest);
      return showFinished || status.status !== 'Finished';
    }).sort((a, b) => {
      const timeA = a.startTimeSeconds || a.startTime / 1000;
      const timeB = b.startTimeSeconds || b.startTime / 1000;
      return timeA - timeB;
    });

    // Separate upcoming/ongoing contests from finished contests
    const upcomingOngoingContests = filteredContests.filter(contest => {
      const status = getContestStatus(contest);
      return status.status !== 'Finished';
    });

    const finishedContests = filteredContests.filter(contest => {
      const status = getContestStatus(contest);
      return status.status === 'Finished';
    }).sort((a, b) => {
      const timeA = a.startTimeSeconds || a.startTime / 1000;
      const timeB = b.startTimeSeconds || b.startTime / 1000;
      return timeB - timeA; // Sort finished contests in reverse chronological order
    }).slice(0, 5); // Limit to 5 most recent finished contests

    // Combine the arrays
    const displayContests = [...upcomingOngoingContests, ...finishedContests];

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>
          {showFinished ? 'All Contests' : 'Upcoming & Ongoing Contests'}
        </Text>
        <View>
          {displayContests.length ? displayContests.map((contest) => {
            const { status, color, platform } = getContestStatus(contest);
            const platformColor = getPlatformColor(platform);
            return (
              <View key={`${platform}-${contest.id || contest.titleSlug}`} style={styles.contestCard}>
                <View style={styles.contestHeader}>
                  <View style={styles.platformBadge}>
                    <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
                    <Text style={[styles.platformText, { color: platformColor }]}>{platform}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusText, { color: color }]}>{status}</Text>
                  </View>
                </View>
                <Text style={styles.contestName}>{contest.name || contest.title}</Text>
                <View style={styles.contestDetails}>
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="calendar" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>
                      {formatDate(contest.startTimeSeconds * 1000 || contest.startTime)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="clock" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>
                      {formatDuration(contest.durationSeconds || contest.duration)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }) : (
            <Text style={styles.noContestsText}>No contests found</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getData()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1B1E"
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  contestCard: {
    backgroundColor: '#2A2B2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contestName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contestDetails: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  noContestsText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  }
});