import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import {
  Avatar,
  BottomSpacer,
  Button,
  Card,
  Input,
  SectionHeader,
  SegmentedControl,
} from '@/components/ui';

export default function GalleryScreen() {
  const [emailValue, setEmailValue] = useState('');
  const [errorValue, setErrorValue] = useState('hello@test.com');
  const [segIndex, setSegIndex] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Button variant="icon" icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>COMPONENT GALLERY</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Button ── */}
        <Section label="Button">
          <Row label="primary">
            <Button label="Log PR" onPress={() => {}} />
          </Row>
          <Row label="primary + icon">
            <Button label="Add Friend" icon="person-add-outline" onPress={() => {}} />
          </Row>
          <Row label="ghost">
            <Button variant="ghost" label="See All" onPress={() => {}} />
          </Row>
          <Row label="ghost + icon">
            <Button variant="ghost" label="Share" icon="share-outline" onPress={() => {}} />
          </Row>
          <Row label="icon">
            <View style={styles.iconRow}>
              <Button variant="icon" icon="heart-outline" onPress={() => {}} />
              <Button variant="icon" icon="share-outline" onPress={() => {}} />
              <Button variant="icon" icon="bookmark-outline" onPress={() => {}} />
              <Button variant="icon" icon="ellipsis-horizontal" onPress={() => {}} />
            </View>
          </Row>
          <Row label="loading">
            <Button label="Saving…" loading onPress={() => {}} />
          </Row>
          <Row label="disabled">
            <Button label="Disabled" disabled onPress={() => {}} />
          </Row>
        </Section>

        {/* ── Input ── */}
        <Section label="Input">
          <Input
            label="Email"
            value={emailValue}
            onChangeText={setEmailValue}
            placeholder="you@example.com"
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <Input
            label="Password"
            value="secret"
            onChangeText={() => {}}
            placeholder="Your password"
            leftIcon="lock-closed-outline"
            secureTextEntry
          />
          <View style={{ height: 12 }} />
          <Input
            label="Error state"
            value={errorValue}
            onChangeText={setErrorValue}
            placeholder="you@example.com"
            leftIcon="mail-outline"
            error="This email is already in use."
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <Input
            label="No icon"
            value=""
            onChangeText={() => {}}
            placeholder="Plain input, no icon"
          />
        </Section>

        {/* ── Card ── */}
        <Section label="Card">
          <Card>
            <Text style={styles.cardText}>Default card with children.</Text>
            <Text style={styles.cardSub}>
              bg-surface · rounded-2xl · p-4
            </Text>
          </Card>
          <View style={{ height: 8 }} />
          <Card style={{ borderWidth: 1, borderColor: Colors.accent }}>
            <Text style={styles.cardText}>Card with custom style override.</Text>
            <Text style={styles.cardSub}>Accent border via style prop.</Text>
          </Card>
        </Section>

        {/* ── Avatar ── */}
        <Section label="Avatar">
          <Row label="sizes (sm / md / lg / xl)">
            <View style={styles.iconRow}>
              <Avatar name="John Doe" userId="user-001" size="sm" />
              <Avatar name="John Doe" userId="user-001" size="md" />
              <Avatar name="John Doe" userId="user-001" size="lg" />
              <Avatar name="John Doe" userId="user-001" size="xl" />
            </View>
          </Row>
          <Row label="color varies by userId">
            <View style={styles.iconRow}>
              <Avatar name="Alex Rivera" userId="user-a" size="lg" />
              <Avatar name="Sam Lee" userId="user-b" size="lg" />
              <Avatar name="Jordan Kim" userId="user-c" size="lg" />
              <Avatar name="Casey Park" userId="user-d" size="lg" />
              <Avatar name="Morgan Wu" userId="user-e" size="lg" />
            </View>
          </Row>
          <Row label="single-word name">
            <Avatar name="Atlas" userId="user-f" size="lg" />
          </Row>
        </Section>

        {/* ── SegmentedControl ── */}
        <Section label="SegmentedControl">
          <Row label="2 options">
            <SegmentedControl
              options={['Friends', 'Global']}
              selectedIndex={segIndex % 2}
              onChange={setSegIndex}
            />
          </Row>
          <View style={{ height: 12 }} />
          <Row label="3 options">
            <SegmentedControl
              options={['Feed', 'Friends', 'Messages']}
              selectedIndex={segIndex % 3}
              onChange={setSegIndex}
            />
          </Row>
          <View style={{ height: 12 }} />
          <Row label="4 options">
            <SegmentedControl
              options={['Day', 'Week', 'Month', 'All']}
              selectedIndex={segIndex % 4}
              onChange={setSegIndex}
            />
          </Row>
          <Text style={styles.hint}>Tap options to cycle selection.</Text>
        </Section>

        {/* ── SectionHeader ── */}
        <Section label="SectionHeader">
          <SectionHeader label="Recent PRs" />
          <View style={{ height: 12 }} />
          <SectionHeader
            label="Top Friends"
            action={{ label: 'See All', onPress: () => {} }}
          />
          <View style={{ height: 12 }} />
          <SectionHeader
            label="Challenges"
            action={{ label: 'Browse', onPress: () => {} }}
          />
        </Section>

        {/* ── BottomSpacer ── */}
        <Section label="BottomSpacer">
          <View style={styles.spacerDemo}>
            <Text style={styles.cardSub}>
              Default height: {80 + 16}px (tabBarHeight + 16)
            </Text>
            <Text style={styles.cardSub}>
              Clears content above the tab bar on scrollable screens.
            </Text>
          </View>
        </Section>

        <BottomSpacer />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.elevated,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: 3,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 32,
  },
  section: {
    gap: 0,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 8,
  },
  row: {
    gap: 6,
  },
  rowLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  rowContent: {},
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  spacerDemo: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.hint,
    marginTop: 4,
  },
});
