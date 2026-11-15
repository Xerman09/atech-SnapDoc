---
description: Prevent Android status bar & navigation bar overlap by always using react-native-safe-area-context instead of react-native SafeAreaView.
alwaysApply: true
---

# Safe Area Insets & Edge-to-Edge Rule (Android & iOS)

1. **Never import `SafeAreaView` from `'react-native'`** — it only applies insets on iOS and causes UI headers/footers to overlap the Android status bar and system navigation bar under Edge-to-Edge mode.
2. **Always wrap the app root in `<SafeAreaProvider>`** from `'react-native-safe-area-context'`.
3. **Always import `SafeAreaView` from `'react-native-safe-area-context'`** (with `edges={['top', 'bottom', 'left', 'right']}` or use `useSafeAreaInsets()`) for every full-screen layout.
