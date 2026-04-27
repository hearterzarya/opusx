 "use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

type Settings = {
  allowUserKeyCreation: boolean;
  allowPublicRegistration: boolean;
  defaultTokenBudget: number;
  defaultRequestsPerMinute: number;
  defaultRollingWindowLimit: number;
  hasAnthropicApiKey: boolean;
  keyRotationEvents: string[];
  statuses: Array<{ service: "proxy" | "gateway" | "keys"; state: "operational" | "degraded" | "down"; description: string }>;
};

const settingsSchema = z.object({
  anthropicApiKey: z.string().optional(),
  allowUserKeyCreation: z.boolean(),
  allowPublicRegistration: z.boolean(),
  defaultTokenBudget: z.number().int().positive(),
  defaultRequestsPerMinute: z.number().int().positive(),
  defaultRollingWindowLimit: z.number().int().positive(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      anthropicApiKey: "",
      allowUserKeyCreation: true,
      allowPublicRegistration: true,
      defaultTokenBudget: 1000000,
      defaultRequestsPerMinute: 10,
      defaultRollingWindowLimit: 500000,
    },
  });

  useEffect(() => {
    void fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data: Settings) => {
        setSettings(data);
        form.reset({
          anthropicApiKey: "",
          allowUserKeyCreation: data.allowUserKeyCreation,
          allowPublicRegistration: data.allowPublicRegistration,
          defaultTokenBudget: data.defaultTokenBudget,
          defaultRequestsPerMinute: data.defaultRequestsPerMinute,
          defaultRollingWindowLimit: data.defaultRollingWindowLimit,
        });
      });
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropicApiKey: values.anthropicApiKey || undefined,
        allowUserKeyCreation: values.allowUserKeyCreation,
        allowPublicRegistration: values.allowPublicRegistration,
        defaultTokenBudget: values.defaultTokenBudget,
        defaultRequestsPerMinute: values.defaultRequestsPerMinute,
        defaultRollingWindowLimit: values.defaultRollingWindowLimit,
        statuses: settings?.statuses,
      }),
    });
    const data = (await response.json()) as Settings | { error: string };
    if (!response.ok || "error" in data) {
      toast.error("Failed to update settings");
      return;
    }
    setSettings(data);
    form.reset({
      anthropicApiKey: "",
      allowUserKeyCreation: data.allowUserKeyCreation,
      allowPublicRegistration: data.allowPublicRegistration,
      defaultTokenBudget: data.defaultTokenBudget,
      defaultRequestsPerMinute: data.defaultRequestsPerMinute,
      defaultRollingWindowLimit: data.defaultRollingWindowLimit,
    });
    toast.success("Settings updated");
  });

  return (
    <div className="space-y-8">
      <h1 className="display-italic text-4xl">Settings</h1>
      <form onSubmit={submit} className="card mono space-y-4 p-5 text-sm text-[var(--text-muted)]">
        <p>Use env `ANTHROPIC_API_KEY` as primary key, DB encrypted fallback as secondary.</p>
        <p className="text-xs text-[var(--text-muted)]">Stored key present: {settings?.hasAnthropicApiKey ? "Yes" : "No"}</p>
        <input
          {...form.register("anthropicApiKey")}
          className="w-full border border-[var(--border)] bg-[var(--surface-2)] p-2"
          placeholder="New Anthropic API key (optional)"
        />
        <Controller
          control={form.control}
          name="allowUserKeyCreation"
          render={({ field }) => (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
              Allow users to self-create keys
            </label>
          )}
        />
        <Controller
          control={form.control}
          name="allowPublicRegistration"
          render={({ field }) => (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
              Allow public registration
            </label>
          )}
        />
        <div className="grid gap-2 md:grid-cols-2">
          <input
            type="number"
            className="border border-[var(--border)] bg-[var(--surface-2)] p-2"
            {...form.register("defaultTokenBudget", { valueAsNumber: true })}
          />
          <input
            type="number"
            className="border border-[var(--border)] bg-[var(--surface-2)] p-2"
            {...form.register("defaultRequestsPerMinute", { valueAsNumber: true })}
          />
          <input
            type="number"
            className="border border-[var(--border)] bg-[var(--surface-2)] p-2"
            {...form.register("defaultRollingWindowLimit", { valueAsNumber: true })}
          />
        </div>
        <div className="border border-[var(--border)] p-3 text-xs">
          <p className="mb-2">System status overrides</p>
          <div className="space-y-2">
            {settings?.statuses?.map((status) => (
              <div key={status.service} className="grid gap-2 md:grid-cols-3">
                <span className="uppercase">{status.service}</span>
                <select
                  className="border border-[var(--border)] bg-[var(--surface-2)] p-2"
                  value={status.state}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            statuses: prev.statuses.map((item) =>
                              item.service === status.service ? { ...item, state: event.target.value as "operational" | "degraded" | "down" } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                >
                  <option value="operational">operational</option>
                  <option value="degraded">degraded</option>
                  <option value="down">down</option>
                </select>
                <input
                  className="border border-[var(--border)] bg-[var(--surface-2)] p-2"
                  value={status.description}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            statuses: prev.statuses.map((item) =>
                              item.service === status.service ? { ...item, description: event.target.value } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <button className="border border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)]" type="submit">
          Save settings
        </button>
        <div className="border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
          <p className="mb-1">Recent key rotations:</p>
          {settings?.keyRotationEvents?.length ? (
            <ul className="space-y-1">
              {settings.keyRotationEvents.map((event) => (
                <li key={event}>{new Date(event).toLocaleString()}</li>
              ))}
            </ul>
          ) : (
            <p>No key rotations recorded yet.</p>
          )}
        </div>
      </form>
    </div>
  );
}
