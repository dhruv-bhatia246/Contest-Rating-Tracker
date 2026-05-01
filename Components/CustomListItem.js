import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ListItem, Avatar } from "@rneui/base";

export const CustomListItem = ({ id, chatName, enterChat }) => {
  return (
    <ListItem key={id} onPress={() => enterChat(id, chatName)} bottomDivider>
      <Avatar
        rounded
        source={{
          uri: "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png"
        }}
      />
      <ListItem.Content>
        <ListItem.Title style={{ fontWeight: "800" }}>
          {chatName}
        </ListItem.Title>
      </ListItem.Content>
    </ListItem>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
})