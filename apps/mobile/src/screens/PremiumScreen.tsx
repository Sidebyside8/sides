import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,ScrollView,Alert,ActivityIndicator,Linking}from'react-native'
import{LinearGradient}from'expo-linear-gradient'
import{getPremiumProduct,purchasePremium,restorePurchases,setupPurchases}from'../lib/subscription'

export default function PremiumScreen({onClose,onSuccess}:{onClose:()=>void;onSuccess:()=>void}){
const[product,setProduct]=useState<any>(null)
const[loading,setLoading]=useState(true)
const[purchasing,setPurchasing]=useState(false)
const[restoring,setRestoring]=useState(false)
const[error,setError]=useState<string|null>(null)

useEffect(()=>{
setupPurchases().then(()=>{
getPremiumProduct().then(p=>{
setProduct(p)
setLoading(false)

})
})
},[])

const handlePurchase=async()=>{
setError(null)
setPurchasing(true)
const result=await purchasePremium()
if(result){
Alert.alert('Welcome to Premium! 💎','You now have access to all Syde Vibe Premium features.')
onSuccess()
}else{
setError('Purchase failed. Please try again.')
}
setPurchasing(false)
}

const handleRestore=async()=>{
setError(null)
setRestoring(true)
const success=await restorePurchases()
if(success){
Alert.alert('Restored!','Your premium subscription has been restored.')
onSuccess()
}else{
setError('No previous purchases found for this Apple ID.')
}
setRestoring(false)
}

return(
<LinearGradient colors={['#0A4A7A','#9A3A08']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.container}>
<ScrollView contentContainerStyle={s.content}>
<TouchableOpacity style={s.closeBtn} onPress={onClose}>
<Text style={s.closeBtnText}>✕</Text>
</TouchableOpacity>

<Text style={s.crown}>💎</Text>
<Text style={s.title}>Syde Vibe Premium</Text>
<Text style={s.subtitle}>Unlock the full experience</Text>

{error&&<View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

<View style={s.featuresCard}>
<Text style={s.featuresTitle}>Premium Features</Text>
<View style={s.feature}><Text style={s.featureIcon}>📸</Text><View style={s.featureInfo}><Text style={s.featureName}>6 Profile Photos</Text><Text style={s.featureDesc}>Free users get 3 photos</Text></View></View>
<View style={s.feature}><Text style={s.featureIcon}>⚙️</Text><View style={s.featureInfo}><Text style={s.featureName}>Advanced Filters</Text><Text style={s.featureDesc}>Filter by age and preferences</Text></View></View>
<View style={s.feature}><Text style={s.featureIcon}>🚀</Text><View style={s.featureInfo}><Text style={s.featureName}>Priority in Discover</Text><Text style={s.featureDesc}>Appear higher in feeds</Text></View></View>
<View style={s.feature}><Text style={s.featureIcon}>💬</Text><View style={s.featureInfo}><Text style={s.featureName}>Unlimited Messages</Text><Text style={s.featureDesc}>Message anyone anytime</Text></View></View>
<View style={s.feature}><Text style={s.featureIcon}>💎</Text><View style={s.featureInfo}><Text style={s.featureName}>Premium Badge</Text><Text style={s.featureDesc}>Stand out with a premium badge</Text></View></View>
</View>

<View style={s.priceCard}>
{loading?<ActivityIndicator color="#ffffff"/>:<>
<Text style={s.price}>{product?.price||'$9.99'}</Text>
<Text style={s.period}>per month</Text>
<Text style={s.trial}>Cancel anytime in Apple ID settings</Text>
</>}
</View>

{!loading&&!product?
<View style={s.unavailableBox}><Text style={s.unavailableText}>Subscriptions are temporarily unavailable. Please check back soon.</Text></View>
:<TouchableOpacity style={[s.purchaseBtn,purchasing&&s.purchaseBtnDisabled]} onPress={handlePurchase} disabled={purchasing||loading}>
{purchasing?<ActivityIndicator color="#0A1628"/>:<Text style={s.purchaseBtnText}>Subscribe Now</Text>}
</TouchableOpacity>}

<TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={restoring}>
{restoring?<ActivityIndicator color="rgba(255,255,255,0.7)" size="small"/>:<Text style={s.restoreBtnText}>Restore Purchases</Text>}
</TouchableOpacity>

<Text style={s.legal}>Syde Vibe Premium is a monthly auto-renewing subscription. Length: 1 month. Price: $9.99 USD per month. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings.</Text>
<View style={s.linksRow}>
<TouchableOpacity onPress={()=>Linking.openURL('https://sidebyside8.github.io/sides/privacy.html')}>
<Text style={s.linkText}>Privacy Policy</Text>
</TouchableOpacity>
<Text style={s.linkDivider}> · </Text>
<TouchableOpacity onPress={()=>Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
<Text style={s.linkText}>Terms of Use</Text>
</TouchableOpacity>
</View>
</ScrollView>
</LinearGradient>
)
}

const s=StyleSheet.create({
container:{flex:1},
content:{padding:24,paddingTop:60,alignItems:'center'},
closeBtn:{position:'absolute',top:60,right:24,width:36,height:36,alignItems:'center',justifyContent:'center'},
closeBtnText:{color:'rgba(255,255,255,0.7)',fontSize:20},
crown:{fontSize:60,marginTop:40,marginBottom:16},
title:{fontSize:28,fontWeight:'900',color:'#ffffff',marginBottom:8},
subtitle:{fontSize:16,color:'rgba(255,255,255,0.7)',marginBottom:16},
errorBox:{backgroundColor:'rgba(255,0,0,0.2)',borderRadius:12,padding:12,marginBottom:16,width:'100%',borderWidth:1,borderColor:'rgba(255,0,0,0.3)'},
errorText:{color:'#ffaaaa',fontSize:13,textAlign:'center'},
featuresCard:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:20,padding:20,width:'100%',marginBottom:24,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
featuresTitle:{color:'#ffffff',fontSize:16,fontWeight:'700',marginBottom:16},
feature:{flexDirection:'row',alignItems:'center',marginBottom:16},
featureIcon:{fontSize:24,marginRight:12},
featureInfo:{flex:1},
featureName:{color:'#ffffff',fontSize:15,fontWeight:'600'},
featureDesc:{color:'rgba(255,255,255,0.7)',fontSize:13},
priceCard:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:20,padding:24,width:'100%',alignItems:'center',marginBottom:24,borderWidth:1,borderColor:'rgba(255,140,0,0.4)'},
price:{color:'#F5A623',fontSize:48,fontWeight:'900'},
period:{color:'rgba(255,255,255,0.7)',fontSize:16,marginTop:4},
trial:{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:8},
purchaseBtn:{backgroundColor:'#F5A623',borderRadius:16,padding:18,width:'100%',alignItems:'center',marginBottom:12},
purchaseBtnDisabled:{backgroundColor:'rgba(245,166,35,0.5)'},
purchaseBtnText:{color:'#0A1628',fontSize:18,fontWeight:'900'},
restoreBtn:{padding:12,marginBottom:16},
restoreBtnText:{color:'rgba(255,255,255,0.6)',fontSize:14},
legal:{color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'center',lineHeight:16,paddingHorizontal:16},
linksRow:{flexDirection:'row',justifyContent:'center',marginTop:12,marginBottom:8},
linkText:{color:'#7EC8F5',fontSize:12,fontWeight:'600'},
linkDivider:{color:'rgba(255,255,255,0.4)',fontSize:12},
unavailableBox:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:18,width:'100%',alignItems:'center',marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
unavailableText:{color:'rgba(255,255,255,0.7)',fontSize:14,textAlign:'center'},
})
