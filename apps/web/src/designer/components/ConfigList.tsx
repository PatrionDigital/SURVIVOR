import { useRef } from "react";

interface ConfigItem {
  id: string;
  name: string;
  color?: string;
}

interface ConfigListProps {
  title: string;
  items: ConfigItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onImport: (json: unknown) => { success: boolean; error?: string };
  onExport: (id: string) => void;
}

export function ConfigList({
  title,
  items,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onImport,
  onExport,
}: ConfigListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = onImport(json);
      if (!result.success) {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to parse JSON: ${error}`);
    }

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-300">{title}</h3>
        <div className="flex gap-1">
          <button
            onClick={handleImportClick}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            title="Import JSON"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          <button
            onClick={onAdd}
            className="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs"
            title="Add new"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex-1 overflow-y-auto space-y-1">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No items yet.
            <br />
            Click + to add one.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group
                         ${selectedId === item.id ? "bg-cyan-600" : "hover:bg-gray-700"}`}
              onClick={() => onSelect(item.id)}
            >
              {item.color && (
                <div
                  className="w-4 h-4 rounded-full border border-gray-500"
                  style={{ backgroundColor: `#${item.color.replace("0x", "")}` }}
                />
              )}
              <span className="flex-1 text-sm truncate">{item.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(item.id);
                  }}
                  className="p-1 bg-gray-600 hover:bg-gray-500 rounded"
                  title="Export"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${item.name}"?`)) {
                      onDelete(item.id);
                    }
                  }}
                  className="p-1 bg-red-600/50 hover:bg-red-600 rounded"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 mt-2 border-t border-gray-700">
        <button
          onClick={onAdd}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          + Add New
        </button>
      </div>
    </div>
  );
}
