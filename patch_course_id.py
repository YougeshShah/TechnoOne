import sys

path = 'app/course/[id].tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Linking } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubjects, useMySubscriptions, useMockTests, useLiveClasses, useJoinLiveClass } from "../../src/hooks";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: subjects, isLoading } = useSubjects(id);
  const { data: subscriptions } = useMySubscriptions();
  const { data: mockTests } = useMockTests(id);
  const { data: liveClasses } = useLiveClasses(id);
  const joinLiveClass = useJoinLiveClass();'''

new1 = '''import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Linking, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubjects, useMySubscriptions, useMockTests, useLiveClasses, useJoinLiveClass, useCourses, useAmountDue } from "../../src/hooks";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: subjects, isLoading } = useSubjects(id);
  const { data: subscriptions } = useMySubscriptions();
  const { data: mockTests } = useMockTests(id);
  const { data: liveClasses } = useLiveClasses(id);
  const joinLiveClass = useJoinLiveClass();
  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === id);
  const { data: amountDueData } = useAmountDue(id);'''

count1 = content.count(old1)
print(f'import/setup anchor count = {count1}')
if count1 != 1:
    print('ERROR: aborting (import/setup block).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''      {!isSubscribed && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push({ pathname: "/payment/course", params: { courseId: id } })}
        >
          <Text style={styles.bannerText}>\U0001F513 Free demo content — tap here to subscribe for full access.</Text>
        </TouchableOpacity>
      )}'''

new2 = '''      {!isSubscribed && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => {
            if (!amountDueData?.amountDue) {
              Alert.alert("Fee not set", "This course's fee has not been configured yet. Please contact your institution/admin.");
              return;
            }
            router.push({
              pathname: "/payment/course",
              params: { courseId: id, amount: String(amountDueData.amountDue), courseName: course?.name ?? "" },
            });
          }}
        >
          <Text style={styles.bannerText}>\U0001F513 Free demo content — tap here to subscribe for full access.</Text>
        </TouchableOpacity>
      )}'''

count2 = content.count(old2)
print(f'banner anchor count = {count2}')
if count2 != 1:
    print('ERROR: aborting (banner block).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/course/[id].tsx')
