import { SliderInputFormField } from '@/components/slider-input-form-field.tsx';
import { FormLayout } from '@/constants/form';
import { useTranslate } from '@/hooks/common-hooks';

export function ImportanceLevelFormField() {
  const { t } = useTranslate('knowledgeConfiguration');

  return (
    <SliderInputFormField
      name={'importance_level'}
      label={t('importanceLevel')}
      tooltip={t('importanceLevelTip')}
      defaultValue={0.0}
      max={1}
      min={0.0}
      step={0.1}
      layout={FormLayout.Horizontal}
    />
  );
}

export default ImportanceLevelFormField;
