import { View, Image, Text, StyleSheet, ReactNode } from 'react-native'

interface Props {
  title: string
  rightAction?: ReactNode
}

export default function SydeHeader({ title, rightAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
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
    color: '#1a2a3a',
  },
  right: {
    alignItems: 'flex-end',
  },
})
