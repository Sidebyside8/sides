import { registerRootComponent } from 'expo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createElement } from 'react'
import App from './App'

function Root() {
  return createElement(SafeAreaProvider, null, createElement(App))
}

registerRootComponent(Root)
