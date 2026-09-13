import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Truck,
  Bike,
  FileText,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { api, ApiError, mediaUrl } from "../../services/api";

interface WorkerSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  workerType: "BIKE" | "LARGE_TRUCK";
  vehicleNumber: string | null;
  verificationId: string | null;
  status: string;
  currentStep: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documentsCount: number;
  verifiedDocumentsCount: number;
  rejectedDocumentsCount: number;
  documents: Array<{
    id: string;
    documentType: string;
    status: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    attempts: number;
    rejectionReason: string | null;
    reviewerNotes: string | null;
    extractedData: any;
  }>;
}

export function AdminLogisticsVerification() {
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Rejection / Re-upload Modal State
  const [actionModal, setActionModal] = useState<{
    type: "REJECT_DOCUMENT" | "REQUEST_REUPLOAD" | "REJECT_WORKER";
    documentId?: string;
    documentLabel?: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api<{ workers: WorkerSummary[] }>(
        `/api/admin/logistics/verifications?status=${filterStatus}`
      );
      setWorkers(res.workers || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load verifications:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [filterStatus]);

  const handleAction = async (
    action: string,
    documentId?: string,
    rejectionReason?: string,
    reviewerNotes?: string
  ) => {
    if (!selectedWorker) return;

    try {
      setActionBusy(true);
      setActionError("");

      await api(`/api/admin/logistics/verifications/${selectedWorker.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          documentId,
          rejectionReason,
          reviewerNotes,
        }),
      });

      setActionBusy(false);
      setActionModal(null);
      setActionReason("");

      // Refresh data
      await fetchWorkers();

      // Update selected worker in view
      const updated = await api<{ worker: any }>(
        `/api/admin/logistics/verifications/${selectedWorker.id}`
      );
      if (updated.worker) {
        const v = updated.worker.logisticsVerification;
        const activeDocs = v?.documents?.filter((d: any) => d.status !== "REPLACED") || [];
        setSelectedWorker({
          id: updated.worker.id,
          name: updated.worker.name,
          email: updated.worker.email,
          phone: updated.worker.phone,
          photoUrl: updated.worker.photoUrl,
          workerType: v?.vehicleType || updated.worker.deliveryType || "BIKE",
          vehicleNumber: v?.vehicleNumber || updated.worker.vehicleNumber,
          verificationId: v?.id || null,
          status: v?.status || "INCOMPLETE",
          currentStep: v?.currentStep || 1,
          submittedAt: v?.submittedAt || null,
          reviewedAt: v?.reviewedAt || null,
          rejectionReason: v?.rejectionReason || null,
          documentsCount: activeDocs.length,
          verifiedDocumentsCount: activeDocs.filter((d: any) => d.status === "VERIFIED").length,
          rejectedDocumentsCount: activeDocs.filter((d: any) => d.status === "REJECTED" || d.status === "REUPLOAD_REQUIRED").length,
          documents: activeDocs,
        });
      }
    } catch (err: any) {
      setActionBusy(false);
      setActionError(err instanceof ApiError ? err.message : err.message || "Action failed.");
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      (w.phone && w.phone.includes(q)) ||
      (w.vehicleNumber && w.vehicleNumber.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Approved</span>;
      case "VERIFIED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">Verified</span>;
      case "PENDING_REVIEW":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Pending Review</span>;
      case "ACTION_REQUIRED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">Action Required</span>;
      case "REJECTED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-bold text-zinc-700">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker name, email, phone or plate..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-xs focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="ACTION_REQUIRED">Action Required</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={fetchWorkers}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Workers Grid / Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">
          <ShieldCheck className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm font-semibold">No logistics workers found matching criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              onClick={() => setSelectedWorker(worker)}
              className="flex cursor-pointer flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {worker.photoUrl ? (
                      <img
                        src={mediaUrl(worker.photoUrl)}
                        alt={worker.name}
                        className="h-11 w-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                        {worker.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-zinc-900 text-sm">{worker.name}</h3>
                      <p className="text-[11px] text-zinc-500">{worker.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(worker.status)}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Type:</span>
                    <p className="font-semibold text-zinc-800 flex items-center gap-1 mt-0.5">
                      {worker.workerType === "LARGE_TRUCK" ? <Truck className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
                      {worker.workerType === "LARGE_TRUCK" ? "Truck" : "Delivery Agent"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Plate:</span>
                    <p className="font-mono font-semibold text-zinc-800 mt-0.5">
                      {worker.vehicleNumber || "Pending"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Documents: {worker.documentsCount} uploaded</span>
                  <span>{worker.verifiedDocumentsCount} verified</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>View Full Inspection</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Worker Inspection Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 bg-zinc-50/70">
              <div className="flex items-center gap-3">
                {selectedWorker.photoUrl ? (
                  <img
                    src={mediaUrl(selectedWorker.photoUrl)}
                    alt={selectedWorker.name}
                    className="h-12 w-12 rounded-xl object-cover border border-zinc-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-lg">
                    {selectedWorker.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-zinc-900">{selectedWorker.name}</h2>
                    {getStatusBadge(selectedWorker.status)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {selectedWorker.email} • {selectedWorker.phone || "No phone"} • Vehicle: {selectedWorker.vehicleNumber || "Unset"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorker(null)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Top Summary & Actions Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 border border-zinc-200">
                <div>
                  <p className="text-xs font-bold text-zinc-700">Administrative Decision for Worker:</p>
                  <p className="text-[11px] text-zinc-500">
                    Approving grants immediate access to the logistics dashboard and live delivery claiming.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction("APPROVE_WORKER")}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve Worker
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionModal({ type: "REJECT_WORKER" })}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-4 w-4" /> Reject Worker
                  </button>
                </div>
              </div>

              {/* Uploaded Documents Inspection Table */}
              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-3">Uploaded Verification Documents</h3>
                <div className="space-y-3">
                  {selectedWorker.documents.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No documents uploaded yet.</p>
                  ) : (
                    selectedWorker.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-zinc-900">
                                {doc.documentType.replaceAll("_", " ")}
                              </h4>
                              {getStatusBadge(doc.status)}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              {doc.fileName} • {(doc.fileSize / 1024).toFixed(0)} KB • Attempt #{doc.attempts}
                            </p>
                            {doc.rejectionReason && (
                              <p className="text-[11px] font-semibold text-rose-600 mt-1">
                                Rejection feedback: {doc.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Document Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/admin/logistics/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            <Eye className="h-3.5 w-3.5" /> View File
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAction("VERIFY_DOCUMENT", doc.id)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "REQUEST_REUPLOAD",
                                documentId: doc.id,
                                documentLabel: doc.documentType.replaceAll("_", " "),
                              })
                            }
                            className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Request Re-upload
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "REJECT_DOCUMENT",
                                documentId: doc.id,
                                documentLabel: doc.documentType.replaceAll("_", " "),
                              })
                            }
                            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Reason Input Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900">
              {actionModal.type === "REJECT_WORKER"
                ? "Provide Rejection Reason for Worker"
                : actionModal.type === "REQUEST_REUPLOAD"
                ? `Specify Required Corrections for ${actionModal.documentLabel}`
                : `Specify Rejection Reason for ${actionModal.documentLabel}`}
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              {actionModal.type === "REJECT_WORKER"
                ? "Explain clearly why the worker's application was rejected. This reason is required."
                : "Explain to the worker what was wrong with the document (e.g. expired, blurry, missing back side)."}
            </p>

            {actionError && (
              <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </div>
            )}

            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Enter specific reason / instructions..."
              className="mt-4 w-full rounded-xl border border-zinc-200 p-3 text-xs focus:border-indigo-600 focus:outline-none"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionReason("");
                  setActionError("");
                }}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionBusy || !actionReason.trim()}
                onClick={() => {
                  if (!actionReason.trim()) {
                    setActionError("Reason is strictly required.");
                    return;
                  }
                  handleAction(actionModal.type, actionModal.documentId, actionReason.trim());
                }}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {actionBusy ? "Submitting..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
