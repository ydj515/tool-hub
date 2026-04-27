import type { AnalysisResult, CycleGroup, TableSchema } from "@/lib/types";

export function analyzeSchema(tables: TableSchema[], parseWarnings: string[]): AnalysisResult {
  const warnings = [...parseWarnings];
  const byName = new Map(tables.map((table) => [table.name.toLowerCase(), table]));
  const originalIndex = new Map(tables.map((table, index) => [table.name, index]));
  const adjacency = new Map<string, Set<string>>();

  for (const table of tables) {
    adjacency.set(table.name, new Set());
  }

  for (const table of tables) {
    for (const foreignKey of table.foreignKeys) {
      const parent = resolveTable(byName, foreignKey.refTable);
      if (!parent) {
        continue;
      }
      if (parent === table && isNullableSelfReference(table, foreignKey.columns)) {
        continue;
      }
      adjacency.get(parent.name)?.add(table.name);
    }
  }

  const components = findStronglyConnectedComponents(tables.map((table) => table.name), adjacency);
  const componentByTable = new Map<string, number>();

  components.forEach((component, componentIndex) => {
    for (const tableName of component) {
      componentByTable.set(tableName, componentIndex);
    }
  });

  const cycleGroups: CycleGroup[] = [];
  for (const component of components) {
    const hasSelfReference = component.length === 1 && adjacency.get(component[0])?.has(component[0]);
    if (component.length > 1 || hasSelfReference) {
      cycleGroups.push({
        tables: [...component].sort((left, right) => indexOf(originalIndex, left) - indexOf(originalIndex, right)),
      });
    }
  }

  if (cycleGroups.length > 0) {
    warnings.push("순환 FK가 감지되어 DB별 FK 완화 구문을 함께 생성합니다.");
  }

  const componentGraph = new Map<number, Set<number>>();
  const indegree = new Map<number, number>();
  components.forEach((_, index) => {
    componentGraph.set(index, new Set());
    indegree.set(index, 0);
  });

  for (const [from, children] of adjacency) {
    const fromComponent = componentByTable.get(from);
    if (fromComponent === undefined) {
      continue;
    }

    for (const child of children) {
      const toComponent = componentByTable.get(child);
      if (toComponent === undefined || toComponent === fromComponent) {
        continue;
      }

      if (!componentGraph.get(fromComponent)?.has(toComponent)) {
        componentGraph.get(fromComponent)?.add(toComponent);
        indegree.set(toComponent, (indegree.get(toComponent) ?? 0) + 1);
      }
    }
  }

  const ready = [...indegree.entries()]
    .filter(([, count]) => count === 0)
    .map(([component]) => component)
    .sort((left, right) => componentMinIndex(components[left], originalIndex) - componentMinIndex(components[right], originalIndex));
  const orderedComponents: number[] = [];

  while (ready.length > 0) {
    const current = ready.shift();
    if (current === undefined) {
      break;
    }
    orderedComponents.push(current);

    for (const next of componentGraph.get(current) ?? []) {
      const nextIndegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(next);
        ready.sort((left, right) => componentMinIndex(components[left], originalIndex) - componentMinIndex(components[right], originalIndex));
      }
    }
  }

  const insertOrder = orderedComponents.flatMap((componentIndex) =>
    [...components[componentIndex]].sort((left, right) => indexOf(originalIndex, left) - indexOf(originalIndex, right)),
  );

  return {
    tables,
    insertOrder,
    cycleGroups,
    warnings,
  };
}

function findStronglyConnectedComponents(tableNames: string[], adjacency: Map<string, Set<string>>): string[][] {
  let nextIndex = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indexMap = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const components: string[][] = [];

  function visit(tableName: string) {
    indexMap.set(tableName, nextIndex);
    lowLink.set(tableName, nextIndex);
    nextIndex += 1;
    stack.push(tableName);
    onStack.add(tableName);

    for (const next of adjacency.get(tableName) ?? []) {
      if (!indexMap.has(next)) {
        visit(next);
        lowLink.set(tableName, Math.min(lowLink.get(tableName) ?? 0, lowLink.get(next) ?? 0));
      } else if (onStack.has(next)) {
        lowLink.set(tableName, Math.min(lowLink.get(tableName) ?? 0, indexMap.get(next) ?? 0));
      }
    }

    if (lowLink.get(tableName) === indexMap.get(tableName)) {
      const component: string[] = [];
      while (stack.length > 0) {
        const member = stack.pop();
        if (member === undefined) {
          break;
        }
        onStack.delete(member);
        component.push(member);
        if (member === tableName) {
          break;
        }
      }
      components.push(component);
    }
  }

  for (const tableName of tableNames) {
    if (!indexMap.has(tableName)) {
      visit(tableName);
    }
  }

  return components;
}

function componentMinIndex(component: string[], originalIndex: Map<string, number>): number {
  return Math.min(...component.map((tableName) => indexOf(originalIndex, tableName)));
}

function indexOf(originalIndex: Map<string, number>, tableName: string): number {
  return originalIndex.get(tableName) ?? Number.MAX_SAFE_INTEGER;
}

function resolveTable(byName: Map<string, TableSchema>, refName: string): TableSchema | undefined {
  const exact = byName.get(refName.toLowerCase());
  if (exact) {
    return exact;
  }
  const tablePart = refName.split(".").pop()?.toLowerCase();
  if (!tablePart) {
    return undefined;
  }
  for (const table of byName.values()) {
    const namePart = table.name.split(".").pop()?.toLowerCase();
    if (namePart === tablePart) {
      return table;
    }
  }
  return undefined;
}

function isNullableSelfReference(table: TableSchema, columnNames: string[]): boolean {
  return columnNames.every((columnName) => {
    const column = table.columns.find((item) => item.name.toLowerCase() === columnName.toLowerCase());
    return column?.nullable ?? false;
  });
}
