import {
  CONTACT_FREQUENCY_VALUES,
  MARRIAGE_OPENNESS_VALUES,
  RELATIONSHIP_INTENT_VALUES,
  RELATIONSHIP_PACE_VALUES,
  RELATIONSHIP_SURVEY_COPY,
} from '@prologue/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  api,
  type ContactFreq,
  type MarriageOpenness,
  type RelationshipIntent,
  type RelationshipPace,
} from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { routeForStep } from '../../lib/onboarding-route';

/**
 * B05 — 관계 목적 설문 (FR-B04)
 *
 * 4문항을 한 스크롤 화면에 표시. 모두 답하면 저장 + 다음 단계.
 */
export default function B05Relationship() {
  const router = useRouter();
  const [intent, setIntent] = useState<RelationshipIntent | null>(null);
  const [pace, setPace] = useState<RelationshipPace | null>(null);
  const [contactFrequency, setContactFrequency] = useState<ContactFreq | null>(null);
  const [marriageOpenness, setMarriageOpenness] = useState<MarriageOpenness | null>(null);
  const [busy, setBusy] = useState(false);

  function notify(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  const canSubmit = intent !== null && pace !== null && contactFrequency !== null;

  async function onSubmit() {
    if (!canSubmit) {
      notify('답변 필요', '필수 3가지(만남·속도·연락) 항목에 답해주세요.');
      return;
    }
    setBusy(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) {
        router.replace('/a03-login');
        return;
      }
      const { nextStep } = await api.saveRelationshipPreference(token, {
        intent: intent!,
        pace: pace!,
        contactFrequency: contactFrequency!,
        marriageOpenness: marriageOpenness ?? undefined,
      });
      router.replace(routeForStep(nextStep) as never);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      notify('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>{RELATIONSHIP_SURVEY_COPY.header}</Text>
        <Text style={styles.subHeader}>{RELATIONSHIP_SURVEY_COPY.subHeader}</Text>
        <Text style={styles.helper}>{RELATIONSHIP_SURVEY_COPY.helperNote}</Text>

        <Question title={RELATIONSHIP_SURVEY_COPY.questions.intent.title}>
          {RELATIONSHIP_INTENT_VALUES.map((v) => (
            <Option
              key={v}
              label={RELATIONSHIP_SURVEY_COPY.questions.intent.options[v]}
              selected={intent === v}
              onPress={() => setIntent(v)}
            />
          ))}
        </Question>

        <Question title={RELATIONSHIP_SURVEY_COPY.questions.pace.title}>
          {RELATIONSHIP_PACE_VALUES.map((v) => (
            <Option
              key={v}
              label={RELATIONSHIP_SURVEY_COPY.questions.pace.options[v]}
              selected={pace === v}
              onPress={() => setPace(v)}
            />
          ))}
        </Question>

        <Question title={RELATIONSHIP_SURVEY_COPY.questions.contactFrequency.title}>
          {CONTACT_FREQUENCY_VALUES.map((v) => (
            <Option
              key={v}
              label={RELATIONSHIP_SURVEY_COPY.questions.contactFrequency.options[v]}
              selected={contactFrequency === v}
              onPress={() => setContactFrequency(v)}
            />
          ))}
        </Question>

        <Question
          title={RELATIONSHIP_SURVEY_COPY.questions.marriageOpenness.title}
          optional
        >
          {MARRIAGE_OPENNESS_VALUES.map((v) => (
            <Option
              key={v}
              label={RELATIONSHIP_SURVEY_COPY.questions.marriageOpenness.options[v]}
              selected={marriageOpenness === v}
              onPress={() => setMarriageOpenness(v)}
            />
          ))}
        </Question>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Pressable
        style={[styles.cta, (!canSubmit || busy) && styles.ctaDisabled]}
        disabled={!canSubmit || busy}
        onPress={onSubmit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>저장하고 다음으로</Text>
        )}
      </Pressable>
    </View>
  );
}

function Question({
  title,
  children,
  optional,
}: {
  title: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionTitle}>
        {title}
        {optional && <Text style={styles.optional}> (선택)</Text>}
      </Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 72 },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subHeader: { fontSize: 15, color: '#555', marginBottom: 8 },
  helper: { fontSize: 13, color: '#888', marginBottom: 32, lineHeight: 19 },
  question: { marginBottom: 28 },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  optional: { color: '#999', fontWeight: '400', fontSize: 14 },
  options: { gap: 8 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: '#1a1a1a', backgroundColor: '#f5f1eb' },
  optionText: { fontSize: 15, color: '#333' },
  optionTextSelected: { color: '#1a1a1a', fontWeight: '600' },
  cta: {
    backgroundColor: '#1a1a1a',
    margin: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: '#cccccc' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
