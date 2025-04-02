import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LogEntry } from '@/types';

interface PasteTableProps {
  headers: string[];
  onParse: (rows: any[]) => void;
  parseInstructions?: string;
  placeholder?: string;
}

export default function PasteTable({
  headers,
  onParse,
  parseInstructions = 'Paste TSV/CSV data (tab or comma separated)',
  placeholder = 'Paste data here...',
}: PasteTableProps) {
  const [inputText, setInputText] = useState('');

  const handleParse = () => {
    if (!inputText.trim()) return;

    // Split by lines and remove empty lines
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    // Detect separator (tab or comma)
    const firstLine = lines[0];
    const separator = firstLine.includes('\t') ? '\t' : ',';

    // Parse each line into an array of values
    const rows = lines.map(line => {
      const values = line.split(separator);
      const row: Record<string, any> = {};

      // Map values to headers
      headers.forEach((header, index) => {
        if (index < values.length) {
          const value = values[index].trim();
          // Handle empty strings
          row[header] = value === '' ? undefined : value;
        }
      });

      return row;
    });

    onParse(rows);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-500">
        {parseInstructions}
      </div>
      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={placeholder}
        className="font-mono h-60"
      />
      <Button onClick={handleParse} disabled={!inputText.trim()}>
        Parse Data
      </Button>
    </div>
  );
}

interface EditableTableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    header: string;
    width?: number;
    editor?: (value: any, onChange: (value: any) => void, row: T) => JSX.Element;
  }[];
  onRowChange: (rowIndex: number, updatedRow: T) => void;
  getRowError?: (row: T) => string | null;
}

export function EditableTable<T>({
  data,
  columns,
  onRowChange,
  getRowError,
}: EditableTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200">
        <thead className="bg-zinc-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key as string}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"
                style={column.width ? { width: `${column.width}px` } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-200">
          {data.map((row, rowIndex) => {
            const error = getRowError ? getRowError(row) : null;
            return (
              <tr
                key={rowIndex}
                className={error ? "bg-red-50" : ""}
              >
                {columns.map((column) => {
                  const key = column.key as string;
                  const value = key.includes('.')
                    ? key.split('.').reduce((obj, path) => obj && obj[path], row as any)
                    : (row as any)[key];

                  return (
                    <td key={key} className="px-6 py-4 text-sm">
                      {column.editor ? (
                        column.editor(
                          value,
                          (newValue) => {
                            const updatedRow = { ...row };
                            if (key.includes('.')) {
                              const paths = key.split('.');
                              let current: any = updatedRow;
                              for (let i = 0; i < paths.length - 1; i++) {
                                if (!current[paths[i]]) current[paths[i]] = {};
                                current = current[paths[i]];
                              }
                              current[paths[paths.length - 1]] = newValue;
                            } else {
                              (updatedRow as any)[key] = newValue;
                            }
                            onRowChange(rowIndex, updatedRow);
                          },
                          row
                        )
                      ) : (
                        <div className="truncate max-w-xs">{value?.toString() || '-'}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface LogListProps {
  logs: LogEntry[];
}

export function LogList({ logs }: LogListProps) {
  const successCount = logs.filter((log) => log.status === 'success').length;
  const errorCount = logs.filter((log) => log.status === 'error').length;
  const skippedCount = logs.filter((log) => log.status === 'skipped').length;

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="bg-green-100 p-2 rounded">
          <span className="text-green-800 font-medium">Success: {successCount}</span>
        </div>
        <div className="bg-red-100 p-2 rounded">
          <span className="text-red-800 font-medium">Error: {errorCount}</span>
        </div>
        <div className="bg-yellow-100 p-2 rounded">
          <span className="text-yellow-800 font-medium">Skipped: {skippedCount}</span>
        </div>
      </div>

      <div className="space-y-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded text-sm ${
              log.status === 'success' ? 'bg-green-50 text-green-800' :
              log.status === 'error' ? 'bg-red-50 text-red-800' :
              'bg-yellow-50 text-yellow-800'
            }`}
          >
            <div className="font-medium">
              Row {log.rowIndex + 1} - {log.status.toUpperCase()} - {new Date(log.timestamp).toLocaleTimeString()}
            </div>
            {log.message && <div className="mt-1">{log.message}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorTabsProps {
  validRows: any[];
  errorRows: { row: any; error: string }[];
  onSubmitValid: () => void;
  onUpdateError: (index: number, updatedRow: any) => void;
  onRetryError: (index: number) => void;
  columns: any[];
}

export function ErrorTabs({
  validRows,
  errorRows,
  onSubmitValid,
  onUpdateError,
  onRetryError,
  columns,
}: ErrorTabsProps) {
  return (
    <Tabs defaultValue="valid">
      <TabsList>
        <TabsTrigger value="valid">
          Valid ({validRows.length})
        </TabsTrigger>
        <TabsTrigger value="errors">
          Errors ({errorRows.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="valid" className="space-y-4 p-4">
        {validRows.length > 0 ? (
          <>
            <EditableTable
              data={validRows}
              columns={columns}
              onRowChange={(index, updatedRow) => {
                /* Update valid row */
              }}
            />
            <Button onClick={onSubmitValid} disabled={validRows.length === 0}>
              Submit {validRows.length} Rows
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            No valid rows to submit.
          </div>
        )}
      </TabsContent>

      <TabsContent value="errors" className="space-y-4 p-4">
        {errorRows.length > 0 ? (
          <div className="space-y-6">
            {errorRows.map((item, index) => (
              <div key={index} className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 p-3 border-b border-red-200">
                  <div className="text-red-800 font-medium">Error in Row {index + 1}</div>
                  <div className="text-red-600 text-sm mt-1">{item.error}</div>
                </div>
                <div className="p-3">
                  <EditableTable
                    data={[item.row]}
                    columns={columns}
                    onRowChange={(_, updatedRow) => {
                      onUpdateError(index, updatedRow);
                    }}
                  />
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetryError(index)}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            No errors to fix!
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
