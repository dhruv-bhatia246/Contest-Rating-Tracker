import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
const screenWidth = Dimensions.get("window").width;

export const LeetcodeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [lcData, setLcData] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUserName] = useState();
  const [showDialog, setShowDialog] = useState(false);
  const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql'
  const QUERY = `
    query {     
      userContestRanking(username:  "${username}") 
      {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage    
      }
      userContestRankingHistory(username: "${username}")
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
      matchedUser(username: "${username}") {
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
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const fetchData = async () => {
    try {
      if (username !== undefined) {
        fetch(LEETCODE_API_ENDPOINT, init)
          .then(res => res.json())
          .then((response) => {
            if (response?.data.matchedUser !== null) {
              setLcData(response?.data)
              setLoading(false)
            } else {
              Alert.alert('Error', 'Enter Valid Username')
              setShowDialog(true);
            }
          })
          .catch((error) => setError(error))
      }
    } catch (e) {
      setError(e);
    }
  }

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const value = await AsyncStorage.getItem('lcusername')
        if (value !== null) {
          setUserName(value);
        } else {
          setShowDialog(true);
        }
      } catch (e) {
        setError(e);
      }
    }

    fetchUserName().then(() => {
      if (username !== undefined) fetchData()
    });
  }, [])

  useEffect(() => {
    if (username !== undefined) fetchData()
  }, [username]);

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
          width={Dimensions.get("window").width - 10}
          height={170}
          strokeWidth={12}
          hasLegend={true}
          withCustomBarColorFromData={true}
          radius={36}
          chartConfig={{
            backgroundGradientFromOpacity: 0.5,
            backgroundGradientToOpacity: 1,
            backgroundColor: "#1b1b21",
            backgroundGradientFrom: "#1b1b21",
            backgroundGradientTo: "#1b1b21",
            decimalPlaces: 2,
            color: (opacity = 1, _index) => `rgba(255,255,255,${opacity})`,
          }}
          style={{ marginVertical: 8, borderRadius: 10, marginLeft: -60 }}
        />
      </View>
    );
  }

  const getData = () => {
    if (loading) {
      return <ActivityIndicator size="large" />
    }
    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }
    for (let i = 0; i < lcData?.userContestRankingHistory?.length; i++) {
      // console.log(lcData?.userContestRankingHistory[i].rating);
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
    return <View style={{ marginTop: 40 }}>
      <View style={styles.outer}><Text style={styles.text}>{username}</Text></View>
      <View style={styles.outer}><Text style={styles.text}>Rating: {Math.round(contestRatings[contestRatings.length - 1])}</Text></View>
      <View style={styles.outer}><Text style={styles.text}>Top: {lcData?.userContestRanking?.topPercentage}%</Text></View>
      <LineChart
        data={{ datasets: [{ data: contestRatings }] }}
        width={screenWidth - 20}
        height={250}
        chartConfig={chartConfig}
        bezier
        style={{
          marginTop: 20,
          borderRadius: 12,
          marginLeft: -15,
        }}
      />
      {ProgressRing()}
    </View>
  }

  const data = {
    labels: ["Hard", "Medium", "Easy"],
    data: percData,
    colors: ["Red", "Orange", "Green"]
  };

  const chartConfig = {
    backgroundColor: "#1b1b21",
    backgroundGradientFrom: "#1b1b21",
    backgroundGradientTo: "#1b1b21",
    fillShadowGradientFromOpacity: "0.3",
    fillShadowGradientFromOffset: "0.1",
    fillShadowGradientFrom: "#3df53d",
    fillShadowGradientTo: "#3df53d",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "2",
      strokeWidth: "2",
      stroke: "#f5e320"
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
    },
  }

  return (
    <SafeAreaView style={styles.container}>
      {showDialog && <DialogInput isDialogVisible={showDialog}
        title={"Enter LeetCode Username"}
        hintInput={"Type Here"}
        submitInput={async (inputText) => {
          await setUserName(inputText)
          AsyncStorage.setItem('lcusername', inputText)
          setShowDialog(false);
        }}
        closeDialog={() => {
          if (username !== undefined) setShowDialog(false)
          else Alert.alert('Username Required', 'Please enter a valid username!');
        }}>
      </DialogInput>}
      {loading ? getData() : <ScrollView style={{ height: "100%" }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {getData()}
      </ScrollView>}
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1b1b21'
  },
  text: {
    color: 'white',
    textAlign: "center",
    fontWeight: "400",
    paddingVertical: 10,
    fontSize: 20,
  },
  outer: {
    backgroundColor: "#373742",
    borderRadius: 10,
    margin: 10,
    shadowColor: "#008efa",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 2
  }
})