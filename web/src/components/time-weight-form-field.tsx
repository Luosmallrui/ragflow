import { FormLayout } from '@/constants/form';
import { useTranslate } from '@/hooks/common-hooks';
import { SliderInputFormField } from './slider-input-form-field';

export function TimeWeightFormField() {
  const { t } = useTranslate('knowledgeConfiguration');

  return (
    <SliderInputFormField
      name={'time_weight'}
      label={t('timeWeight')}
      tooltip={t('timeWeightTip')}
      defaultValue={0.0}
      max={1}
      min={0.0}
      step={0.1}
      layout={FormLayout.Horizontal}
    />
  );
}

export default TimeWeightFormField;
