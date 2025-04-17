import React, { useState, useEffect } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Share } from 'react-native'
import { useIsFocused } from "@react-navigation/native";
import { FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { CustomLoader } from '../components/CustomLoader';
import { CustomRefreshControl } from '../components/CustomRefreshControl';
import { OfflineError } from '../components/OfflineError';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

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
  const isConnected = useNetworkStatus();
  const [allContests, setAllContests] = useState([]);
  const [error, setError] = useState(null);
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
    let cfContests = [], lcContests = [], ccContests = [];

    try {
      // Fetch Codeforces contests
      try {
        const cfResponse = await fetch('https://codeforces.com/api/contest.list');
        if (!cfResponse.ok) {
          console.error('Codeforces API error:', cfResponse.status, cfResponse.statusText);
          throw new Error(`Codeforces API error: ${cfResponse.status}`);
        }
        const cfText = await cfResponse.text();
        if (cfText.includes('<!DOCTYPE html>')) {
          console.error('Codeforces returned HTML instead of JSON');
          throw new Error('Codeforces API unavailable');
        }
        const cfData = JSON.parse(cfText);
        cfContests = cfData.result.map(contest => ({
          ...contest,
          platform: 'Codeforces'
        }));
      } catch (cfError) {
        console.error('Codeforces fetch error:', cfError);
      }

      // Fetch LeetCode contests
      try {
        const lcResponse = await fetch(LEETCODE_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Rating Tracker App'
          },
          body: JSON.stringify({
            query: LEETCODE_QUERY
          }),
        });
        if (!lcResponse.ok) {
          console.error('LeetCode API error:', lcResponse.status, lcResponse.statusText);
          throw new Error(`LeetCode API error: ${lcResponse.status}`);
        }
        const lcText = await lcResponse.text();
        if (lcText.includes('<!DOCTYPE html>')) {
          console.error('LeetCode returned HTML instead of JSON. Response:', lcText.substring(0, 200));
          throw new Error('LeetCode API unavailable');
        }
        const lcData = JSON.parse(lcText);
        if (lcData?.data?.allContests) {
          lcContests = lcData.data.allContests.map(contest => ({
            ...contest,
            platform: 'LeetCode',
            startTimeSeconds: new Date(contest.startTime).getTime() / 1000,
            durationSeconds: contest.duration * 60,
            name: contest.title
          }));
        }
      } catch (lcError) {
        console.error('LeetCode fetch error:', lcError);
      }

      // Fetch CodeChef contests using their proxy API
      try {
        const ccResponse = await fetch('https://codechef-api.vercel.app/contests');
        if (!ccResponse.ok) {
          console.error('CodeChef API error:', ccResponse.status, ccResponse.statusText);
          throw new Error(`CodeChef API error: ${ccResponse.status}`);
        }
        const ccText = await ccResponse.text();
        if (ccText.includes('<!DOCTYPE html>')) {
          console.error('CodeChef returned HTML instead of JSON');
          throw new Error('CodeChef API unavailable');
        }
        const ccData = JSON.parse(ccText);
        if (ccData.success) {
          ccContests = [...(ccData.future_contests || []), ...(ccData.present_contests || [])].map(contest => ({
            ...contest,
            platform: 'CodeChef',
            startTimeSeconds: new Date(contest.start_date || contest.startDate).getTime() / 1000,
            durationSeconds: contest.duration * 60,
            name: contest.name || contest.contest_name
          }));
        }
      } catch (ccError) {
        console.error('CodeChef fetch error:', ccError);
      }

      // Combine all available contests
      const allContests = [...cfContests, ...lcContests, ...ccContests];
      
      if (allContests.length === 0) {
        throw new Error('Could not fetch contests from any platform. Please try again later.');
      }

      setAllContests(allContests);
      setLastFetchTime(Date.now());
      setError(null);

      // Schedule notifications for upcoming contests
      if (notifyUpcoming || notifyStarting) {
        allContests.forEach(contest => {
          const status = getContestStatus(contest);
          if (status.status === 'Upcoming') {
            scheduleContestNotification(contest);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const shareContest = async (contest) => {
    try {
      const { status, color, platform } = getContestStatus(contest);
      const startTime = formatDate(contest.startTimeSeconds * 1000 || contest.startTime);
      const duration = formatDuration(contest.durationSeconds || contest.duration);
      
      // Get platform-specific contest link
      let contestLink = '';
      switch (platform) {
        case 'LeetCode':
          contestLink = `https://leetcode.com/contest/${contest.titleSlug}`;
          break;
        case 'Codeforces':
          contestLink = `https://codeforces.com/contest/${contest.id}`;
          break;
        case 'CodeChef':
          contestLink = `https://www.codechef.com/${contest.code}`;
          break;
        default:
          contestLink = '';
      }
      
      const message = `🎯 ${contest.name || contest.title}\n\n` +
        `🏆 Platform: ${platform}\n` +
        `📅 Date: ${startTime}\n` +
        `⏱ Duration: ${duration}\n` +
        `📊 Status: ${status}\n\n` +
        `🔗 Contest Link: ${contestLink}\n\n` +
        `Check out this contest on Rating Tracker!`;

      await Share.share({
        message,
        title: 'Share Contest',
      });
    } catch (error) {
      console.error('Error sharing contest:', error);
      Alert.alert(
        'Sharing Error',
        'Unable to share contest details. Please check:\n\n• Your internet connection\n• If the contest link is valid\n\nWould you like to try again?',
        [
          { 
            text: 'Try Again', 
            onPress: () => shareContest(contest)
          },
          { 
            text: 'Cancel', 
            style: 'cancel'
          }
        ]
      );
    }
  };

  const addToCalendar = async (contest) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant calendar access to add contests to your calendar');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No calendar found');
        return;
      }

      const startTime = new Date(contest.startTimeSeconds * 1000 || contest.startTime);
      const endTime = new Date(startTime.getTime() + (contest.durationSeconds || contest.duration) * 1000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `${contest.name || contest.title} - ${contest.platform}`,
        startDate: startTime,
        endDate: endTime,
        timeZone: 'UTC',
        notes: `Contest Link: ${getContestLink(contest)}`,
        location: getContestLink(contest),
      });

      Alert.alert('Success', 'Contest added to your calendar');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert(
        'Calendar Error',
        'Unable to add contest to calendar. Please check:\n\n• Calendar permissions are granted\n• Your calendar is accessible\n\nWould you like to try again?',
        [
          { 
            text: 'Try Again', 
            onPress: () => addToCalendar(contest)
          },
          { 
            text: 'Cancel', 
            style: 'cancel'
          }
        ]
      );
    }
  };

  const getContestLink = (contest) => {
    switch (contest.platform) {
      case 'LeetCode':
        return `https://leetcode.com/contest/${contest.titleSlug}`;
      case 'Codeforces':
        return `https://codeforces.com/contest/${contest.id}`;
      case 'CodeChef':
        return `https://www.codechef.com/${contest.code}`;
      default:
        return '';
    }
  };

  const setReminder = async (contest) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant notification access to set reminders');
        return;
      }

      const startTime = contest.startTimeSeconds * 1000 || contest.startTime;
      const now = Date.now();
      const timeUntilStart = startTime - now;

      // Don't set reminder if contest has already started
      if (timeUntilStart <= 0) {
        Alert.alert('Error', 'Contest has already started');
        return;
      }

      // Get notification settings
      const notifyUpcoming = await AsyncStorage.getItem('notifyUpcoming');
      const notifyStarting = await AsyncStorage.getItem('notifyStarting');
      const upcomingTime = await AsyncStorage.getItem('upcomingNotificationTime') || '24';
      const startingTime = await AsyncStorage.getItem('startingNotificationTime') || '30';

      let remindersSet = [];

      // Schedule upcoming notification if enabled and enough time
      if (notifyUpcoming !== 'false') {
        const upcomingTimeMs = parseInt(upcomingTime) * 60 * 60 * 1000; // hours to ms
        if (timeUntilStart > upcomingTimeMs) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Upcoming Contest',
              body: `${contest.name || contest.title} starts in ${upcomingTime} hours!`,
              data: { contestLink: getContestLink(contest) },
            },
            trigger: {
              date: new Date(startTime - upcomingTimeMs),
            },
          });
          remindersSet.push(`${upcomingTime} hours`);
        }
      }

      // Schedule starting soon notification if enabled and enough time
      if (notifyStarting !== 'false') {
        const startingTimeMs = parseInt(startingTime) * 60 * 1000; // minutes to ms
        if (timeUntilStart > startingTimeMs) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Contest Starting Soon!',
              body: `${contest.name || contest.title} starts in ${startingTime} minutes!`,
              data: { contestLink: getContestLink(contest) },
            },
            trigger: {
              date: new Date(startTime - startingTimeMs),
            },
          });
          remindersSet.push(`${startingTime} minutes`);
        }
      }

      if (remindersSet.length === 0) {
        Alert.alert('Error', 'No reminders could be set. Contest may be too soon or notification settings are disabled.');
      } else {
        Alert.alert('Success', `Reminders set for ${remindersSet.join(' and ')} before contest`);
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      Alert.alert(
        'Reminder Error',
        'Unable to set contest reminder. Please check:\n\n• Notification permissions are granted\n• Your notification settings\n\nWould you like to try again?',
        [
          { 
            text: 'Try Again', 
            onPress: () => setReminder(contest)
          },
          { 
            text: 'Cancel', 
            style: 'cancel'
          }
        ]
      );
    }
  };

  const getData = () => {
    if (!isConnected) {
      return <OfflineError onRetry={fetchAllContests} />;
    }

    if (loading && !refreshing) {
      return (
        <View style={styles.loaderContainer}>
          <CustomLoader size="large" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.includes('API error') 
              ? 'Unable to fetch contests. Please check your internet connection and try again.'
              : 'An unexpected error occurred. Please try again later.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchAllContests}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
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
    }).slice(0, 3); // Limit to 5 most recent finished contests

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
            const isUpcoming = status === 'Upcoming';
            
            return (
              <View key={`${platform}-${contest.id || contest.titleSlug}`} style={styles.contestCard}>
                <View style={styles.contestHeader}>
                  <View style={styles.platformBadge}>
                    <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
                    <Text style={[styles.platformText, { color: platformColor }]}>{platform}</Text>
                  </View>
                  <View style={styles.headerRight}>
                    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.statusText, { color: color }]}>{status}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.shareButton}
                      onPress={() => shareContest(contest)}
                    >
                      <MaterialIcons name="share" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
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
                {isUpcoming && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => addToCalendar(contest)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                      <Text style={styles.actionButtonText}>Add to Calendar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => setReminder(contest)}
                    >
                      <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
                      <Text style={styles.actionButtonText}>Remind Me</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
  },
});