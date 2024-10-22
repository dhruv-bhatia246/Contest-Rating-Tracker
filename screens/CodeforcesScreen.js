import React, { useEffect, useLayoutEffect, useState } from 'react'
import { Dimensions, View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { useIsFocused } from "@react-navigation/native";
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
const screenWidth = Dimensions.get("window").width;

export const CodeforcesScreen = ({ navigation, cfusername, setCfUsername }) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [error, setError] = useState();
  const [cfData, setCfData] = useState();
  const [history, setHistory] = useState();
  const [showDialog, setShowDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  var ratings = [];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setLoading2(true);
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(`https://codeforces.com/api/user.info?handles=${cfusername}`)
      .then(res => res.json())
      .then((response) => {
        if (response.comment === undefined) {
          setCfData(response.result[0])
          setLoading(false);
          setRefreshing(false);
        } else {
          Alert.alert('Error', 'Enter Valid Username')
          setShowDialog(true);
        }
      })
      .catch((error) => {
        console.log(error);
        setError(error)
      });

    fetch(`https://codeforces.com/api/user.rating?handle=${cfusername}`)
      .then(res => res.json())
      .then((response) => {
        if (response.comment === undefined) {
          setHistory(response.result)
          setLoading2(false);
          setRefreshing(false);
        } else {
          setShowDialog(true);
        }
      })
      .catch((error) => setError(error));
  }

  const fetchusername = async () => {
    try {
      const value = await AsyncStorage.getItem('cfusername')
      if (value !== null) {
        setCfUsername(value);
      } else {
        setShowDialog(true);
      }
    } catch (e) {
      setError(e);
    }
  }

  useEffect(() => {
    fetchusername().then(() => {
      if (cfusername !== undefined) fetchData()
    });
  }, [cfusername])

  useEffect(() => {
    if (!loading) {
      fetchusername().then(() => {
        if (cfusername !== undefined) fetchData()
      });
    }
  }, [isFocused])

  const getData = () => {
    if (loading || loading2) {
      return <ActivityIndicator size="large" />
    }

    if (error) {
      Alert.alert('Error', error);
      return <View></View>
    }

    for (let i = 0; i < history?.length; i++) {
      ratings.push(history[i]?.newRating);
    }

    return <View style={{ marginTop: 30, marginBottom: 30, alignItems: "center", flex: 1, justifyContent: "center" }}>
      <View style={{ marginBottom: 10, borderColor: 'orange', borderWidth: 3, borderRadius: 60, padding: 5 }}><Avatar size="large" rounded source={{ uri: cfData.titlePhoto }}></Avatar></View>
      {cfData.handle ? <View><Text style={{ color: 'white', fontWeight: "400", fontSize: 30, marginTop: 20 }}>Hello {cfData?.handle}!</Text></View> : null}
      <View><Text style={{ color: 'white', fontWeight: "400", marginBottom: 20, fontSize: 20 }}>Welcome Back!</Text></View>
      {cfData.rating ? <View style={{ ...styles.outer, backgroundColor: '#E6DFF1', shadowColor: '#E6DFF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rating: {cfData.rating}</Text></View> : null}
      {cfData.rank ? <View style={{ ...styles.outer, backgroundColor: '#F1DFDE', shadowColor: '#F1DFDE', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, elevation: 10 }}><Text style={{ ...styles.text, color: 'black' }}>Rank: {cfData.rank}</Text></View> : null}
      {cfData.rating ? <View style={{ borderWidth: 0, marginTop: 20, borderRadius: 25, backgroundColor: '#b8ecf2' }}><LineChart
        data={{
          datasets: [
            {
              data: ratings
            }
          ]
        }}
        width={screenWidth - 20}
        height={200}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1} // optional, defaults to 1
        chartConfig={chartConfig}
        bezier
        style={{
          borderRadius: 25,
          paddingTop: 20
        }}
      /></View> : null}
    </View >
  }

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
    style: {
      borderRadius: 25,
    },
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
        title={"Enter Codeforces username"}
        hintInput={"Type Here"}
        submitInput={async (inputText) => {
          await setShowDialog(false);
          await AsyncStorage.setItem('cfusername', inputText)
          await setCfUsername(inputText)
        }}
        closeDialog={() => {
          if (cfusername !== undefined) setShowDialog(false)
          else Alert.alert('Username Required', 'Please enter a valid username!');
        }}>
      </DialogInput>}
      {loading || loading2 ? getData() : <ScrollView showsHorizontalScrollIndicator="false" style={{ height: "100%" }} refreshControl={
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
    backgroundColor: "#1D1C21"
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
    width: screenWidth - 150,
    height: 45
  }
})