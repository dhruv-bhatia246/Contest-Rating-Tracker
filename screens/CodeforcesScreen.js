import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
const screenWidth = Dimensions.get("window").width;

export const CodeforcesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState();
  const [cfData, setCfData] = useState();
  const [history, setHistory] = useState();
  const [refreshing, setRefreshing] = React.useState(false);
  var ratings = [];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  useEffect(() => {
    fetch("https://codeforces.com/api/user.info?handles=dhruv.bhatia")
      .then(res => res.json())
      .then((response) => {
        // console.log(JSON.stringify(response.result[0]))
        setCfData(response.result[0])
        setLoading(false)
      })
      .catch((error) => setError(error));

    fetch("https://codeforces.com/api/user.rating?handle=dhruv.bhatia")
      .then(res => res.json())
      .then((response) => {
        // console.log(JSON.stringify(response))
        setHistory(response.result)
        setLoading2(false)
      })
      .catch((error) => setError(error));
  }, [])

  const getData = () => {
    if (loading || loading2) {
      return <ActivityIndicator size="large" />
    }
    if (error) {
      return <Text>{error}</Text>
    }

    for (let i = 0; i < history?.length; i++) {
      ratings.push(history[i]?.newRating);
    }

    return <View style={{ marginTop: 40, alignItems: "center", flex: 1, justifyContent: "center" }}>
      <View style={{ paddingBottom: 20 }}><Avatar size="xlarge" rounded source={{ uri: cfData.titlePhoto }}></Avatar></View>
      <View style={styles.outer}><Text style={styles.text}>{cfData.handle}</Text></View>
      <View style={styles.outer}><Text style={styles.text}>Rating: {cfData.rating}</Text></View>
      <View style={styles.outer}><Text style={styles.text}>Rank: {cfData.rank}</Text></View>
      <LineChart
        data={{
          // labels: ["January", "February", "March", "April", "May", "June"],
          datasets: [
            {
              data: ratings
            }
          ]
        }}
        width={screenWidth - 10}
        height={250}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1} // optional, defaults to 1
        chartConfig={chartConfig}
        bezier
        style={{
          marginTop: 50,
          borderRadius: 12,
          marginLeft: -15,
        }}
      />
    </View >
  }

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
      borderRadius: 16,
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
      <ScrollView style={{ height: "100%" }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
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
    backgroundColor: "#1b1b21"
  },
  text: {
    color: 'white',
    textAlign: "center",
    fontWeight: "400",
    paddingVertical: 10,
    paddingHorizontal: 70,
    fontSize: 20,
  },
  outer: {
    backgroundColor: "#373742",
    borderRadius: 10,
    margin: 10,
    width: screenWidth - 30,
    shadowColor: "#008efa",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 2
  }
})