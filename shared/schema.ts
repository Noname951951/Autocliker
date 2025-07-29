import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const automationTasks = pgTable("automation_tasks", {
  id: varchar("id").primaryKey(),
  selectedKey: text("selected_key").notNull(),
  customKey: text("custom_key"),
  operationMode: text("operation_mode").notNull(), // 'hold' | 'press'
  holdDuration: integer("hold_duration"),
  holdUnit: text("hold_unit"), // 'seconds' | 'minutes' | 'hours'
  pressFrequency: integer("press_frequency"),
  pressUnit: text("press_unit"), // 'per-minute' | 'per-second' | 'per-hour'
  limitDuration: boolean("limit_duration").default(false),
  limitValue: integer("limit_value"),
  limitUnit: text("limit_unit"), // 'seconds' | 'minutes' | 'hours'
  isRunning: boolean("is_running").default(false),
  startTime: text("start_time"),
});

export const insertAutomationTaskSchema = createInsertSchema(automationTasks).omit({
  id: true,
});

export type InsertAutomationTask = z.infer<typeof insertAutomationTaskSchema>;
export type AutomationTask = typeof automationTasks.$inferSelect;

// Additional schemas for API requests
export const startTaskSchema = z.object({
  selectedKey: z.string().min(1, "Key selection is required"),
  customKey: z.string().optional(),
  operationMode: z.enum(["hold", "press"]),
  holdDuration: z.number().optional(),
  holdUnit: z.enum(["seconds", "minutes", "hours"]).optional(),
  pressFrequency: z.number().optional(),
  pressUnit: z.enum(["per-minute", "per-second", "per-hour"]).optional(),
  limitDuration: z.boolean().default(false),
  limitValue: z.number().optional(),
  limitUnit: z.enum(["seconds", "minutes", "hours"]).optional(),
});

export type StartTaskRequest = z.infer<typeof startTaskSchema>;
