import { automationTasks, type AutomationTask, type InsertAutomationTask } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getCurrentTask(): Promise<AutomationTask | undefined>;
  createTask(task: InsertAutomationTask): Promise<AutomationTask>;
  updateTask(id: string, updates: Partial<AutomationTask>): Promise<AutomationTask | undefined>;
  deleteTask(id: string): Promise<boolean>;
  getTaskStatus(): Promise<{ isRunning: boolean; task?: AutomationTask }>;
}

export class DatabaseStorage implements IStorage {
  async getCurrentTask(): Promise<AutomationTask | undefined> {
    const [task] = await db.select().from(automationTasks).limit(1);
    return task || undefined;
  }

  async createTask(insertTask: InsertAutomationTask): Promise<AutomationTask> {
    // Delete any existing task first (since we only support one active task)
    await db.delete(automationTasks);
    
    const id = randomUUID();
    const taskData = {
      ...insertTask,
      id,
      customKey: insertTask.customKey || null,
      holdDuration: insertTask.holdDuration || null,
      holdUnit: insertTask.holdUnit || null,
      pressFrequency: insertTask.pressFrequency || null,
      pressUnit: insertTask.pressUnit || null,
      limitDuration: insertTask.limitDuration ?? false,
      limitValue: insertTask.limitValue || null,
      limitUnit: insertTask.limitUnit || null,
      isRunning: insertTask.isRunning ?? false,
      startTime: insertTask.startTime || null
    };

    const [task] = await db
      .insert(automationTasks)
      .values(taskData)
      .returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<AutomationTask>): Promise<AutomationTask | undefined> {
    const [task] = await db
      .update(automationTasks)
      .set(updates)
      .where(eq(automationTasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db
      .delete(automationTasks)
      .where(eq(automationTasks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTaskStatus(): Promise<{ isRunning: boolean; task?: AutomationTask }> {
    const task = await this.getCurrentTask();
    return {
      isRunning: task?.isRunning || false,
      task: task,
    };
  }
}

export const storage = new DatabaseStorage();
