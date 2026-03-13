export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
}

export const fetchTodayEvents = async (
  accessToken: string
): Promise<CalendarEvent[]> => {
  console.log("📅 fetchTodayEvents: Starting fetch with token:", accessToken.substring(0, 10) + "...");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch from yesterday to 2 days from now (3-day window)
    const startRange = new Date(today);
    startRange.setDate(startRange.getDate() - 1);
    const endRange = new Date(today);
    endRange.setDate(endRange.getDate() + 2);

    const timeMin = startRange.toISOString();
    const timeMax = endRange.toISOString();

    console.log(`📅 fetchTodayEvents: Range ${timeMin} to ${timeMax}`);

    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    url.searchParams.append("timeMin", timeMin);
    url.searchParams.append("timeMax", timeMax);
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");
    url.searchParams.append("maxResults", "100");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    console.log(`📅 fetchTodayEvents: Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("📅 fetchTodayEvents: API Error Details:", JSON.stringify(errorData, null, 2));
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📅 fetchTodayEvents: Received ${data.items?.length || 0} items`);

    if (!data.items) {
       console.warn("📅 fetchTodayEvents: No items array in response.", data);
       return [];
    }

    const parsedEvents = data.items
      .filter((item: any) => item.status !== "cancelled")
      .map((item: any) => {
        // Handle all-day events vs specific time events
        const isAllDay = !!item.start?.date;
        const startVal = item.start?.dateTime || item.start?.date;
        const endVal = item.end?.dateTime || item.end?.date;

        if (!startVal || !endVal) {
          console.warn(`📅 fetchTodayEvents: Skipping event ${item.id} due to missing start/end`, item);
          return null;
        }

        return {
          id: item.id,
          summary: item.summary || "Untitled Task",
          start: new Date(startVal),
          end: new Date(endVal),
        };
      })
      .filter((e: any): e is CalendarEvent => e !== null);

    console.log(`📅 fetchTodayEvents: Successfully parsed ${parsedEvents.length} events`);
    return parsedEvents;
  } catch (error) {
    console.error("📅 fetchTodayEvents: Fatal Error:", error);
    return [];
  }
};

export const getActiveEvent = (events: CalendarEvent[]): CalendarEvent | null => {
  const now = new Date();
  return (
    events.find((event) => now >= event.start && now <= event.end) || null
  );
};
