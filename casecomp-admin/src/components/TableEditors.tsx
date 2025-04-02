import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CompetitionFormat, OrgType, ResourceType } from '@/types';
import { useState } from 'react';
import { isOpenAIEnabled } from '@/lib/gpt';

interface TextEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextEditor({ value, onChange, placeholder }: TextEditorProps) {
  return (
    <Input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-w-[150px]"
    />
  );
}

interface NumberEditorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}

export function NumberEditor({ value, onChange, placeholder }: NumberEditorProps) {
  return (
    <Input
      type="number"
      value={value === undefined ? '' : value}
      onChange={(e) => {
        const val = e.target.value === '' ? undefined : Number(e.target.value);
        onChange(val);
      }}
      placeholder={placeholder}
      className="min-w-[100px]"
    />
  );
}

interface TextareaEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextareaEditor({ value, onChange, placeholder, rows = 3 }: TextareaEditorProps) {
  return (
    <Textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="min-w-[200px]"
    />
  );
}

interface LongDescriptionEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onGenerateShort?: () => void;
}

export function LongDescriptionEditor({ value, onChange, onGenerateShort }: LongDescriptionEditorProps) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Long description"
        rows={4}
        className="min-w-[300px]"
      />
      {onGenerateShort && isOpenAIEnabled() && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateShort}
          disabled={!value || value.length <= 50}
        >
          Generate Short Description
        </Button>
      )}
    </div>
  );
}

interface DateEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function DateEditor({ value, onChange }: DateEditorProps) {
  return (
    <Input
      type="datetime-local"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[200px]"
    />
  );
}

interface SelectEditorProps<T> {
  value: T | undefined;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}

export function SelectEditor<T extends string>({
  value,
  onChange,
  options,
  placeholder
}: SelectEditorProps<T>) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as T)}
    >
      <SelectTrigger className="min-w-[180px]">
        <SelectValue placeholder={placeholder || "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CompetitionFormatEditor({ value, onChange }: { value: CompetitionFormat | undefined; onChange: (value: CompetitionFormat) => void }) {
  const options = [
    { value: CompetitionFormat.IN_PERSON, label: 'In Person' },
    { value: CompetitionFormat.VIRTUAL, label: 'Virtual' },
    { value: CompetitionFormat.HYBRID, label: 'Hybrid' },
  ];

  return <SelectEditor value={value} onChange={onChange} options={options} placeholder="Select format" />;
}

export function OrgTypeEditor({ value, onChange }: { value: OrgType | undefined; onChange: (value: OrgType) => void }) {
  const options = [
    { value: OrgType.UNIVERSITY, label: 'University' },
    { value: OrgType.STUDENT_CLUB, label: 'Student Club' },
    { value: OrgType.STUDENT_ASSOCIATION, label: 'Student Association' },
    { value: OrgType.COMPANY, label: 'Company' },
    { value: OrgType.NON_PROFIT, label: 'Non Profit' },
    { value: OrgType.IN_HOUSE, label: 'In House' },
  ];

  return <SelectEditor value={value} onChange={onChange} options={options} placeholder="Select org type" />;
}

export function ResourceTypeEditor({ value, onChange }: { value: ResourceType | undefined; onChange: (value: ResourceType) => void }) {
  const options = [
    { value: ResourceType.VIDEO, label: 'Video' },
    { value: ResourceType.ARTICLE, label: 'Article' },
    { value: ResourceType.DECK, label: 'Deck' },
    { value: ResourceType.EXTERNAL_LINK, label: 'External Link' },
    { value: ResourceType.OTHER, label: 'Other' },
  ];

  return <SelectEditor value={value} onChange={onChange} options={options} placeholder="Select resource type" />;
}

export function BooleanEditor({ value, onChange }: { value: boolean | undefined; onChange: (value: boolean) => void }) {
  return (
    <Checkbox
      checked={value === true}
      onCheckedChange={(checked) => onChange(!!checked)}
    />
  );
}

interface ImageUrlEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onUpload?: () => void;
}

export function ImageUrlEditor({ value, onChange, onUpload }: ImageUrlEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL"
          className="min-w-[200px]"
        />
        {value && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
        )}
        {onUpload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
          >
            Upload
          </Button>
        )}
      </div>

      {showPreview && value && (
        <div className="mt-2">
          <img
            src={value}
            alt="Preview"
            className="max-h-24 max-w-xs object-cover rounded"
            onError={() => {
              setShowPreview(false);
              alert('Failed to load image');
            }}
          />
        </div>
      )}
    </div>
  );
}
