import { ButtonLoading } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IModalProps } from '@/interfaces/common';
import { zodResolver } from '@hookform/resolvers/zod';
import { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FileUploader } from '../file-uploader';
import { RAGFlowFormItem } from '../ragflow-form';
import { Form } from '../ui/form';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';

function buildUploadFormSchema(t: TFunction) {
  const FormSchema = z.object({
    parseOnCreation: z.boolean().optional(),
    preprocessOnCreation: z.boolean().optional(),
    preprocessScript: z.string().optional(),
    preprocessApiBase: z.string().optional(),
    preprocessApiKey: z.string().optional(),
    preprocessModelName: z.string().optional(),
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

  type UploadFormSchemaType = z.infer<typeof FormSchema>;
  const form = useForm<UploadFormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      parseOnCreation: false,
      preprocessOnCreation: false,
      preprocessScript: '/ragflow/script/run_pipeline.py',
      preprocessApiBase: 'http://10.136.250.152:8081',
      preprocessApiKey: 'sk-vmmqbzqjgjcbxbpgfaegaahqgnrlldnarmakkgssdqbobyis',
      preprocessModelName: '/model/Qwen2.5-72B',
      fileList: [],
    },
  });

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
                  name="preprocessApiBase"
                  label={t('fileManager.preprocessApiBase')}
                >
                  {(field) => (
                    <Input placeholder="https://api.openai.com/v1" {...field} />
                  )}
                </RAGFlowFormItem>
                <RAGFlowFormItem
                  name="preprocessApiKey"
                  label={t('fileManager.preprocessApiKey')}
                >
                  {(field) => (
                    <Input type="password" placeholder="sk-..." {...field} />
                  )}
                </RAGFlowFormItem>
                <RAGFlowFormItem
                  name="preprocessModelName"
                  label={t('fileManager.preprocessModelName')}
                >
                  {(field) => <Input placeholder="gpt-4o" {...field} />}
                </RAGFlowFormItem>
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
      <DialogContent data-testid="dataset-upload-modal">
        <DialogHeader>
          <DialogTitle>{t('fileManager.uploadFile')}</DialogTitle>
        </DialogHeader>
        {/* <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="account">{t('fileManager.local')}</TabsTrigger>
            <TabsTrigger value="password">{t('fileManager.s3')}</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <UploadForm
              submit={onOk!}
              showParseOnCreation={showParseOnCreation}
            ></UploadForm>
          </TabsContent>
          <TabsContent value="password">{t('common.comingSoon')}</TabsContent>
        </Tabs> */}
        <UploadForm submit={onOk!} showParseOnCreation={showParseOnCreation} />
        <DialogFooter>
          <ButtonLoading type="submit" loading={loading} form={UploadFormId}>
            {t('common.save')}
          </ButtonLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
