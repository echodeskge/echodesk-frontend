"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Trash2, Network } from "lucide-react";

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: number;
}

export function NetworkMonitor() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      const method = config?.method || 'GET';
      const startTime = Date.now();

      const requestId = `${Date.now()}-${Math.random()}`;

      // Add to requests
      setRequests(prev => [...prev, {
        id: requestId,
        url,
        method,
        timestamp: startTime,
      }]);

      // Track duplicates
      setDuplicates(prev => {
        const key = `${method} ${url}`;
        const count = (prev.get(key) || 0) + 1;
        return new Map(prev).set(key, count);
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        // Update with response info
        setRequests(prev => prev.map(req =>
          req.id === requestId
            ? { ...req, status: response.status, duration }
            : req
        ));

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        setRequests(prev => prev.map(req =>
          req.id === requestId
            ? { ...req, status: 0, duration }
            : req
        ));

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const clearRequests = () => {
    setRequests([]);
    setDuplicates(new Map());
  };

  const getDuplicateUrls = () => {
    return Array.from(duplicates.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
  };

  if (process.env.NODE_ENV !== 'development') return null;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50"
        variant="outline"
        size="sm"
      >
        <Network className="w-4 h-4 mr-2" />
        Network ({requests.length})
      </Button>
    );
  }

  const duplicateUrls = getDuplicateUrls();

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[500px] max-h-[600px] shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Network Monitor
          {duplicateUrls.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {duplicateUrls.length} duplicates
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearRequests}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {duplicateUrls.length > 0 && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-xs font-semibold text-red-900 mb-2">
              Duplicate Requests:
            </div>
            {duplicateUrls.map(([key, count]) => (
              <div key={key} className="text-xs text-red-800 mb-1">
                <Badge variant="destructive" className="mr-2">{count}x</Badge>
                {key}
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-2 border rounded text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={req.status === 200 ? "default" : "destructive"}>
                    {req.method}
                  </Badge>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {req.status && (
                      <span className={req.status === 200 ? "text-green-600" : "text-red-600"}>
                        {req.status}
                      </span>
                    )}
                    {req.duration && <span>{req.duration}ms</span>}
                  </div>
                </div>
                <div className="text-xs break-all">{req.url}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
