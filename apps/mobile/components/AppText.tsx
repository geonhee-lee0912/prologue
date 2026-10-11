/**
 * 앱의 모든 글자 — Pretendard (theme/fonts.ts).
 * react-native 의 Text·TextInput 대신 이것을 쓴다. 굵기(fontWeight)는 글꼴 파일로 바뀌고,
 * 안쪽 Text 는 RN 처럼 바깥 굵기를 물려받는다.
 */
import { createContext, useContext } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { fontFamilyFor } from '../theme/fonts';

const InheritedWeight = createContext<TextStyle['fontWeight']>(undefined);

function fontStyle(weight: TextStyle['fontWeight']): TextStyle {
  return { fontFamily: fontFamilyFor(weight), fontWeight: 'normal' };
}

export function Text({ style, children, ...rest }: TextProps) {
  const inherited = useContext(InheritedWeight);
  const weight = StyleSheet.flatten(style)?.fontWeight ?? inherited;
  return (
    <RNText {...rest} style={[style, fontStyle(weight)]}>
      <InheritedWeight.Provider value={weight}>{children}</InheritedWeight.Provider>
    </RNText>
  );
}

export function TextInput({ style, ...rest }: TextInputProps) {
  return <RNTextInput {...rest} style={[style, fontStyle(StyleSheet.flatten(style)?.fontWeight)]} />;
}
