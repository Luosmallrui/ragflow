import { ButtonLoading } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LlmModelType } from '@/constants/knowledge';
import {
  useComposeLlmOptionsByModelTypes,
  useFindLlmByUuidDetailed,
} from '@/hooks/use-llm-request';
import { IModalProps } from '@/interfaces/common';
import { zodResolver } from '@hookform/resolvers/zod';
import { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FileUploader } from '../file-uploader';
import {
  SelectWithSearch,
  SelectWithSearchFlagOptionType,
} from '../originui/select-with-search';
import { RAGFlowFormItem } from '../ragflow-form';
import { Form } from '../ui/form';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';

function buildUploadFormSchema(t: TFunction) {
  const FormSchema = z.object({
    parseOnCreation: z.boolean().optional(),
    preprocessOnCreation: z.boolean().optional(),
    preprocessScript: z.string().optional(),
    preprocessLlmId: z.string().optional(),
    fileList: z
      .array(
        z.instanceof(File).or(
          z.object({
            file: z.instanceof(File),
            path: z.string(), // Store the relative path for files in folders
          }),
        ),
      )
      .min(1, { message: t('fileManager.pleaseUploadAtLeastOneFile') }),
  });

  return FormSchema;
}

export type UploadFormSchemaType = z.infer<
  ReturnType<typeof buildUploadFormSchema>
>;

const UploadFormId = 'UploadFormId';

type UploadFormProps = {
  submit: (values?: UploadFormSchemaType) => void;
  showParseOnCreation?: boolean;
};
function UploadForm({ submit, showParseOnCreation }: UploadFormProps) {
  const { t } = useTranslation();
  const FormSchema = buildUploadFormSchema(t);
  const findLlmByUuid = useFindLlmByUuidDetailed();
  const modelOptions = useComposeLlmOptionsByModelTypes([LlmModelType.Chat]);

  type UploadFormSchemaType = z.infer<typeof FormSchema>;
  const form = useForm<UploadFormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      parseOnCreation: false,
      preprocessOnCreation: false,
      preprocessScript: '/ragflow/script/run_pipeline.py',
      preprocessLlmId: '',
      fileList: [],
    },
  });

  const selectedLlmId = form.watch('preprocessLlmId');
  const selectedLlm = selectedLlmId ? findLlmByUuid(selectedLlmId) : null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        id={UploadFormId}
        className="space-y-4"
      >
        {showParseOnCreation && (
          <>
            <RAGFlowFormItem
              name="parseOnCreation"
              label={t('fileManager.parseOnCreation')}
            >
              {(field) => (
                <Switch
                  data-testid="parse-on-creation-toggle"
                  onCheckedChange={field.onChange}
                  checked={field.value}
                />
              )}
            </RAGFlowFormItem>
            <RAGFlowFormItem
              name="preprocessOnCreation"
              label={t('fileManager.preprocessOnCreation')}
            >
              {(field) => (
                <Switch
                  onCheckedChange={field.onChange}
                  checked={field.value}
                />
              )}
            </RAGFlowFormItem>
            {form.watch('preprocessOnCreation') && (
              <>
                <RAGFlowFormItem
                  name="preprocessScript"
                  label={t('fileManager.preprocessScript')}
                >
                  {(field) => (
                    <Input placeholder="/path/to/preprocess.py" {...field} />
                  )}
                </RAGFlowFormItem>
                <RAGFlowFormItem
                  name="preprocessLlmId"
                  label={t('fileManager.preprocessModel')}
                >
                  {(field) => (
                    <SelectWithSearch
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={modelOptions as SelectWithSearchFlagOptionType[]}
                      triggerClassName="w-full"
                      testId="preprocess-model-select"
                    />
                  )}
                </RAGFlowFormItem>
                {selectedLlm && (
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                    <div className="font-medium mb-1">
                      {t('fileManager.scriptParamsPreview')}:
                    </div>
                    <code className="break-all">
                      python script.py input output{' '}
                      {selectedLlm.api_base || '(factory default)'}{' '}
                      {'*'.repeat(8)} {selectedLlm.llm_name}
                    </code>
                    {!selectedLlm.api_base && (
                      <div className="mt-1 text-yellow-600">
                        {t('fileManager.apiBaseFromFactory')}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
        <RAGFlowFormItem name="fileList" label={''}>
          {(field) => (
            <FileUploader
              value={field.value}
              onValueChange={field.onChange}
              accept={{}}
              data-testid="dataset-upload-dropzone"
            />
          )}
        </RAGFlowFormItem>
      </form>
    </Form>
  );
}

type FileUploadDialogProps = IModalProps<UploadFormSchemaType> &
  Pick<UploadFormProps, 'showParseOnCreation'>;
export function FileUploadDialog({
  hideModal,
  onOk,
  loading,
  showParseOnCreation = false,
}: FileUploadDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={hideModal}>
      <DialogContent
        data-testid="dataset-upload-modal"
        className="max-h-[90vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>{t('fileManager.uploadFile')}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6">
          <UploadForm
            submit={onOk!}
            showParseOnCreation={showParseOnCreation}
          />
        </div>
        <DialogFooter>
          <ButtonLoading type="submit" loading={loading} form={UploadFormId}>
            {t('common.save')}
          </ButtonLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
