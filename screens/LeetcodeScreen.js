import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons, FontAwesome } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
const screenWidth = Dimensions.get("window").width;

export const LeetcodeScreen = ({ navigation, lcusername, setLcUsername }) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [lcData, setLcData] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
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
    setLoading(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (lcusername !== undefined) {
        fetch(LEETCODE_API_ENDPOINT, init)
          .then(res => res.json())
          .then((response) => {
            if (response?.data.matchedUser !== null) {
              setLcData(response?.data)
              setLoading(false)
              setRefreshing(false);
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
      if (lcusername !== undefined) fetchData()
    });
  }, [lcusername])

  useEffect(() => {
    if (!loading) {
      fetchUserName().then(() => {
        if (lcusername !== undefined) fetchData()
      });
    }
  }, [isFocused])

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
    if (loading) {
      return <ActivityIndicator size="large" />
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
    return <View style={{ marginTop: 30, marginBottom: 80, alignItems: 'center' }}>
      <View style={{ marginBottom: 10, borderColor: 'orange', borderWidth: 3, borderRadius: 60, padding: 5 }}><Avatar size="large" rounded source={{ uri: lcData?.matchedUser.profile.userAvatar }}></Avatar></View>
      {lcData?.matchedUser.username ? <View><Text style={{ color: 'white', fontWeight: "400", fontSize: 30, marginTop: 20 }}>Hello {lcData?.matchedUser.username}!</Text></View> : null}
      <View><Text style={{ color: 'white', fontWeight: "400", marginBottom: 20, fontSize: 20 }}>Welcome Back!</Text></View>
      {contestRatings[contestRatings.length - 1] ? <View style={{ ...styles.outer, backgroundColor: "#E6DFF1", shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rating: {Math.round(contestRatings[contestRatings.length - 1])}</Text></View> : null}
      {lcData?.matchedUser.profile.ranking ? <View style={{ ...styles.outer, backgroundColor: "#F1DFDE", shadowColor: '#F1DFDE', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rank: {lcData?.matchedUser.profile.ranking}</Text></View> : null}
      {lcData?.userContestRanking?.topPercentage ? <View style={{ ...styles.outer, backgroundColor: '#C0DEDD', shadowColor: '#C0DEDD', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Top: {lcData?.userContestRanking?.topPercentage}%</Text></View> : null}
      <View>{ProgressRing()}</View>
      {lcData?.userContestRanking?.topPercentage ? <View style={{ borderWidth: 0, marginTop: 0, borderRadius: 25, backgroundColor: '#b8ecf2', shadowColor: '#b8ecf2', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 5, marginBottom: 20 }}><LineChart
        data={{ datasets: [{ data: contestRatings }] }}
        width={screenWidth - 20}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={{
          borderRadius: 25,
          paddingTop: 20
        }}
      /></View> : null}
    </View>
  }

  const data = {
    labels: ["Hard", "Medium", "Easy"],
    data: percData,
    colors: ["Red", "Orange", "Green"]
  };

  const chartConfig = {
    backgroundColor: "#b8ecf2",
    backgroundGradientFrom: "#b8ecf2",
    backgroundGradientTo: "#b8ecf2",
    fillShadowGradientFromOpacity: "0.5",
    fillShadowGradientFromOffset: "0.5",
    fillShadowGradientFrom: "#3df53d",
    fillShadowGradientTo: "#3df53d",
    decimalPlaces: 0,
    color: (opacity = 1) => `pink`,
    labelColor: (opacity = 1) => `black`,
    propsForDots: {
      r: "3",
      strokeWidth: "2",
      stroke: "#e86500"
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
          await setShowDialog(false);
          await AsyncStorage.setItem('lcusername', inputText)
          await setLcUsername(inputText)
        }}
        closeDialog={() => {
          if (lcusername !== undefined) setShowDialog(false)
          else Alert.alert('Username Required', 'Please enter a valid username!');
        }}>
      </DialogInput>}
      {loading ? getData() : <ScrollView showsHorizontalScrollIndicator="false" style={{ height: "100%" }} refreshControl={
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
    backgroundColor: '#1D1C21'
  },
  text: {
    color: 'white',
    textAlign: "center",
    fontWeight: "400",
    paddingVertical: 10,
    fontSize: 20,
  },
  outer: {
    borderRadius: 10,
    margin: 8,
    shadowColor: "#008efa",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    width: screenWidth - 150,
    height: 45,
    display: 'flex',
    justifyContent: 'space-between'
  }
})