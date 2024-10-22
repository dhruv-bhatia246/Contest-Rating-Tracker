import React, { useState, useEffect } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useIsFocused } from "@react-navigation/native";
const screenWidth = Dimensions.get("window").width;

export const ContestScreen = (props) => {
  const isFocused = useIsFocused();
  let contests = [];
  const [cfContests, setcfContests] = useState([]);
  const [ccContests, setccContests] = useState([]);
  const [lcContests, setlcContests] = useState([]);
  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setLoading2(true);
    fetchData();
  }, []);

  const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql'
  const QUERY = `
    query {     
      matchedUser(username: "") {
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

  useEffect(() => {
    if (!loading && isFocused) {
      setLoading(true);
      fetchData();
    }
  }, [isFocused])

  const getData = () => {
    if (loading) {
      return <ActivityIndicator size="large" />
    }

    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }
    contests = []
    for (let i = 0; i < 10; i++) {
      if (cfContests[i] !== undefined) {
        contests.push(cfContests[i]);
        console.log(cfContests[i]);
      }
    }

    console.log(contests.length);

    return <View style={{ marginTop: 30, marginBottom: 30, alignItems: "center", flex: 1, justifyContent: "center" }}>
      <View>{contests.length ? contests.map((contest) => <View key={contest.id} style={{ ...styles.outer, backgroundColor: "#E6DFF1", shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>{contest.name}</Text></View>) : null}</View>
    </View >
  }

  const fetchData = () => {
    fetch(`https://codeforces.com/api/contest.list`)
      .then(res => res.json())
      .then((response) => {
        setLoading(false);
        setcfContests(response.result);
        getData();
      })
      .catch((error) => {
        console.log(error);
        setError(error)
      });

    // fetch(`https://codeforces.com/api/user.rating?handle=${cfusername}`)
    //   .then(res => res.json())
    //   .then((response) => {
    //     if (response.comment === undefined) {
    //       setHistory(response.result)
    //       setLoading2(false);
    //       setRefreshing(false);
    //     } else {
    //       setShowDialog(true);
    //     }
    //   })
    //   .catch((error) => setError(error));
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? getData() : <ScrollView showsHorizontalScrollIndicator="false" style={{ height: "100%" }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {/* <Text>ContestScreen</Text> */}
        {isFocused && getData()}
      </ScrollView>}
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#1D1C21"
  },
  text: {
    color: 'white',
    textAlign: "center",
    fontWeight: "400",
    paddingVertical: 10,
    fontSize: 14,
  },
  outer: {
    borderRadius: 10,
    margin: 8,
    width: screenWidth - 50,
    height: 45
  }
})