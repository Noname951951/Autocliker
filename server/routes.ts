import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startTaskSchema } from "@shared/schema";
import { WebSocketServer } from 'ws';

// For keyboard simulation - these would need to be installed via npm
// Note: In a real implementation, you'd need packages like 'robotjs' and 'globalkey'
let globalKeyListener: any = null;
let automationInterval: NodeJS.Timeout | null = null;
let automationTimeout: NodeJS.Timeout | null = null;

// Mock keyboard simulation functions (replace with actual robotjs implementation)
const simulateKeyPress = (key: string) => {
  console.log(`Simulating key press: ${key}`);
  // In real implementation: robot.keyTap(key);
};

const simulateKeyDown = (key: string) => {
  console.log(`Simulating key down: ${key}`);
  // In real implementation: robot.keyToggle(key, 'down');
};

const simulateKeyUp = (key: string) => {
  console.log(`Simulating key up: ${key}`);
  // In real implementation: robot.keyToggle(key, 'up');
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time status updates  
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  const broadcastStatus = async () => {
    const status = await storage.getTaskStatus();
    const statusData = {
      type: 'status',
      ...status,
      timestamp: new Date().toISOString(),
    };
    
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(statusData));
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial status
    storage.getTaskStatus().then(status => {
      ws.send(JSON.stringify({
        type: 'status',
        ...status,
        timestamp: new Date().toISOString(),
      }));
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Get current task status
  app.get("/api/task/status", async (req, res) => {
    try {
      const status = await storage.getTaskStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting task status:", error);
      res.status(500).json({ error: "Failed to get task status" });
    }
  });

  // Start automation task
  app.post("/api/task/start", async (req, res) => {
    try {
      const validatedData = startTaskSchema.parse(req.body);
      
      // Stop any existing task
      await stopAutomation();
      
      // Create new task
      const task = await storage.createTask({
        ...validatedData,
        isRunning: true,
        startTime: new Date().toISOString(),
      });

      // Start automation based on mode
      await startAutomation(task);
      
      res.json({ success: true, task });
      broadcastStatus();
    } catch (error) {
      console.error("Error starting task:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to start task" });
    }
  });

  // Stop automation task
  app.post("/api/task/stop", async (req, res) => {
    try {
      await stopAutomation();
      res.json({ success: true });
      broadcastStatus();
    } catch (error) {
      console.error("Error stopping task:", error);
      res.status(500).json({ error: "Failed to stop task" });
    }
  });

  // Emergency stop
  app.post("/api/task/emergency-stop", async (req, res) => {
    try {
      await emergencyStop();
      res.json({ success: true });
      broadcastStatus();
    } catch (error) {
      console.error("Error during emergency stop:", error);
      res.status(500).json({ error: "Failed to perform emergency stop" });
    }
  });

  const startAutomation = async (task: any) => {
    const key = task.customKey || task.selectedKey;
    
    if (task.operationMode === 'hold') {
      // Hold key continuously
      simulateKeyDown(key);
      
      if (task.holdDuration && task.holdUnit) {
        const durationMs = convertToMilliseconds(task.holdDuration, task.holdUnit);
        automationTimeout = setTimeout(async () => {
          simulateKeyUp(key);
          await stopAutomation();
          broadcastStatus();
        }, durationMs);
      }
    } else if (task.operationMode === 'press') {
      // Press key at intervals
      const intervalMs = calculateInterval(task.pressFrequency, task.pressUnit);
      
      automationInterval = setInterval(() => {
        simulateKeyPress(key);
      }, intervalMs);
      
      // Set duration limit if specified
      if (task.limitDuration && task.limitValue && task.limitUnit) {
        const durationMs = convertToMilliseconds(task.limitValue, task.limitUnit);
        automationTimeout = setTimeout(async () => {
          await stopAutomation();
          broadcastStatus();
        }, durationMs);
      }
    }

    // Update task as running
    await storage.updateTask(task.id, { isRunning: true });
  };

  const stopAutomation = async () => {
    if (automationInterval) {
      clearInterval(automationInterval);
      automationInterval = null;
    }
    
    if (automationTimeout) {
      clearTimeout(automationTimeout);
      automationTimeout = null;
    }

    const currentTask = await storage.getCurrentTask();
    if (currentTask) {
      // If it was a hold operation, make sure to release the key
      if (currentTask.operationMode === 'hold') {
        const key = currentTask.customKey || currentTask.selectedKey;
        simulateKeyUp(key);
      }
      
      await storage.updateTask(currentTask.id, { isRunning: false });
    }
  };

  const emergencyStop = async () => {
    await stopAutomation();
    // Additional emergency cleanup if needed
  };

  const convertToMilliseconds = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds': return value * 1000;
      case 'minutes': return value * 60 * 1000;
      case 'hours': return value * 60 * 60 * 1000;
      default: return value * 1000;
    }
  };

  const calculateInterval = (frequency: number, unit: string): number => {
    switch (unit) {
      case 'per-second': return 1000 / frequency;
      case 'per-minute': return 60000 / frequency;
      case 'per-hour': return 3600000 / frequency;
      default: return 60000 / frequency; // default to per-minute
    }
  };

  // Global hotkey setup (F6 and ESC)
  // Note: This is a simplified implementation. In a real app, you'd use a library like 'globalkey'
  const setupGlobalHotkeys = () => {
    // Mock global hotkey setup
    console.log('Global hotkeys setup: F6 (toggle), ESC (emergency stop)');
    
    // In real implementation:
    // globalKey.register('F6', async () => {
    //   const status = await storage.getTaskStatus();
    //   if (status.isRunning) {
    //     await stopAutomation();
    //   } else {
    //     // Would need to handle starting with last settings or show UI
    //   }
    //   broadcastStatus();
    // });
    
    // globalKey.register('Escape', async () => {
    //   await emergencyStop();
    //   broadcastStatus();
    // });
  };

  setupGlobalHotkeys();

  return httpServer;
}
