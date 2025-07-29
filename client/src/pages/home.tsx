import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Play, Pause, StopCircle, Info, Keyboard } from 'lucide-react';
import type { StartTaskRequest } from '@shared/schema';

interface TaskStatus {
  isRunning: boolean;
  task?: any;
  timestamp?: string;
}

const predefinedKeys = [
  { value: 'space', label: 'Space' },
  { value: 'enter', label: 'Enter' },
  { value: 'ctrl', label: 'Ctrl' },
  { value: 'shift', label: 'Shift' },
  { value: 'alt', label: 'Alt' },
  { value: 'tab', label: 'Tab' },
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
  { value: 'custom', label: 'Custom Key...' }
];

export default function Home() {
  const { toast } = useToast();
  
  // Form state
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');
  const [operationMode, setOperationMode] = useState<'hold' | 'press'>('press');
  const [holdDuration, setHoldDuration] = useState<string>('');
  const [holdUnit, setHoldUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes');
  const [pressFrequency, setPressFrequency] = useState<string>('10');
  const [pressUnit, setPressUnit] = useState<'per-minute' | 'per-second' | 'per-hour'>('per-minute');
  const [limitDuration, setLimitDuration] = useState<boolean>(false);
  const [limitValue, setLimitValue] = useState<string>('');
  const [limitUnit, setLimitUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes');
  
  // Status state
  const [runtime, setRuntime] = useState<string>('00:00:00');
  const [wsStatus, setWsStatus] = useState<TaskStatus>({ isRunning: false });

  // WebSocket connection for real-time status
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setWsStatus(data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => ws.close();
  }, []);

  // Runtime timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (wsStatus.isRunning && wsStatus.task?.startTime) {
      interval = setInterval(() => {
        const startTime = new Date(wsStatus.task.startTime);
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setRuntime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setRuntime('00:00:00');
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [wsStatus.isRunning, wsStatus.task?.startTime]);

  // Get task status
  const { data: taskStatus } = useQuery({
    queryKey: ['/api/task/status'],
    refetchInterval: wsStatus.isRunning ? false : 5000, // Don't poll when using WebSocket
  });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: async (data: StartTaskRequest) => {
      const response = await apiRequest('POST', '/api/task/start', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Started',
        description: 'Keyboard automation has been started.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/task/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start task',
        variant: 'destructive',
      });
    },
  });

  // Pause task mutation
  const stopTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/task/stop');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Stopped',
        description: 'Keyboard automation has been stopped.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/task/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop task',
        variant: 'destructive',
      });
    },
  });

  // Emergency stop mutation
  const emergencyStopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/task/emergency-stop');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Emergency Pause',
        description: 'All automation has been stopped immediately.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/task/status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform emergency stop',
        variant: 'destructive',
      });
    },
  });

  // Global hotkey listener (F6 and ESC)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F6') {
        event.preventDefault();
        handleToggleOperation();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        emergencyStopMutation.mutate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wsStatus.isRunning]);

  const handleToggleOperation = useCallback(() => {
    if (wsStatus.isRunning) {
      stopTaskMutation.mutate();
    } else {
      handleStartTask();
    }
  }, [wsStatus.isRunning]);

  const handleStartTask = () => {
    // Validation
    if (!selectedKey) {
      toast({
        title: 'Validation Error',
        description: 'Please select a key to automate.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedKey === 'custom' && !customKey.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a custom key.',
        variant: 'destructive',
      });
      return;
    }

    if (operationMode === 'hold' && (!holdDuration || parseInt(holdDuration) <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid hold duration.',
        variant: 'destructive',
      });
      return;
    }

    if (operationMode === 'press' && (!pressFrequency || parseInt(pressFrequency) <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid press frequency.',
        variant: 'destructive',
      });
      return;
    }

    if (limitDuration && (!limitValue || parseInt(limitValue) <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid duration limit.',
        variant: 'destructive',
      });
      return;
    }

    const taskData: StartTaskRequest = {
      selectedKey: selectedKey === 'custom' ? customKey : selectedKey,
      customKey: selectedKey === 'custom' ? customKey : undefined,
      operationMode,
      holdDuration: operationMode === 'hold' ? parseInt(holdDuration) : undefined,
      holdUnit: operationMode === 'hold' ? holdUnit : undefined,
      pressFrequency: operationMode === 'press' ? parseInt(pressFrequency) : undefined,
      pressUnit: operationMode === 'press' ? pressUnit : undefined,
      limitDuration,
      limitValue: limitDuration ? parseInt(limitValue) : undefined,
      limitUnit: limitDuration ? limitUnit : undefined,
    };

    startTaskMutation.mutate(taskData);
  };

  const currentStatus = wsStatus || taskStatus;
  const isRunning = currentStatus?.isRunning || false;
  const currentTask = currentStatus?.task;

  const getDisplayKey = () => {
    if (!currentTask) return '-';
    return currentTask.customKey || currentTask.selectedKey;
  };

  const getOperationDescription = () => {
    if (!currentTask) return '-';
    if (currentTask.operationMode === 'hold') {
      return `Hold for ${currentTask.holdDuration} ${currentTask.holdUnit}`;
    } else {
      return `Press ${currentTask.pressFrequency} ${currentTask.pressUnit}`;
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* BlondaQ Watermark */}
      <div className="fixed top-4 right-4 opacity-20 z-10">
        <div className="text-red-500 font-bold text-lg tracking-wider">BlondaQ</div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-black mb-2">Keyboard Automation Tool</h1>
          <p className="text-gray-600 text-sm">Automate key presses and holds with precision control</p>
        </header>

        {/* Main Control Panel */}
        <Card className="mb-6">
          <CardContent className="p-8">
            {/* Key Selection Section */}
            <div className="mb-8">
              <Label className="text-sm font-medium text-black mb-3">Select Key</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a key..." />
                </SelectTrigger>
                <SelectContent>
                  {predefinedKeys.map((key) => (
                    <SelectItem key={key.value} value={key.value}>
                      {key.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedKey === 'custom' && (
                <div className="mt-3">
                  <Input
                    type="text"
                    placeholder="Enter custom key (e.g., F1, 1, etc.)"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    maxLength={10}
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* Operation Mode Section */}
            <div className="mb-8">
              <Label className="text-sm font-medium text-black mb-4">Operation Mode</Label>
              <RadioGroup value={operationMode} onValueChange={(value: 'hold' | 'press') => setOperationMode(value)}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="hold" id="hold" />
                    <div>
                      <Label htmlFor="hold" className="font-medium text-black">Hold Key Continuously</Label>
                      <div className="text-sm text-gray-600">Keep the selected key pressed for a specified duration</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="press" id="press" />
                    <div>
                      <Label htmlFor="press" className="font-medium text-black">Press Key at Intervals</Label>
                      <div className="text-sm text-gray-600">Repeatedly press the key at specified intervals</div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Settings Section */}
            <div className="mb-8">
              {/* Hold Duration Settings */}
              {operationMode === 'hold' && (
                <div className="mb-6">
                  <Label className="text-sm font-medium text-black mb-3">Hold Duration</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Duration"
                      min="1"
                      max="999"
                      value={holdDuration}
                      onChange={(e) => setHoldDuration(e.target.value)}
                    />
                    <Select value={holdUnit} onValueChange={(value: 'seconds' | 'minutes' | 'hours') => setHoldUnit(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Interval Settings */}
              {operationMode === 'press' && (
                <div>
                  <Label className="text-sm font-medium text-black mb-3">Press Interval</Label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input
                      type="number"
                      placeholder="Frequency"
                      min="1"
                      max="999"
                      value={pressFrequency}
                      onChange={(e) => setPressFrequency(e.target.value)}
                    />
                    <Select value={pressUnit} onValueChange={(value: 'per-minute' | 'per-second' | 'per-hour') => setPressUnit(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per-minute">Times per Minute</SelectItem>
                        <SelectItem value="per-second">Times per Second</SelectItem>
                        <SelectItem value="per-hour">Times per Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration Limit */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Checkbox
                        id="limitDuration"
                        checked={limitDuration}
                        onCheckedChange={(checked) => setLimitDuration(checked as boolean)}
                      />
                      <Label htmlFor="limitDuration" className="text-sm font-medium text-black">Limit duration</Label>
                    </div>
                    {limitDuration && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="number"
                          placeholder="Duration"
                          min="1"
                          max="999"
                          value={limitValue}
                          onChange={(e) => setLimitValue(e.target.value)}
                          className="text-sm"
                        />
                        <Select value={limitUnit} onValueChange={(value: 'seconds' | 'minutes' | 'hours') => setLimitUnit(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="seconds">Seconds</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Control Buttons */}
        <div className="space-y-4 mb-8">
          {/* Main Start/Pause Button */}
          <Button
            onClick={handleToggleOperation}
            disabled={startTaskMutation.isPending || stopTaskMutation.isPending}
            className={`w-full py-4 text-lg font-medium flex items-center justify-center space-x-3 ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-black hover:bg-gray-800 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>F6 {isRunning ? 'Pause' : 'Start'}</span>
          </Button>

          {/* Emergency Pause */}
          <Button
            onClick={() => emergencyStopMutation.mutate()}
            disabled={emergencyStopMutation.isPending}
            variant="outline"
            className="w-full py-3 font-medium flex items-center justify-center space-x-2 border-gray-300 hover:bg-gray-100"
          >
            <StopCircle className="w-4 h-4 text-red-600" />
            <span>Emergency Pause (ESC)</span>
          </Button>
        </div>

        {/* Status Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current State:</span>
                <Badge className={isRunning ? 'status-running' : 'status-idle'}>
                  {isRunning ? 'Running' : 'Idle'}
                </Badge>
              </div>

              {isRunning && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Selected Key:</span>
                    <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{getDisplayKey()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Operation:</span>
                    <span className="text-sm text-black">{getOperationDescription()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Runtime:</span>
                    <span className="font-mono text-sm text-black">{runtime}</span>
                  </div>
                </>
              )}
            </div>

            {/* Global Hotkey Info */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-start">
                  <Keyboard className="w-4 h-4 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Global Hotkey Active</div>
                    <div className="text-xs text-blue-700 mt-1">
                      Press <kbd className="bg-blue-200 px-1 rounded text-xs">F6</kbd> anywhere to start/stop, 
                      or <kbd className="bg-blue-200 px-1 rounded text-xs">ESC</kbd> to emergency stop
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="text-xs text-gray-500">
            <p>Use responsibly. BlondaQ Keyboard Automation Tool v1.0</p>
            <p className="mt-1">⚠️ Ensure compliance with application terms of service when using automation</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
