import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Crosshair,
  Home,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api, ApiError } from "../services/api";

type Address = {
  id: string;
  label?: string | null;
  recipient?: string | null;
  line1: string;
  city: string;
  district?: string | null;
  state: string;
  pinCode: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

type AddressForm = {
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
};

const EMPTY_FORM: AddressForm = {
  label: "HOME",
  recipient: "",
  phone: "",
  line1: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function labelFor(address: Address) {
  return address.label || "HOME";
}

function formatAddress(address: Address) {
  return [
    address.line1,
    address.city,
    address.district,
    address.state,
    address.pinCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function AddressSelection() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();

    if (!q) return INDIAN_STATES;

    return INDIAN_STATES.filter((state) =>
      state.toLowerCase().includes(q)
    );
  }, [stateSearch]);

  async function loadAddresses() {
    setLoading(true);
    setError("");

    try {
      const data = await api<{ addresses: Address[] }>("/api/addresses");

      setAddresses(data.addresses);

      const preferred =
        data.addresses.find((address) => address.isDefault)?.id ||
        data.addresses[0]?.id ||
        "";

      setSelected(preferred);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load your saved addresses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  function updateField<K extends keyof AddressForm>(
    field: K,
    value: AddressForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewAddress() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setStateSearch("");
    setError("");
    setShowForm(true);
  }

  function openEditAddress(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label || "HOME",
      recipient: address.recipient || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      city: address.city || "",
      district: address.district || "",
      state: address.state || "",
      pinCode: address.pinCode || "",
    });
    setStateSearch("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setStateSearch("");
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pin = form.pinCode.trim();

    if (!/^\d{6}$/.test(pin)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (!form.state.trim()) {
      setError("Please select a state.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await api(`/api/addresses/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: form.label.trim() || "HOME",
            recipient: form.recipient.trim() || undefined,
            phone: form.phone.trim() || undefined,
            line1: form.line1.trim(),
            city: form.city.trim(),
            district: form.district.trim() || undefined,
            state: form.state.trim(),
            pinCode: pin,
          }),
        });
      } else {
        const result = await api<{ address: Address }>("/api/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: form.label.trim() || "HOME",
            recipient: form.recipient.trim() || undefined,
            phone: form.phone.trim() || undefined,
            line1: form.line1.trim(),
            city: form.city.trim(),
            district: form.district.trim() || undefined,
            state: form.state.trim(),
            pinCode: pin,
            isDefault: addresses.length === 0,
          }),
        });

        setSelected(result.address.id);
      }

      await loadAddresses();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save this address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(id: string) {
    setError("");

    try {
      await api(`/api/addresses/${id}/default`, {
        method: "PATCH",
      });

      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }))
      );

      setSelected(id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not update the default address."
      );
    }
  }

  async function deleteAddress(id: string) {
    const confirmed = window.confirm(
      "Delete this saved delivery address?"
    );

    if (!confirmed) return;

    setError("");

    try {
      await api(`/api/addresses/${id}`, {
        method: "DELETE",
      });

      const remaining = addresses.filter((address) => address.id !== id);

      setAddresses(remaining);

      if (selected === id) {
        setSelected(
          remaining.find((address) => address.isDefault)?.id ||
            remaining[0]?.id ||
            ""
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not delete this address."
      );
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
    
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "Location permission was denied. You can enter the address manually."
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          setError(
            "Location request timed out. Please enter the address manually."
          );
        } else {
          setError(
            "Unable to get your current location. Please enter the address manually."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function continueToPayment() {
    if (!selected) {
      setError("Please select a delivery address.");
      return;
    }

    /*
     * IMPORTANT:
     * Restored Checkout.tsx reads addressId from React Router
     * location.state, not from the query string.
     */
    navigate("/checkout/payment", {
      state: { addressId: selected },
    });
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC] pb-16 text-[#1D3328]">
      {/* Header */}
      <header className="border-b border-[#E7E2D8] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#2C7A4B] transition hover:bg-[#EEF7F0]"
          >
            <ArrowLeft size={18} />
            Cart
          </button>

          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#2C7A4B] sm:flex">
            <MapPinned size={16} />
            Secure delivery
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-8 lg:px-8 lg:pt-12">
        {/* Title */}
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#2C7A4B]">
            Farm2Fork delivery
          </p>

          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#183428] sm:text-5xl">
            Where should we deliver?
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[#6C756F]">
            Choose a saved address or add a new delivery location for your
            farm-fresh order.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-8 flex max-w-3xl items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#2C7A4B]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C7A4B] text-white">
              <Check size={16} />
            </span>
            Cart
          </div>

          <div className="h-px flex-1 bg-[#D8DED9]" />

          <div className="flex items-center gap-2 text-sm font-bold text-[#2C7A4B]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C7A4B] text-white">
              2
            </span>
            Address
          </div>

          <div className="h-px flex-1 bg-[#D8DED9]" />

          <div className="flex items-center gap-2 text-sm font-semibold text-[#A1AAA4]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D8DED9] bg-white">
              3
            </span>
            Payment
          </div>
        </div>

        {error && (
          <div className="mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          {/* Addresses */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#20352B]">
                  Saved addresses
                </h2>
                <p className="mt-1 text-sm text-[#7A837E]">
                  {addresses.length
                    ? `${addresses.length} saved ${
                        addresses.length === 1 ? "address" : "addresses"
                      }`
                    : "No saved addresses yet"}
                </p>
              </div>

              <button
                type="button"
                onClick={openNewAddress}
                disabled={addresses.length >= 5}
                className="inline-flex items-center gap-2 rounded-full border border-[#2C7A4B] px-4 py-2.5 text-sm font-bold text-[#2C7A4B] transition hover:bg-[#EAF5ED] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={17} />
                Add address
              </button>
            </div>

            {loading ? (
              <div className="mt-5 rounded-[28px] border border-[#E5E0D7] bg-white p-8 text-center text-sm text-[#7A837E]">
                Loading your saved addresses…
              </div>
            ) : addresses.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-dashed border-[#C9D5CC] bg-white p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF5ED] text-[#2C7A4B]">
                  <MapPin size={28} />
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  Add your delivery address
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77817B]">
                  Save your address once and use it for future Farm2Fork
                  orders.
                </p>

                <button
                  type="button"
                  onClick={openNewAddress}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2C7A4B] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#23653D]"
                >
                  <Plus size={17} />
                  Add delivery address
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {addresses.map((address) => {
                  const active = selected === address.id;

                  return (
                    <article
                      key={address.id}
                      onClick={() => setSelected(address.id)}
                      className={`cursor-pointer rounded-[28px] border bg-white p-5 transition sm:p-6 ${
                        active
                          ? "border-[#2C7A4B] ring-2 ring-[#DCEEDF]"
                          : "border-[#E5E0D7] hover:border-[#B9CBBE]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            active
                              ? "bg-[#2C7A4B] text-white"
                              : "bg-[#EEF4EF] text-[#2C7A4B]"
                          }`}
                        >
                          {labelFor(address).toUpperCase() === "HOME" ? (
                            <Home size={21} />
                          ) : (
                            <MapPin size={21} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-[#20352B]">
                              {labelFor(address)}
                            </h3>

                            {address.isDefault && (
                              <span className="rounded-full bg-[#EAF5ED] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2C7A4B]">
                                Default
                              </span>
                            )}

                            {active && (
                              <span className="rounded-full bg-[#183428] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                                Selected
                              </span>
                            )}
                          </div>

                          {address.recipient && (
                            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#4B5B52]">
                              <User size={15} />
                              {address.recipient}
                            </p>
                          )}

                          <p className="mt-2 text-sm leading-6 text-[#69756E]">
                            {formatAddress(address)}
                          </p>

                          {address.phone && (
                            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#7C857F]">
                              <Phone size={14} />
                              {address.phone}
                            </p>
                          )}
                        </div>

                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                            active
                              ? "border-[#2C7A4B] bg-[#2C7A4B]"
                              : "border-[#C9D2CC]"
                          }`}
                        >
                          {active && (
                            <Check size={14} strokeWidth={3} className="text-white" />
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#EEF0EC] pt-4">
                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void makeDefault(address.id);
                            }}
                            className="rounded-full px-3 py-2 text-xs font-bold text-[#2C7A4B] hover:bg-[#EEF7F0]"
                          >
                            Make default
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditAddress(address);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#59665F] hover:bg-[#F3F5F2]"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteAddress(address.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Summary */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[28px] border border-[#E5E0D7] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF5ED] text-[#2C7A4B]">
                  <MapPinned size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-[#20352B]">
                    Delivery details
                  </h2>
                  <p className="text-xs text-[#7B847E]">
                    Your selected destination
                  </p>
                </div>
              </div>

              {selected ? (
                <div className="mt-5 rounded-2xl bg-[#F5F8F5] p-4">
                  {(() => {
                    const address = addresses.find(
                      (item) => item.id === selected
                    );

                    if (!address) return null;

                    return (
                      <>
                        <p className="text-sm font-extrabold text-[#2C7A4B]">
                          {labelFor(address)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#536159]">
                          {formatAddress(address)}
                        </p>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-[#F7F7F4] p-4 text-sm text-[#7A837E]">
                  Select an address to continue.
                </div>
              )}

              <button
                type="button"
                onClick={continueToPayment}
                disabled={!selected || loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2C7A4B] px-5 py-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#23653D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to payment
                <ChevronRight size={18} />
              </button>

              <div className="mt-5 flex gap-3 rounded-2xl border border-[#E6ECE7] bg-[#FAFCFA] p-4">
                <Check
                  size={18}
                  className="mt-0.5 shrink-0 text-[#2C7A4B]"
                />
                <p className="text-xs leading-5 text-[#66736B]">
                  Your address is saved securely to your Farm2Fork account.
                  You can edit or remove saved addresses anytime.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openNewAddress}
              disabled={addresses.length >= 5}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#C9D8CD] bg-white px-5 py-3.5 text-sm font-bold text-[#2C7A4B] transition hover:bg-[#F4F9F5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={17} />
              Add another address
            </button>

            {addresses.length >= 5 && (
              <p className="mt-2 text-center text-xs text-[#7C857F]">
                You can save up to 5 addresses.
              </p>
            )}
          </aside>
        </div>
      </main>

      {/* Address form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#10261B]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8EDE9] bg-white px-6 py-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#2C7A4B]">
                  Delivery address
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#20352B]">
                  {editingId ? "Edit address" : "Add new address"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F4F1] text-[#5D6861] hover:bg-[#E8ECE8]"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveAddress} className="p-6">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#BFD5C5] bg-[#F1F8F3] px-4 py-3.5 text-sm font-bold text-[#2C7A4B] transition hover:bg-[#E8F4EB] disabled:opacity-50"
              >
                <Crosshair size={17} />
                {locating
                  ? "Getting your location…"
                  : "Use my current location"}
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    Address label
                  </span>
                  <input
                    value={form.label}
                    onChange={(event) =>
                      updateField("label", event.target.value)
                    }
                    placeholder="HOME"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    Recipient
                  </span>
                  <input
                    value={form.recipient}
                    onChange={(event) =>
                      updateField("recipient", event.target.value)
                    }
                    placeholder="Full name"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    Phone
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    placeholder="10-digit mobile number"
                    inputMode="tel"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    Address
                  </span>
                  <input
                    required
                    value={form.line1}
                    onChange={(event) =>
                      updateField("line1", event.target.value)
                    }
                    placeholder="House / flat / street / landmark"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    City
                  </span>
                  <input
                    required
                    value={form.city}
                    onChange={(event) =>
                      updateField("city", event.target.value)
                    }
                    placeholder="City / town"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    District
                  </span>
                  <input
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    placeholder="District"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    State
                  </span>
                  <input
                    required
                    list="farm2fork-indian-states"
                    value={form.state}
                    onChange={(event) => {
                      updateField("state", event.target.value);
                      setStateSearch(event.target.value);
                    }}
                    placeholder="Select state"
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                  <datalist id="farm2fork-indian-states">
                    {filteredStates.map((state) => (
                      <option key={state} value={state} />
                    ))}
                  </datalist>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#647168]">
                    PIN code
                  </span>
                  <input
                    required
                    value={form.pinCode}
                    onChange={(event) =>
                      updateField(
                        "pinCode",
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="6-digit PIN"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-2xl border border-[#DDE4DE] bg-[#FAFCFA] px-4 py-3.5 text-sm outline-none transition focus:border-[#2C7A4B] focus:ring-4 focus:ring-[#EAF5ED]"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-2xl border border-[#D8DED9] px-6 py-3.5 text-sm font-bold text-[#5E6962] hover:bg-[#F5F7F4]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#2C7A4B] px-7 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#23653D] disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Save address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}