"use client";

type ConfirmModalProps = {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  itemName,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg text-center pointer-events-auto">
        <p className="text-2xl text-gray-700 mb-8">
          Apakah Anda yakin ingin menghapus{" "}
          <span className="font-semibold text-green-600">{itemName}</span> dari
          keranjang belanja?
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition"
          >
            Iya
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Tidak
          </button>
        </div>
      </div>
    </div>
  );
}
