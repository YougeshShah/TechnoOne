import sys

files_and_patches = [
    (
        "student-mobile/app/payment/course.tsx",
        '''  if (Platform.OS === "ios") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{courseName || "Enroll in Course"}</Text>
        <Text style={styles.amount}>NPR {amount}</Text>
        <Text style={styles.subtitle}>
          To enroll in this course, please visit our website. Once you've paid there, come back to the app to
          start learning.
        </Text>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: "#2563EB" }]} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.payButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </View>
    );
  }''',
        '''  if (Platform.OS === "ios") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{courseName || "Enroll in Course"}</Text>
        <Text style={styles.subtitle}>
          This course isn't available to enroll in from here yet. Please check back later.
        </Text>
      </View>
    );
  }''',
    ),
    (
        "student-mobile/app/payment/voucher.tsx",
        '''  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.subtitle}>
          To pay and enroll, please visit our website. Once your payment is approved there, come back to the app
          to access your course.
        </Text>
        <TouchableOpacity style={styles.submitButton} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.submitButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </View>
    );
  }''',
        '''  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.subtitle}>This isn't available from here yet. Please check back later.</Text>
      </View>
    );
  }''',
    ),
    (
        "portal-mobile/app/subscription.tsx",
        '''  if (Platform.OS === "ios") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          To manage or renew your institution's TechnoOne subscription, please visit our website. Your account
          stays fully usable here in the meantime.
        </Text>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.payButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }''',
        '''  if (Platform.OS === "ios") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Subscription management isn't available from here yet.</Text>
      </ScrollView>
    );
  }''',
    ),
]

for path, old, new in files_and_patches:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    c = content.count(old)
    print(f"{path} anchor count = {c}")
    if c != 1:
        print(f"ERROR: aborting at '{path}'.")
        sys.exit(1)
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {path}")

print("\\nNote: WEBSITE_URL constants + unused Linking imports are now unused in these 3 files -- harmless (TS won't error on an unused top-level const), left in place so re-adding the button later is a one-line change if you want it.")
