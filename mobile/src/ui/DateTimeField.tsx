import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/Text';
import { color, radius, space } from '@/ui/tokens';

const formatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function nextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

type Props = {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  minimumDate?: Date;
  disabled?: boolean;
};

/**
 * Native date + time picker. iOS shows an inline picker under the field; Android
 * opens the platform date dialog followed by the time dialog. Replaces the old
 * free-text DD/MM/AAAA + HH:MM inputs.
 */
export function DateTimeField({ label, value, onChange, minimumDate, disabled }: Props) {
  const [iosOpen, setIosOpen] = useState(false);

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: value ?? nextHour(),
      mode: 'date',
      minimumDate,
      onChange: (_event, date) => {
        if (!date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (_e, time) => {
            if (!time) return;
            const merged = new Date(date);
            merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(merged);
          },
        });
      },
    });
  }

  function open() {
    if (disabled) return;
    if (Platform.OS === 'android') openAndroid();
    else setIosOpen((current) => !current);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled), expanded: iosOpen }}
        onPress={open}
        style={[styles.input, disabled ? styles.inputDisabled : null]}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatter.format(value) : 'Elegir fecha y hora'}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen && !disabled ? (
        <DateTimePicker
          value={value ?? nextHour()}
          mode="datetime"
          display="inline"
          minimumDate={minimumDate}
          onChange={(_event, next) => {
            if (next) onChange(next);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { fontSize: 13, fontWeight: '600', color: color.text },
  input: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
  },
  inputDisabled: { opacity: 0.5 },
  value: { color: color.text, fontSize: 15 },
  placeholder: { color: color.textMuted, fontSize: 15 },
});
