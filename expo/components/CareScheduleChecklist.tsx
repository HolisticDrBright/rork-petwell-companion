import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";
import { careScheduleService, occurrenceRange, scheduleKey, type CareOccurrence } from "@/services/careScheduleService";
import { requestNotificationPermission } from "@/services/notificationsService";
import { reconcileRecurringAlerts, recurringAlertsEnabled, setRecurringAlertsEnabled } from "@/services/recurringAlerts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

export function CareScheduleChecklist({
  petId, canComplete, days = 1, onManage, reminders = false,
}: {
  petId: string;
  canComplete: boolean;
  days?: number;
  reminders?: boolean;
  onManage?: () => void;
}) {
  const queryClient = useQueryClient();
  const [after, before] = occurrenceRange(days);
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: [...scheduleKey(petId), "occurrences", after.toISOString(), days],
    queryFn: () => careScheduleService.occurrences(petId, after, before),
    refetchInterval: 20_000,
  });
  const showAlerts = reminders && Platform.OS !== "web";
  const [alerts, setAlerts] = useState(false);
  const [alertError, setAlertError] = useState(false);

  useEffect(() => {
    if (!showAlerts) return;
    let current = true;
    void recurringAlertsEnabled(petId).then(enabled => { if (current) setAlerts(enabled); });
    return () => { current = false; };
  }, [petId, showAlerts]);

  useEffect(() => {
    if (!showAlerts || !data || isError) return;
    void reconcileRecurringAlerts(petId, data).catch(() => setAlertError(true));
  }, [data, isError, petId, showAlerts]);

  async function toggleAlerts() {
    setAlertError(false);
    try {
      if (!alerts && !await requestNotificationPermission()) throw new Error("Permission denied");
      await setRecurringAlertsEnabled(petId, !alerts);
      setAlerts(!alerts);
      await reconcileRecurringAlerts(petId, data ?? []);
    } catch {
      setAlertError(true);
    }
  }

  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const complete = useCallback(async (item: CareOccurrence) => {
    if (!canComplete || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await careScheduleService.complete(item);
      await queryClient.invalidateQueries({ queryKey: scheduleKey(petId) });
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, [canComplete, petId, queryClient]);

  if (!onManage && !isError && !data?.length) return null;
  return (
    <Card style={{ gap: Space.sm }}>
      <Text style={Fonts.h3}>{days > 1 ? "Upcoming recurring care" : "Recurring care today"}</Text>
      {isError ? <Text accessibilityRole="alert" style={Fonts.small}>Couldn’t load scheduled tasks. <Text onPress={() => { void refetch(); }}>Try again.</Text></Text> : null}
      {!isError && !isPending && !data?.length ? <Text style={Fonts.small}>No recurring tasks scheduled in this period.</Text> : null}
      {!isError && data?.map(item => {
        const date = new Date(item.scheduled_at);
        const done = !!item.completed_at;
        const actionable = canComplete && !done && date.getTime() <= Date.now();
        return (
          <Pressable
            key={`${item.schedule_id}:${item.scheduled_at}`}
            accessibilityRole={actionable ? "button" : undefined}
            accessibilityLabel={`${item.title}, ${done ? "completed" : "scheduled"}`}
            disabled={!actionable || saving}
            onPress={() => { void complete(item); }}
            style={{ paddingVertical: Space.xs, flexDirection: "row", gap: Space.sm, alignItems: "center" }}
          >
            {done ? <CheckCircle2 size={20} color={Colors.teal700} /> : <Circle size={20} color={Colors.inkSoft} />}
            <View style={{ flex: 1 }}>
              <Text style={Fonts.body}>{item.title}</Text>
              <Text style={Fonts.small}>
                {days > 1 ? date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " · " : ""}
                {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{done ? " · Done" : ""}
              </Text>
              {item.amount ? <Text style={Fonts.small}>{item.kind === "med" ? "Prescribed dose" : "Portion"} · {item.amount}</Text> : null}
              {item.instructions ? <Text style={Fonts.small}>{item.instructions}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      {saveError ? <Text accessibilityRole="alert" style={Fonts.small}>Couldn’t mark the task complete. Try again.</Text> : null}
      {showAlerts ? <>
        <PrimaryButton label={alerts ? "Turn off device alerts" : "Enable device alerts"} variant="outline"
          disabled={!data || isError} onPress={toggleAlerts} />
        <Text style={Fonts.small}>Open Reminders regularly to refresh upcoming alerts on this device.</Text>
        {alertError ? <Text accessibilityRole="alert" style={Fonts.small}>Couldn’t update device alerts. Check notification permissions and try again.</Text> : null}
      </> : null}
      {onManage ? <PrimaryButton label="Manage recurring schedules" variant="outline" onPress={onManage} /> : null}
    </Card>
  );
}
