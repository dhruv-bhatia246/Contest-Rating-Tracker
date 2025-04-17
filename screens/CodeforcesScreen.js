import React, { useEffect, useState } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { useIsFocused } from "@react-navigation/native";
import userIcon from '../assets/user.png';
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter, VictoryTooltip, VictoryVoronoiContainer, VictoryZoomContainer, createContainer } from 'victory-native';
import { CustomLoader } from '../components/CustomLoader';
import { CustomRefreshControl } from '../components/CustomRefreshControl';
import { OfflineError } from '../components/OfflineError';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const screenWidth = Dimensions.get("window").width;

// Create a combined container for both zoom and tooltip functionality
const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const fetchWithRetry = async (url, options, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const CodeforcesScreen = ({ navigation, cfusername, setCfUsername }) => {
  const isFocused = useIsFocused();
  const isConnected = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cfData, setCfData] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const capitalizeFirstLetter = (string) => {
    return string ? string.charAt(0).toUpperCase() + string.slice(1).toLowerCase() : 'Newbie';
  };

  // Initialize username from AsyncStorage if not provided
  useEffect(() => {
    const initUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('cfusername');
        if (storedUsername && !cfusername) {
          setCfUsername(storedUsername);
        } else if (!storedUsername && !cfusername) {
          setShowDialog(true);
        }
      } catch (e) {
        console.error('Error initializing username:', e);
        setError(e.message);
      }
    };
    initUsername();
  }, []);

  const onRefresh = React.useCallback(() => {
    if (!cfusername) {
      setShowDialog(true);
      return;
    }
    setRefreshing(true);
    fetchData();
  }, [cfusername]);

  useEffect(() => {
    if (isFocused && cfusername) {
      const now = Date.now();
      if (now - lastFetchTime > CACHE_DURATION || refreshing) {
        setLoading(true);
        fetchData();
      }
    }
  }, [isFocused, refreshing, cfusername]);

  const fetchData = async () => {
    try {
      if (!cfusername) {
        console.log('No username provided');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [userResponse, ratingResponse] = await Promise.all([
        fetchWithRetry(`https://codeforces.com/api/user.info?handles=${cfusername}`),
        fetchWithRetry(`https://codeforces.com/api/user.rating?handle=${cfusername}`)
      ]);

      const userData = await userResponse.json();
      const ratingData = await ratingResponse.json();

      if (userData.status === 'OK' && ratingData.status === 'OK') {
        const user = userData.result[0];
        const ratings = ratingData.result;

        setCfData({
          ...user,
          ratingHistory: ratings
        });
        setLastFetchTime(Date.now());
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Codeforces API error:', error);
      setError(error.message);
      Alert.alert(
        'Connection Error',
        'Unable to connect to Codeforces. Please check:\n\n• Your internet connection\n• If Codeforces is accessible\n• Your username is correct\n\nWould you like to try again or go back to settings?',
        [
          { 
            text: 'Try Again', 
            onPress: () => fetchData()
          },
          { 
            text: 'Go to Settings', 
            onPress: () => {
              AsyncStorage.removeItem('cfusername');
              setCfUsername(undefined);
              navigation.navigate('Entry');
            }
          }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDialogSubmit = async (inputText) => {
    try {
      await AsyncStorage.setItem('cfusername', inputText);
      setCfUsername(inputText);
      setShowDialog(false);
    } catch (e) {
      console.error('Error saving username:', e);
      setError(e.message);
    }
  };

  const handleDialogClose = () => {
    if (cfusername) {
      setShowDialog(false);
    } else {
      Alert.alert('Username Required', 'Please enter a valid username!');
    }
  };

  const getData = () => {
    if (!isConnected) {
      return <OfflineError onRetry={fetchData} />;
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
              ? 'Unable to connect to Codeforces. Please check your internet connection and try again.'
              : 'An unexpected error occurred. Please try again later.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!cfData) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No data available. Please check your username and try again.
          </Text>
        </View>
      );
    }

    const ratingHistory = cfData.ratingHistory || [];
    const highestRating = ratingHistory.length > 0 
      ? Math.max(...ratingHistory.map(r => r.newRating))
      : 0;
    const averageRating = ratingHistory.length > 0
      ? Math.round(ratingHistory.reduce((a, b) => a + b.newRating, 0) / ratingHistory.length)
      : 0;
    const contestCount = ratingHistory.length;

    return (
      <View style={styles.contentContainer}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <Avatar 
              size="large" 
              rounded 
              source={cfData.titlePhoto ? { uri: cfData.titlePhoto } : userIcon}
            />
          </View>
          <Text style={styles.username}>Hello {cfusername}</Text>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          
          <View style={styles.statsBox}>
            <Text style={styles.statText}>Rating: {cfData.rating || 'N/A'}</Text>
          </View>
          
          <View style={styles.statsBox}>
            <Text style={styles.statText}>Rank: {capitalizeFirstLetter(cfData.rank)}</Text>
          </View>
        </View>

        {ratingHistory.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Rating History</Text>
            <VictoryChart
              theme={VictoryTheme.material}
              width={screenWidth - 40}
              height={220}
              padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
              containerComponent={
                <VictoryZoomVoronoiContainer
                  labels={({ datum }) => {
                    const contest = ratingHistory[datum.x - 1];
                    return `Contest #${datum.x}\nRating: ${Math.round(datum.y)}\nRank: ${contest.rank || 'N/A'}`;
                  }}
                  zoomDimension="x"
                  minimumZoom={{ x: 1, y: 1 }}
                  downsample={10}
                  labelComponent={
                    <VictoryTooltip
                      flyoutStyle={{
                        stroke: "#FF3C32",
                        fill: "rgba(255, 60, 50, 0.9)",
                      }}
                      style={{ fill: "white" }}
                      flyoutPadding={8}
                    />
                  }
                />
              }
              domainPadding={{ y: 20 }}
            >
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: "rgba(255,255,255,0.1)" },
                  tickLabels: { fill: "rgba(255,255,255,0.6)", fontSize: 12 },
                  grid: { stroke: "rgba(255,255,255,0.05)" }
                }}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: "rgba(255,255,255,0.1)" },
                  tickLabels: { fill: "rgba(255,255,255,0.6)", fontSize: 12 },
                  grid: { stroke: "rgba(255,255,255,0.05)" }
                }}
              />
              <VictoryLine
                data={ratingHistory.map((item, index) => ({
                  x: index + 1,
                  y: item.newRating
                }))}
                style={{
                  data: { 
                    stroke: "#FF3C32",
                    strokeWidth: 2,
                  }
                }}
              />
              <VictoryScatter
                data={ratingHistory.map((item, index) => ({
                  x: index + 1,
                  y: item.newRating
                }))}
                size={4}
                style={{
                  data: {
                    fill: "#1A1B1E",
                    stroke: "#FF3C32",
                    strokeWidth: 2
                  }
                }}
              />
            </VictoryChart>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Highest</Text>
                <Text style={styles.statValue}>{highestRating}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>{averageRating}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Contests</Text>
                <Text style={styles.statValue}>{contestCount}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {showDialog && (
        <DialogInput
          isDialogVisible={showDialog}
          title="Enter Codeforces username"
          hintInput="Type Here"
          submitInput={handleDialogSubmit}
          closeDialog={handleDialogClose}
        />
      )}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getData()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B1E',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 10,
    borderColor: '#FF3C32',
    borderWidth: 3,
    borderRadius: 60,
    padding: 5,
  },
  username: {
    color: 'white',
    fontWeight: "400",
    fontSize: 30,
    marginTop: 20,
  },
  welcomeText: {
    color: 'white',
    fontWeight: "400",
    marginBottom: 20,
    fontSize: 20,
  },
  statsBox: {
    backgroundColor: '#2A2B2F',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    width: screenWidth - 40,
    shadowColor: "#FF3C32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 50, 0.3)',
  },
  statText: {
    color: 'white',
    fontSize: 20,
    fontWeight: "500",
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#2A2B2F',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    shadowColor: "#FF3C32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    width: '100%',
    maxWidth: screenWidth - 32,
    alignItems: 'center',
  },
  chartTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3C32',
    fontSize: 16,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  retryButton: {
    backgroundColor: '#FF3C32',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});