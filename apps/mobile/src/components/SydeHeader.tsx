import { View, Image, Text, StyleSheet } from 'react-native'
import { ReactNode } from 'react'

interface Props {
  title: string
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export default function SydeHeader({ title, leftAction, rightAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={require('../../assets/logo2.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{title}</Text>
      </View>
      {leftAction ? <View style={styles.left}>{leftAction}</View> : <View style={styles.left}/>}
      {rightAction ? <View style={styles.right}>{rightAction}</View> : <View style={styles.right}/>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  right: {
    alignItems: 'flex-end',
  },
})
