// src/components/hr/FilterBar.tsx
import React from "react";

export type FilterPreset<T> = {
  id: string;
  name: string;
  values: T;
};

type Props<T> = {
  storageKey: string;
  values: T;
  onChange: (next: T) => void;
  renderFields: (values: T, onChange: (next: T) => void) => React.ReactNode;
};

export function FilterBar<T extends object>({
  storageKey,
  values,
  onChange,
  renderFields,
}: Props<T>) {
  const [presetName, setPresetName] = React.useState("");
  const [presets, setPresets] = React.useState<FilterPreset<T>[]>([]);

  React.useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      setPresets(JSON.parse(raw));
    }
  }, [storageKey]);

  const savePresets = (next: FilterPreset<T>[]) => {
    setPresets(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addPreset = () => {
    if (!presetName.trim()) return;
    const id = Date.now().toString();
    savePresets([...presets, { id, name: presetName.trim(), values }]);
    setPresetName("");
  };

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    onChange(p.values);
  };

  const removePreset = (id: string) => {
    savePresets(presets.filter((x) => x.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow p-3 text-xs space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        {renderFields(values, onChange)}

        <div className="flex items-center gap-2 ml-auto min-w-[200px]">
          <select
            className="border rounded-lg px-2 py-1 flex-1"
            onChange={(e) => e.target.value && applyPreset(e.target.value)}
          >
            <option value="">تطبيق فلتر محفوظ...</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="border rounded-lg px-2 py-1 flex-1"
          placeholder="اسم الفلتر، مثال: إجازات هذا الشهر"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
        />
        <button
          onClick={addPreset}
          className="px-3 py-1.5 rounded-full bg-amber-500 text-white"
        >
          حفظ كفلتر جاهز
        </button>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"
            >
              {p.name}
              <button onClick={() => removePreset(p.id)}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
