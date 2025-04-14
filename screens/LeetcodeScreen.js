import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons, FontAwesome } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import DialogInput from 'react-native-dialog-input';
import userIcon from '../assets/user.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer, VictoryScatter, VictoryZoomContainer, createContainer } from 'victory-native';
const screenWidth = Dimensions.get("window").width;

// Create a combined container for both zoom and tooltip functionality
const VictoryZoomVoronoiContainer = createContainer("zoom", "voronoi");

export const LeetcodeScreen = ({ navigation, lcusername, setLcUsername }) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [lcData, setLcData] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql'
  const QUERY = `
    query {     
      userContestRanking(username:  "${lcusername}") 
      {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage    
      }
      userContestRankingHistory(username: "${lcusername}")
      {
        attended
        trendDirection
        problemsSolved
        totalProblems
        finishTimeInSeconds
        rating
        ranking
        contest 
        {
          title
          startTime
        }
      }
      matchedUser(username: "${lcusername}") {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum {
          difficulty
          count
          submissions
          }
        }
        problemsSolvedBeatsStats{
          difficulty
          percentage
        }
        profile{
          ranking
          userAvatar
        }
      }
      allQuestionsCount{
        difficulty
        count
      }
    }`
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  }
  var contestRatings = [];
  var quesStats = [];
  var allQuesStats = [];
  var percData = [];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (isFocused) {
      const now = Date.now();
      // Only fetch if we haven't fetched in the last 5 minutes or if we're refreshing
      if (now - lastFetchTime > CACHE_DURATION || refreshing) {
        setLoading(true);
        fetchData();
      }
    }
  }, [isFocused, refreshing]);

  const fetchData = async () => {
    try {
      const response = await fetch(LEETCODE_API_ENDPOINT, init);
      const data = await response.json();
      setLcData(data.data);
      setLastFetchTime(Date.now());
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserName = async () => {
    try {
      const value = await AsyncStorage.getItem('lcusername')
      if (value !== null) {
        await setLcUsername(value);
      } else {
        setShowDialog(true);
      }
    } catch (e) {
      setError(e);
    }
  }

  useEffect(() => {
    fetchUserName().then(() => {
      if (lcusername !== undefined) {
        setLoading(true);
        fetchData();
      }
    });
  }, [lcusername])

  function ProgressRing() {
    const data = {
      labels: ["Hard", "Medium", "Easy"],
      data: percData,
      colors: [
        "rgb(239,70,67)",
        "rgb(254,193,29)",
        "rgb(0,184,163)",
      ],
    };
    return (
      <View>
        <ProgressChart
          data={data}
          width={Dimensions.get("window").width}
          height={170}
          strokeWidth={12}
          hasLegend={true}
          withCustomBarColorFromData={true}
          radius={36}
          chartConfig={{
            backgroundGradientFromOpacity: 0.5,
            backgroundGradientToOpacity: 1,
            backgroundColor: "#1D1C21",
            backgroundGradientFrom: "#1D1C21",
            backgroundGradientTo: "#1D1C21",
            decimalPlaces: 2,
            color: (opacity = 1, _index) => `rgba(255,255,255,${opacity})`,
          }}
          style={{ marginVertical: 15, borderRadius: 10, marginLeft: -80 }}
        />
      </View>
    );
  }

  const getData = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color="#3B82F6" />
    }
    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }
    for (let i = 0; i < lcData?.userContestRankingHistory?.length; i++) {
      if (lcData?.userContestRankingHistory[i]?.attended === true) {
        contestRatings.push(lcData?.userContestRankingHistory[i].rating);
      }
    }
    for (let i = 1; i < lcData?.matchedUser?.submitStats?.acSubmissionNum?.length; i++) {
      quesStats.push(lcData?.matchedUser?.submitStats?.acSubmissionNum[i]?.count);
    }
    for (let i = 1; i < lcData?.allQuestionsCount?.length; i++) {
      allQuesStats.push(lcData?.allQuestionsCount[i]?.count);
    }
    for (let i = 1; i <= 3; i++) {
      if (percData.length < 3 && quesStats.length >= 3 && allQuesStats.length >= 3) {
        percData.push(quesStats[2] / allQuesStats[2]);
        percData.push(quesStats[1] / allQuesStats[1]);
        percData.push(quesStats[0] / allQuesStats[0]);
      }
    }
    return <View style={{ marginTop: 30, marginBottom: 80, alignItems: 'center', width: '100%' }}>
      <View style={{ marginBottom: 10, borderColor: 'orange', borderWidth: 3, borderRadius: 60, padding: 5 }}>
        <Avatar size="large" rounded source={lcData?.titlePhoto ? { uri: lcData?.matchedUser.profile.userAvatar } : userIcon} />
      </View>
      {lcData?.matchedUser.username ? <View><Text style={{ color: 'white', fontWeight: "400", fontSize: 30, marginTop: 20 }}>Hello {lcData?.matchedUser.username}</Text></View> : null}
      <View><Text style={{ color: 'white', fontWeight: "400", marginBottom: 20, fontSize: 20 }}>Welcome Back!</Text></View>
      {contestRatings[contestRatings.length - 1] ? <View style={{ ...styles.outer, backgroundColor: "#E6DFF1", shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rating: {Math.round(contestRatings[contestRatings.length - 1])}</Text></View> : null}
      {lcData?.matchedUser.profile.ranking ? <View style={{ ...styles.outer, backgroundColor: "#F1DFDE", shadowColor: '#F1DFDE', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rank: {lcData?.matchedUser.profile.ranking}</Text></View> : null}
      {lcData?.userContestRanking?.topPercentage ? <View style={{ ...styles.outer, backgroundColor: '#C0DEDD', shadowColor: '#C0DEDD', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Top: {lcData?.userContestRanking?.topPercentage}%</Text></View> : null}
      <View>{ProgressRing()}</View>
      {lcData?.userContestRanking?.topPercentage ? 
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Rating History</Text>
          <VictoryChart
            theme={VictoryTheme.material}
            width={screenWidth - 40}
            height={220}
            padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
            containerComponent={
              <VictoryZoomVoronoiContainer
                labels={({ datum }) => `Contest #${datum.x}\nRating: ${Math.round(datum.y)}`}
                zoomDimension="x"
                minimumZoom={{ x: 1, y: 1 }}
                downsample={10}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{
                      stroke: "#2563EB",
                      fill: "rgba(37, 99, 235, 0.9)",
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
              animate={{
                duration: 2000,
                onLoad: { duration: 1000 }
              }}
              style={{
                data: { 
                  stroke: "#2563EB",
                  strokeWidth: 2,
                }
              }}
              data={contestRatings.map((rating, index) => ({
                x: index + 1,
                y: rating
              }))}
            />
            <VictoryScatter
              data={contestRatings.map((rating, index) => ({
                x: index + 1,
                y: rating
              }))}
              size={4}
              style={{
                data: {
                  fill: "#1A1B1E",
                  stroke: "#2563EB",
                  strokeWidth: 2
                }
              }}
            />
          </VictoryChart>
          
          {/* Optional: Add a legend or stats below the chart */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Highest</Text>
              <Text style={styles.statValue}>
                {Math.max(...contestRatings)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>
                {Math.round(contestRatings.reduce((a, b) => a + b, 0) / contestRatings.length)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Contests</Text>
              <Text style={styles.statValue}>
                {contestRatings.length}
              </Text>
            </View>
          </View>
        </View> 
      : null}
    </View>
  }

  const data = {
    labels: ["Hard", "Medium", "Easy"],
    data: percData,
    colors: ["Red", "Orange", "Green"]
  };

  const chartConfig = {
    backgroundColor: "#1A1B1E",
    backgroundGradientFrom: "#1A1B1E",
    backgroundGradientTo: "#1A1B1E",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#2563EB"
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      strokeDasharray: "6",
      stroke: "rgba(255, 255, 255, 0.1)",
    },
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* {showDialog && <DialogInput isDialogVisible={showDialog}
        title={"Enter LeetCode Username"}
        hintInput={"Type Here"}
        submitInput={async (inputText) => {
          await setShowDialog(false);
          await AsyncStorage.setItem('lcusername', inputText)
          await setLcUsername(inputText)
        }}
        closeDialog={() => {
          if (lcusername !== undefined) setShowDialog(false)
          else Alert.alert('Username Required', 'Please enter a valid username!');
        }}>
      </DialogInput>} */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{
          alignItems: 'center',
          width: '100%',
          paddingBottom: 20
        }}
        style={{ 
          width: '100%'
        }} 
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
    shadowColor: "#2563EB",
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
    shadowColor: "#2563EB",
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
})