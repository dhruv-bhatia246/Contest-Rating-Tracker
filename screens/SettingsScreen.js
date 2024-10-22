import React, { useEffect, useLayoutEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native'
import { Avatar } from "@rneui/base";
import { AntDesign, SimpleLineIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, ProgressChart, ContributionGraph, StackedBarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import DialogInput from 'react-native-dialog-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import codeforces from '../assets/codeforces.png';
const screenWidth = Dimensions.get("window").width;

export const SettingsScreen = ({ navigation, lcusername, setLcUsername, cfusername, setCfUsername }) => {
  return (
    <SafeAreaView style={styles.container}>
      {lcusername ? <View style={styles.outer}><Text style={styles.text}>LeetCode :  {lcusername}  <FontAwesome5 name='trash' size={16} onPress={() => {
        AsyncStorage.removeItem('lcusername');
        setLcUsername(undefined);
      }} /></Text></View> : null}
      {cfusername ? <View style={styles.outer}><Text style={styles.text}>Codeforces :  {cfusername}  <FontAwesome5 name='trash' size={16} onPress={() => {
        AsyncStorage.removeItem('cfusername');
        setCfUsername(undefined);
      }} /></Text></View> : null}
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
    width: 300,
    fontSize: 17,
  },
  outer: {
    backgroundColor: "#373742",
    borderRadius: 10,
    margin: 20,
    shadowColor: "#008efa",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  }
})