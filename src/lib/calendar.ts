export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
}

export const fetchTodayEvents = async (
  accessToken: string
): Promise<CalendarEvent[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeMin = today.toISOString();
    const timeMax = tomorrow.toISOString();

    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    url.searchParams.append("timeMin", timeMin);
    url.searchParams.append("timeMax", timeMax);
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");
    url.searchParams.append("maxResults", "100"); // Ensure we get all events

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items) {
       console.warn("Calendar API returned no items array. Data:", data);
       return [];
    }

    return data.items
      .filter((item: any) => item.status !== "cancelled")
      .map((item: any) => {
        // Handle all-day events vs specific time events
        const isAllDay = !!item.start?.date;
        let start = isAllDay ? new Date(item.start.date) : new Date(item.start.dateTime);
        let end = isAllDay ? new Date(item.end.date) : new Date(item.end.dateTime);

        return {
          id: item.id,
          summary: item.summary || "Untitled Task",
          start,
          end,
        };
      });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
};

export const getActiveEvent = (events: CalendarEvent[]): CalendarEvent | null => {
  const now = new Date();
  return (
    events.find((event) => now >= event.start && now <= event.end) || null
  );
};
