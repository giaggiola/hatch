'use client';

interface DeleteAccountModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteAccountModal({ onConfirm, onCancel }: DeleteAccountModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Delete Account?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This will permanently delete your account and all your data. This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
