'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Timeline, TimelineEvent, Competition, LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { EditableTable, LogList } from '@/components/PasteTable';
import { supabase, resolveTimelineId, resolveCompetitionId } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  formatDate,
  isValidDate,
} from '@/lib/utils';
import {
  TextEditor,
  TextareaEditor,
  DateEditor
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Default values for new timeline events
const DEFAULT_VALUES: Partial<TimelineEvent> = {
  id: '',
  createdAt: '',
  updatedAt: '',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof TimelineEvent)[] = ['timelineId', 'name', 'date'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof TimelineEvent, (value: any) => boolean> = {
  date: (value) => !value || isValidDate(value),
} as any;

export default function TimelineManagePage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>('');
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
    name: '',
    date: new Date().toISOString().slice(0, 16),
    timelineId: '',
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewTimelineForm, setShowNewTimelineForm] = useState(false);
  const [newTimelineName, setNewTimelineName] = useState('');

  // Columns for the editable table
  const columns = [
    { key: 'name', header: 'Event Name', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'date', header: 'Date', editor: (value, onChange) => <DateEditor value={value} onChange={onChange} /> },
    { key: 'description', header: 'Description', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    {
      key: 'actions',
      header: 'Actions',
      editor: (_, __, row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveEdit(row as TimelineEvent)}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row as TimelineEvent)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch timelines
      const timelinesResponse = await supabase
        .from('timeline')
        .select('*');

      if (timelinesResponse.error) {
        throw timelinesResponse.error;
      }

      // Fetch competitions to show which competition each timeline belongs to
      const competitionsResponse = await supabase
        .from('competition')
        .select('id, title, timelineId');

      if (competitionsResponse.error) {
        throw competitionsResponse.error;
      }

      setTimelines(timelinesResponse.data || []);
      setCompetitions(competitionsResponse.data || []);

      // If a timeline is selected, fetch its events
      if (selectedTimelineId) {
        await fetchTimelineEvents(selectedTimelineId);
      } else {
        setTimelineEvents([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimelineId]);

  // Fetch timeline events for a specific timeline
  const fetchTimelineEvents = async (timelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('timelineevent')
        .select('*')
        .eq('timelineId', timelineId)
        .order('date');

      if (error) {
        throw error;
      }

      setTimelineEvents(data || []);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle timeline selection
  const handleTimelineSelect = (timelineId: string) => {
    setSelectedTimelineId(timelineId);
    setNewEvent(prev => ({ ...prev, timelineId }));
  };

  // Handle changes to event rows
  const handleRowChange = (index: number, updatedRow: TimelineEvent) => {
    const newEvents = [...timelineEvents];
    newEvents[index] = updatedRow;
    setTimelineEvents(newEvents);
  };

  // Create a new timeline
  const handleCreateTimeline = async () => {
    if (!newTimelineName.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate ID and timestamps
      const now = getNow();
      const newTimeline: Timeline = {
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('timeline')
        .insert([newTimeline]);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Timeline created successfully with ID: ${newTimeline.id}`,
        }
      ]);

      // Refresh timelines and select the new one
      await fetchData();
      setSelectedTimelineId(newTimeline.id);
      setNewEvent(prev => ({ ...prev, timelineId: newTimeline.id }));
      setShowNewTimelineForm(false);
      setNewTimelineName('');
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new event to the selected timeline
  const handleAddEvent = async () => {
    try {
      // Make sure the timeline ID is set
      if (!newEvent.timelineId) {
        throw new Error('Timeline ID is required');
      }

      // Validate the new event
      const { isValid, errors } = validateRow<TimelineEvent>(
        newEvent,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<TimelineEvent>(
        { ...newEvent },
        {
          ...DEFAULT_VALUES,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // Insert into Supabase
      const { data, error } = await supabase
        .from('timelineevent')
        .insert([payload]);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Event "${payload.name}" added successfully`,
        }
      ]);

      // Refresh events and reset form
      await fetchTimelineEvents(payload.timelineId);
      setNewEvent({
        name: '',
        date: new Date().toISOString().slice(0, 16),
        timelineId: payload.timelineId,
      });
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: newEvent,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save an edited event
  const handleSaveEdit = async (event: TimelineEvent) => {
    try {
      // Validate the event
      const { isValid, errors } = validateRow<TimelineEvent>(
        event,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Update timestamp
      const payload = {
        ...event,
        updatedAt: getNow(),
      };

      // Update in Supabase
      const { data, error } = await supabase
        .from('timelineevent')
        .update(payload)
        .eq('id', event.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: timelineEvents.findIndex(e => e.id === event.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Event "${event.name}" updated successfully`,
        }
      ]);

      // Refresh events
      await fetchTimelineEvents(event.timelineId);
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: timelineEvents.findIndex(e => e.id === event.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: event,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an event
  const handleDelete = async (event: TimelineEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('timelineevent')
        .delete()
        .eq('id', event.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: timelineEvents.findIndex(e => e.id === event.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Event "${event.name}" deleted successfully`,
        }
      ]);

      // Refresh events
      await fetchTimelineEvents(event.timelineId);
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: timelineEvents.findIndex(e => e.id === event.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: event,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the competition name from the timeline ID
  const getCompetitionNameFromTimelineId = (timelineId: string) => {
    const competition = competitions.find(c => c.timelineId === timelineId);
    return competition ? competition.title : 'No associated competition';
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Timeline Management</h1>
          <p className="text-zinc-600">
            Add, edit, or remove timeline events. Timelines are associated with competitions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Timeline</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {timelines.length > 0 ? (
                <Select
                  value={selectedTimelineId}
                  onValueChange={handleTimelineSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {timelines.map((timeline) => (
                      <SelectItem key={timeline.id} value={timeline.id}>
                        {timeline.id} - {getCompetitionNameFromTimelineId(timeline.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-zinc-500">No timelines found</div>
              )}
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() => setShowNewTimelineForm(!showNewTimelineForm)}
              >
                {showNewTimelineForm ? 'Cancel' : 'Create New Timeline'}
              </Button>
            </div>
          </div>

          {showNewTimelineForm && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  placeholder="Enter a name for the new competition timeline"
                  value={newTimelineName}
                  onChange={(e) => setNewTimelineName(e.target.value)}
                />
              </div>
              <div>
                <Button
                  onClick={handleCreateTimeline}
                  disabled={isSubmitting || !newTimelineName.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : 'Create Timeline'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedTimelineId && (
          <>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Add New Event</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="Event Name *"
                    value={newEvent.name || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    type="datetime-local"
                    value={newEvent.date?.toString().substring(0, 16) || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Description"
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleAddEvent}
                  disabled={isSubmitting || !newEvent.name?.trim() || !newEvent.date}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Adding...
                    </>
                  ) : 'Add Event'}
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Timeline Events</h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : timelineEvents.length > 0 ? (
                <EditableTable
                  data={timelineEvents}
                  columns={columns}
                  onRowChange={handleRowChange}
                />
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No events found for this timeline. Add an event above.
                </div>
              )}
            </div>
          </>
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
