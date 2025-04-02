'use client';

import { useState } from 'react';
import { type Competition, CompetitionFormat, type LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import PasteTable, { EditableTable, LogList, ErrorTabs } from '@/components/PasteTable';
import { supabase, resolveUniversityId, resolveOrganizerId } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  isValidUrl,
  isValidNumber,
  toNumber
} from '@/lib/utils';
import {
  TextEditor,
  NumberEditor,
  TextareaEditor,
  LongDescriptionEditor,
  CompetitionFormatEditor,
  BooleanEditor,
  ImageUrlEditor
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Headers for the bulk paste input
const HEADERS = [
  'title',
  'shortDescription',
  'longDescription',
  'format',
  'category',
  'tags',
  'prizeAmount',
  'shortPrizeInfo',
  'registrationFee',
  'registrationInfo',
  'eligibilityInfo',
  'lastDayToRegister',
  'city',
  'state',
  'country',
  'websiteUrl',
  'competitionImageUrl',
  'teamSizeMin',
  'teamSizeMax',
  'universityName', // Will be resolved to universityId
  'organizerName',  // Will be resolved to organizerId
];

// Default values for new competitions
const DEFAULT_VALUES: Partial<Competition> = {
  id: '',
  isInternal: false,
  isFeatured: false,
  isHostedByCaseComp: false,
  isConfirmed: true,
  createdAt: '',
  updatedAt: '',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof Competition)[] = ['title'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof Competition, (value: any) => boolean> = {
  websiteUrl: (value) => !value || isValidUrl(value),
  competitionImageUrl: (value) => !value || isValidUrl(value),
  prizeAmount: (value) => !value || isValidNumber(value),
  registrationFee: (value) => !value || isValidNumber(value),
  teamSizeMin: (value) => !value || isValidNumber(value),
  teamSizeMax: (value) => !value || isValidNumber(value),
} as any;

export default function CompetitionsBulkPage() {
  const [parsedRows, setParsedRows] = useState<Partial<Competition>[]>([]);
  const [validRows, setValidRows] = useState<Partial<Competition>[]>([]);
  const [errorRows, setErrorRows] = useState<{ row: Partial<Competition>; error: string }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Columns for the editable table
  const columns = [
    { key: 'title', header: 'Title', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'shortDescription', header: 'Short Description', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'longDescription', header: 'Long Description', editor: (value, onChange, row) => (
      <LongDescriptionEditor
        value={value}
        onChange={onChange}
        onGenerateShort={() => handleGenerateShortDescription(row as Partial<Competition>)}
      />
    )},
    { key: 'format', header: 'Format', editor: (value, onChange) => <CompetitionFormatEditor value={value} onChange={onChange} /> },
    { key: 'category', header: 'Category', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'tags', header: 'Tags', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'prizeAmount', header: 'Prize Amount ($)', editor: (value, onChange) => <NumberEditor value={value} onChange={onChange} /> },
    { key: 'shortPrizeInfo', header: 'Short Prize Info', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'registrationFee', header: 'Reg. Fee ($)', editor: (value, onChange) => <NumberEditor value={value} onChange={onChange} /> },
    { key: 'registrationInfo', header: 'Registration Info', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    { key: 'eligibilityInfo', header: 'Eligibility Info', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    { key: 'lastDayToRegister', header: 'Last Day to Register', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'city', header: 'City', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'state', header: 'State', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'country', header: 'Country', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'websiteUrl', header: 'Website URL', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'competitionImageUrl', header: 'Image URL', editor: (value, onChange) => <ImageUrlEditor value={value} onChange={onChange} /> },
    { key: 'teamSizeMin', header: 'Min Team Size', editor: (value, onChange) => <NumberEditor value={value} onChange={onChange} /> },
    { key: 'teamSizeMax', header: 'Max Team Size', editor: (value, onChange) => <NumberEditor value={value} onChange={onChange} /> },
    { key: 'universityId', header: 'University ID', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'organizerId', header: 'Organizer ID', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'isFeatured', header: 'Featured', editor: (value, onChange) => <BooleanEditor value={value} onChange={onChange} /> },
    { key: 'isConfirmed', header: 'Confirmed', editor: (value, onChange) => <BooleanEditor value={value} onChange={onChange} /> },
  ];

  // Handle parsed input from PasteTable component
  const handleParse = async (rows: any[]) => {
    // Reset state
    setValidRows([]);
    setErrorRows([]);
    setLogs([]);
    setParsedRows(rows);

    // Process each row
    const valid: Partial<Competition>[] = [];
    const errors: { row: Partial<Competition>; error: string }[] = [];

    for (const row of rows) {
      // Convert types
      const processedRow: Partial<Competition> = {
        ...row,
        prizeAmount: toNumber(row.prizeAmount),
        registrationFee: toNumber(row.registrationFee),
        teamSizeMin: toNumber(row.teamSizeMin),
        teamSizeMax: toNumber(row.teamSizeMax),
      };

      // Validate row
      const { isValid, errors: validationErrors } = validateRow<Competition>(
        processedRow,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (isValid) {
        valid.push(processedRow);
      } else {
        errors.push({
          row: processedRow,
          error: validationErrors.join(', ')
        });
      }
    }

    setValidRows(valid);
    setErrorRows(errors);
  };

  // Generate short description using OpenAI
  const handleGenerateShortDescription = async (row: Partial<Competition>) => {
    if (!row.longDescription || row.longDescription.length <= 50) {
      return;
    }

    try {
      const response = await fetch('/api/gpt-shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ longDescription: row.longDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate short description');
      }

      const data = await response.json();

      // Update the row with the generated short description
      const updatedRows = validRows.map((r) =>
        r === row ? { ...r, shortDescription: data.shortDescription } : r
      );

      setValidRows(updatedRows);
    } catch (error) {
      console.error('Error generating short description:', error);
    }
  };

  // Submit a row to Supabase
  const submitRow = async (row: Partial<Competition>, rowIndex: number) => {
    try {
      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<Competition>(
        { ...row },
        {
          ...DEFAULT_VALUES,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // Handle foreign key resolution
      if (row.universityName) {
        payload.universityId = await resolveUniversityId(row.universityName as string);
      }

      if (row.organizerName) {
        payload.organizerId = await resolveOrganizerId(row.organizerName as string);
      }

      // Clean tags if provided as string
      if (typeof payload.tags === 'string') {
        payload.tags = (payload.tags as string).split(',').map(tag => tag.trim());
      }

      // Clean the payload to match the table schema
      delete (payload as any).universityName;
      delete (payload as any).organizerName;

      // Insert into Supabase
      const { data, error } = await supabase
        .from('competition')
        .insert([payload]);

      if (error) {
        throw new Error(error.message);
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex,
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Competition "${payload.title}" inserted successfully`,
        }
      ]);

      return true;
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: row,
        }
      ]);

      return false;
    }
  };

  // Submit all valid rows
  const handleSubmitValid = async () => {
    setIsSubmitting(true);

    // Submit each row individually for better error tracking
    for (let i = 0; i < validRows.length; i++) {
      await submitRow(validRows[i], i);
    }

    setIsSubmitting(false);
    // Clear valid rows after submission
    setValidRows([]);
  };

  // Update an error row
  const handleUpdateError = (index: number, updatedRow: Partial<Competition>) => {
    const newErrorRows = [...errorRows];
    newErrorRows[index].row = updatedRow;
    setErrorRows(newErrorRows);
  };

  // Retry submitting an error row
  const handleRetryError = async (index: number) => {
    const { row } = errorRows[index];

    // Validate again
    const { isValid, errors: validationErrors } = validateRow<Competition>(
      row,
      REQUIRED_FIELDS,
      TYPE_VALIDATIONS as any
    );

    if (isValid) {
      // Submit the row
      const success = await submitRow(row, parsedRows.indexOf(row));

      if (success) {
        // Remove from error rows
        const newErrorRows = [...errorRows];
        newErrorRows.splice(index, 1);
        setErrorRows(newErrorRows);
      }
    } else {
      // Update error message
      const newErrorRows = [...errorRows];
      newErrorRows[index].error = validationErrors.join(', ');
      setErrorRows(newErrorRows);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Competition Bulk Entry</h1>
          <p className="text-zinc-600">
            Paste tabular competition data for bulk processing. Data will be parsed and validated before insertion.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Paste Data</h2>
            <PasteTable
              headers={HEADERS}
              onParse={handleParse}
              parseInstructions="Paste TSV/CSV competition data. Headers should include: title, shortDescription, format, etc."
              placeholder="Paste competition data here..."
            />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Import Instructions</h2>
            <div className="prose prose-sm">
              <p>The following fields are supported:</p>
              <ul className="list-disc pl-5">
                <li><strong>title</strong> (required): Competition name</li>
                <li><strong>shortDescription</strong>: Brief description (max 50 chars)</li>
                <li><strong>longDescription</strong>: Detailed description</li>
                <li><strong>format</strong>: IN_PERSON, VIRTUAL, or HYBRID</li>
                <li><strong>universityName</strong>: Will be resolved to universityId</li>
                <li><strong>organizerName</strong>: Will be resolved to organizerId</li>
              </ul>
              <p className="text-sm mt-4">
                <strong>Note:</strong> Fields like createdAt, updatedAt, isConfirmed will be auto-populated.
              </p>
            </div>
          </div>
        </div>

        {(validRows.length > 0 || errorRows.length > 0) && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Preview & Submit</h2>
            <ErrorTabs
              validRows={validRows}
              errorRows={errorRows}
              onSubmitValid={handleSubmitValid}
              onUpdateError={handleUpdateError}
              onRetryError={handleRetryError}
              columns={columns}
            />
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Log</h2>
            <LogList logs={logs} />
          </div>
        )}
      </div>
    </main>
  );
}
