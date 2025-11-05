"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Phone, Delete } from "lucide-react";

interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  disabled?: boolean;
}

const DIAL_PAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function DialPad({ value, onChange, onCall, disabled }: DialPadProps) {
  const handleKeyPress = (key: string) => {
    onChange(value + key);
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCall();
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Input
            type="tel"
            placeholder="Enter phone number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-center text-2xl h-14"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DIAL_PAD_KEYS.map((row, rowIndex) => (
            row.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleKeyPress(key)}
                disabled={disabled}
              >
                {key}
              </Button>
            ))
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-14"
            onClick={handleDelete}
            disabled={disabled || !value}
          >
            <Delete className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-14 bg-green-600 hover:bg-green-700"
            onClick={onCall}
            disabled={disabled || !value}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call
          </Button>
          <div /> {/* Empty spacer */}
        </div>
      </CardContent>
    </Card>
  );
}
