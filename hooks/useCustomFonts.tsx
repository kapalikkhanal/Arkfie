import * as Font from 'expo-font';

export async function loadFonts() {
  await Font.loadAsync({
    Miniver: require('../assets/fonts/Miniver-Regular.ttf'),
  });
}
