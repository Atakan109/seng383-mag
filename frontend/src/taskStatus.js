const STATUS_LABELS = {
  pending: 'Bekliyor',
  done: 'Tamamlandı',
};

// Turkish label for a task status, e.g. "pending" -> "Bekliyor".
export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

// Turkish message for a failed task request, based on the HTTP status.
export function taskErrorMessage(error, fallback) {
  if (error?.status === 401) {
    return 'Oturumun sona erdi. Lütfen yeniden giriş yap.';
  }
  if (error?.status === 403) {
    return 'Bu çocuğun görevlerine erişim iznin yok.';
  }
  return fallback;
}
