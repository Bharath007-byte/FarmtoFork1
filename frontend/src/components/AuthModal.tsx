interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;
  return (
    <button type="button" onClick={onClose} className="hidden">
      close
    </button>
  );
}
