import React, { useEffect, useLayoutEffect, useState } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import userIcon from '../assets/user.png';
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer, VictoryScatter, VictoryZoomContainer, createContainer } from 'victory-native';

const screenWidth = Dimensions.get("window").width;

// Create a combined container for both zoom and tooltip functionality
const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

export const CodechefScreen = ({ navigation, ccusername, setCcUsername }) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState(null);
  const [ccData, setCcData] = useState(null);
  const [history, setHistory] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Initialize username from AsyncStorage if not provided
  useEffect(() => {
    const initUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('ccusername');
        if (storedUsername && !ccusername) {
          setCcUsername(storedUsername);
        } else if (!storedUsername && !ccusername) {
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
    if (!ccusername) {
      setShowDialog(true);
      return;
    }
    setRefreshing(true);
    fetchData();
  }, [ccusername]);

  useEffect(() => {
    if (isFocused && ccusername) {
      const now = Date.now();
      if (now - lastFetchTime > CACHE_DURATION || refreshing) {
        setLoading(true);
        fetchData();
      }
    }
  }, [isFocused, refreshing, ccusername]);

  const fetchData = async () => {
    try {
      if (!ccusername) {
        console.log('No username provided');
        setLoading(false);
        setLoading2(false);
        setRefreshing(false);
        return;
      }

      console.log(`Fetching CodeChef data for username: ${ccusername}`);
      
      const response = await fetch(`https://codechef-api.vercel.app/handle/${ccusername}`);
      
      if (!response.ok) {
        console.error(`CodeChef API error: ${response.status} ${response.statusText}`);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('CodeChef API response:', data);
      
      if (data.success) {
        const transformedData = {
          username: ccusername,
          currentRating: data.currentRating || null,
          stars: data.stars || null,
          rank: data.globalRank || data.countryRank || null,
          titlePhoto: data.profile || null,
          ratingData: data.ratingData ? data.ratingData.map(item => ({
            rating: parseInt(item.rating),
            date: `${item.getyear}-${item.getmonth}-${item.getday}`,
            contestName: item.name,
            rank: item.rank,
            color: item.color
          })).sort((a, b) => new Date(a.date) - new Date(b.date)) : []
        };
        
        setCcData(transformedData);
        setHistory(transformedData.ratingData);
        setLastFetchTime(Date.now());
        setLoading(false);
        setLoading2(false);
        setRefreshing(false);
        return;
      }
      
      console.log('CodeChef API error: Invalid response format');
      await fallbackToHtmlScraping();
    } catch (error) {
      console.error('CodeChef fetchData error:', error);
      setError(error.message);
      await fallbackToHtmlScraping();
    }
  };

  const fallbackToHtmlScraping = async () => {
    try {
      if (!ccusername) {
        throw new Error('No username provided');
      }

      console.log('Falling back to HTML scraping method');
      const htmlResponse = await fetch(`https://www.codechef.com/users/${ccusername}`);
      const htmlText = await htmlResponse.text();
      
      // Extract data from the HTML response
      const ratingMatch = htmlText.match(/rating: (\d+)/i);
      const starsMatch = htmlText.match(/stars: ([^<]+)/i);
      const rankMatch = htmlText.match(/rank: (\d+)/i);
      const avatarMatch = htmlText.match(/<img src="([^"]+)" alt="user avatar"/i);
      
      // Look for rating history data in the HTML
      const ratingHistoryMatch = htmlText.match(/var all_rating = \[(.*?)\]/s);
      let ratingHistory = [];
      
      if (ratingHistoryMatch && ratingHistoryMatch[1]) {
        try {
          const ratingHistoryText = `[${ratingHistoryMatch[1]}]`;
          const ratingHistoryData = JSON.parse(ratingHistoryText);
          ratingHistory = ratingHistoryData.map(item => ({
            rating: parseInt(item.rating) || null,
            date: item.date || null
          }));
        } catch (parseError) {
          console.error('Error parsing rating history:', parseError);
        }
      }
      
      // Create a data object with the extracted information
      const extractedData = {
        username: ccusername,
        currentRating: ratingMatch ? parseInt(ratingMatch[1]) : null,
        stars: starsMatch ? starsMatch[1].trim() : null,
        rank: rankMatch ? parseInt(rankMatch[1]) : null,
        titlePhoto: avatarMatch ? avatarMatch[1] : null,
        ratingData: ratingHistory
      };
      
      console.log('Extracted CodeChef data from HTML:', extractedData);
      
      if (!extractedData.currentRating && !extractedData.stars && !extractedData.rank) {
        throw new Error('Could not extract user data');
      }
      
      setCcData(extractedData);
      setHistory(ratingHistory);
      setLastFetchTime(Date.now());
      setLoading(false);
      setLoading2(false);
      setRefreshing(false);
      
    } catch (error) {
      console.error('CodeChef HTML scraping error:', error);
      setError(error.message);
      setLoading(false);
      setLoading2(false);
      setRefreshing(false);
      
      Alert.alert('Error', 'Could not fetch user data. Please check your username.', [
        { 
          text: 'OK', 
          onPress: () => {
            AsyncStorage.removeItem('ccusername');
            setCcUsername(undefined);
            navigation.navigate('Entry');
          }
        }
      ]);
    }
  };

  const handleDialogSubmit = async (inputText) => {
    try {
      await AsyncStorage.setItem('ccusername', inputText);
      setCcUsername(inputText);
      setShowDialog(false);
    } catch (e) {
      console.error('Error saving username:', e);
      setError(e.message);
    }
  };

  const handleDialogClose = () => {
    if (ccusername) {
      setShowDialog(false);
    } else {
      Alert.alert('Username Required', 'Please enter a valid username!');
    }
  };

  const getData = () => {
    if ((loading || loading2) && !refreshing) {
      return <ActivityIndicator size="large" color="#3B82F6" />
    }

    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }

    // Initialize ratings array from either ccData.ratingData or history
    const ratingHistory = (ccData?.ratingData || history || [])
      .filter(item => item?.rating != null)
      .map((item, index) => ({
        rating: parseInt(item.rating),
        contestName: item.contestName || `Contest ${index + 1}`,
        color: item.color || "#10B981"
      }));

    // If we don't have data yet, show a message
    if (!ccData && !loading) {
      return (
        <View style={{ marginTop: 30, marginBottom: 30, alignItems: "center", width: '100%' }}>
          <Text style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>
            No data available. Please check your username and try again.
          </Text>
        </View>
      );
    }

    // Calculate stats safely
    const highestRating = ratingHistory.length > 0 ? Math.max(...ratingHistory.map(r => r.rating)) : 0;
    const averageRating = ratingHistory.length > 0 
      ? Math.round(ratingHistory.reduce((a, b) => a + b.rating, 0) / ratingHistory.length)
      : 0;
    const contestCount = ratingHistory.length;

    return (
      <View style={{ marginTop: 30, marginBottom: 30, alignItems: "center", width: '100%' }}>
        <View style={{ marginBottom: 10, borderColor: 'orange', borderWidth: 3, borderRadius: 60, padding: 5 }}>
          <Avatar size="large" rounded source={ccData?.titlePhoto ? { uri: ccData.titlePhoto } : userIcon} />
        </View>
        {ccusername ? <View><Text style={{ color: 'white', fontWeight: "400", fontSize: 30, marginTop: 20 }}>Hello {ccusername}</Text></View> : null}
        <View><Text style={{ color: 'white', fontWeight: "400", marginBottom: 20, fontSize: 20 }}>Welcome Back!</Text></View>
        {ccData?.currentRating ? <View style={{ ...styles.outer, backgroundColor: '#E6DFF1', shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rating: {ccData.currentRating}</Text></View> : null}
        {ccData?.stars ? <View style={{ ...styles.outer, backgroundColor: '#E6DFF1', shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Stars: {ccData.stars}</Text></View> : null}
        {ccData?.rank ? <View style={{ ...styles.outer, backgroundColor: '#F1DFDE', shadowColor: '#F1DFDE', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rank: {ccData.rank}</Text></View> : null}
        {ratingHistory.length > 0 ? 
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Rating History</Text>
            <VictoryChart
              theme={VictoryTheme.material}
              width={screenWidth - 40}
              height={220}
              padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
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
                  y: item.rating
                }))}
                style={{
                  data: { 
                    stroke: "#10B981",
                    strokeWidth: 2,
                  }
                }}
              />
              <VictoryScatter
                data={ratingHistory.map((item, index) => ({
                  x: index + 1,
                  y: item.rating,
                  color: item.color
                }))}
                size={4}
                style={{
                  data: {
                    fill: "#1A1B1E",
                    stroke: ({ datum }) => datum.color,
                    strokeWidth: 2
                  }
                }}
              />
            </VictoryChart>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Highest</Text>
                <Text style={styles.statValue}>
                  {highestRating}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>
                  {averageRating}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Contests</Text>
                <Text style={styles.statValue}>
                  {contestCount}
                </Text>
              </View>
            </View>
          </View>
        : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {showDialog && (
        <DialogInput
          isDialogVisible={showDialog}
          title="Enter Codechef username"
          hintInput="Type Here"
          submitInput={handleDialogSubmit}
          closeDialog={handleDialogClose}
        />
      )}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1B1E',
  },
  text: {
    color: '#fff',
    textAlign: "center",
    fontWeight: "500",
    paddingVertical: 10,
    fontSize: 20,
  },
  outer: {
    borderRadius: 16,
    margin: 8,
    padding: 16,
    backgroundColor: '#2A2B2F',
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    width: screenWidth - 40,
  },
  chartContainer: {
    backgroundColor: '#1A1B1E',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    width: '100%',
    maxWidth: screenWidth - 32,
    alignItems: 'center',
    overflow: 'hidden'
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
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,
  },
})