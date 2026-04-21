import { FormLayout } from '@/constants/form';
import { useTranslate } from '@/hooks/common-hooks';
import { SliderInputFormField } from './slider-input-form-field';

export function CustomWeightFormField() {
  const { t } = useTranslate('knowledgeConfiguration');

  return (
    <SliderInputFormField
      name={'custom_weight'}
      label={t('customWeight')}
      tooltip={t('customWeightTip')}
      defaultValue={0}
      max={1}
      min={0}
      step={0.1}
      layout={FormLayout.Horizontal}
    />
  );
}

export default CustomWeightFormField;
