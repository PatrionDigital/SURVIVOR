import { useNotifications } from "@/hooks";

export function NotificationSettings() {
  const { isEnabled, isLoading, error, requestPermission } = useNotifications();

  const handleToggle = async () => {
    if (!isEnabled) {
      await requestPermission();
    }
    // Note: Unregistering would require a separate API call
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-primary-400 mb-4">Notifications</h3>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Farcaster Notifications</p>
            <p className="text-sm text-gray-400">
              Get notified about leaderboard ranks and maintenance warnings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <span className="text-green-400 text-sm">✓ Enabled</span>
            ) : (
              <button
                onClick={handleToggle}
                disabled={isLoading}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  isLoading
                    ? "bg-gray-600 text-gray-400 cursor-wait"
                    : "bg-primary-600 hover:bg-primary-500 text-white"
                }`}
              >
                {isLoading ? "Requesting..." : "Enable"}
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
            <p className="text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        {/* Info */}
        {!isEnabled && !error && (
          <div className="bg-blue-900/20 border border-blue-500/50 rounded p-3">
            <p className="text-blue-400 text-sm">
              💡 Enable notifications to receive updates about your leaderboard rank and maintenance
              status. Only available in Farcaster Mini App.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
