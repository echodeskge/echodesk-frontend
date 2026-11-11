'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Feature } from '@/types/package';
import {
  defaultModuleKeys,
  expandSelection,
  monthlyTotal,
  perEmployeePrice,
  priceByKey,
  toggleModule,
} from '@/lib/pricing';

/**
 * Calculator state: the selected module keys (workspace implied), the
 * employee count and the derived prices. `requires` rules (AI → inbox) are
 * applied on toggle and surface as `autoNotice` (the auto-enabled key).
 */
export function usePlanSelection(features: readonly Feature[], initialEmployees: number) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => defaultModuleKeys(features));
  const [autoNotice, setAutoNotice] = useState<string | null>(null);

  const prices = useMemo(() => priceByKey(features), [features]);

  const toggle = useCallback(
    (key: string) => {
      const { keys, autoEnabled } = toggleModule(selectedKeys, key);
      setSelectedKeys(keys);
      setAutoNotice(autoEnabled[0] ?? null);
    },
    [selectedKeys],
  );

  const replace = useCallback((keys: readonly string[]) => {
    setSelectedKeys([...keys]);
    setAutoNotice(null);
  }, []);

  const clearNotice = useCallback(() => setAutoNotice(null), []);

  const perEmployee = perEmployeePrice(selectedKeys, prices);
  const total = monthlyTotal(selectedKeys, prices, employees);
  const payloadKeys = useMemo(() => expandSelection(selectedKeys, features), [selectedKeys, features]);

  return {
    employees,
    setEmployees,
    selectedKeys,
    replace,
    toggle,
    autoNotice,
    clearNotice,
    prices,
    perEmployee,
    total,
    payloadKeys,
  };
}
