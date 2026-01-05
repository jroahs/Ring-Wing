import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FiCheck, FiClock, FiCreditCard, FiUser, FiX } from 'react-icons/fi';
import { Modal } from './ui';
import api from '../services/apiService';
import { theme } from '../theme';

const padStartOfTodayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const QuickTimeClockModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [modeLoading, setModeLoading] = useState(true);
  const [attendanceMode, setAttendanceMode] = useState('PIN');
  const [pinRequirePhoto, setPinRequirePhoto] = useState(true);
  const [nfcTestMode, setNfcTestMode] = useState(true);
  const [nfcTapAndGo, setNfcTapAndGo] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // PIN flow
  const [pin, setPin] = useState('');
  const [staff, setStaff] = useState(null);
  const [clockAction, setClockAction] = useState(null); // 'in' | 'out'
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  // NFC flow
  const [nfcStatus, setNfcStatus] = useState(null); // { staffName, staffPosition, action, totalHours? }
  const [nfcCardId, setNfcCardId] = useState('');

  const title = useMemo(() => {
    if (modeLoading) return 'Time Clock';
    return attendanceMode === 'NFC' ? 'NFC Time Clock' : 'PIN Time Clock';
  }, [attendanceMode, modeLoading]);

  const resetState = useCallback(() => {
    setLoading(false);
    setErrorMessage(null);
    setPin('');
    setStaff(null);
    setClockAction(null);
    setShowCamera(false);
    setCapturedImage(null);
    setNfcStatus(null);
    setNfcCardId('');
  }, []);

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // Load attendance settings when opening
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const load = async () => {
      setModeLoading(true);
      try {
        const res = await api.get('/api/settings/attendance');
        if (cancelled) return;
        if (res.data?.success) {
          const data = res.data.data;
          setAttendanceMode(data?.mode || 'PIN');
          setPinRequirePhoto(data?.pinSettings?.requirePhoto ?? true);
          setNfcTestMode(data?.nfcSettings?.testMode ?? true);
          setNfcTapAndGo(data?.nfcSettings?.tapAndGo ?? false);
        } else {
          setAttendanceMode('PIN');
          setPinRequirePhoto(true);
        }
      } catch {
        if (!cancelled) {
          setAttendanceMode('PIN');
          setPinRequirePhoto(true);
        }
      } finally {
        if (!cancelled) setModeLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const fetchLastLogType = useCallback(async (staffId) => {
    const startDate = padStartOfTodayIso();
    const endDate = new Date().toISOString();
    const params = new URLSearchParams({ startDate, endDate }).toString();
    const res = await api.get(`/api/time-logs/staff/${staffId}?${params}`);
    const logs = res.data?.data || [];
    const last = logs[0];
    return last?.type || null; // 'clockIn' | 'clockOut'
  }, []);

  const decideAction = useCallback(async (staffId) => {
    const lastType = await fetchLastLogType(staffId);
    if (lastType === 'clockIn') return 'out';
    return 'in';
  }, [fetchLastLogType]);

  const doClock = useCallback(async ({ staffId, action, photoBase64 }) => {
    const endpoint = action === 'in' ? '/api/time-logs/clock-in' : '/api/time-logs/clock-out';
    const body = { staffId };
    if (photoBase64) body.photoBase64 = photoBase64;
    const res = await api.post(endpoint, body);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Time clock failed');
    }
    return res.data.data;
  }, []);

  const handlePinSubmit = useCallback(async () => {
    if (loading) return;
    if (!pin || pin.length < 4) return;

    setLoading(true);
    try {
      const authRes = await api.post('/api/staff/authenticate-pin', { pin });
      if (!authRes.data?.success) {
        throw new Error(authRes.data?.message || 'Invalid PIN');
      }

      const s = authRes.data.staff;
      setStaff(s);

      const action = await decideAction(s._id);
      setClockAction(action);

      if (pinRequirePhoto) {
        setShowCamera(true);
        setLoading(false);
        return;
      }

      await doClock({ staffId: s._id, action });
      setLoading(false);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setPin('');
      setStaff(null);
      setClockAction(null);
      setShowCamera(false);
      setCapturedImage(null);
      setLoading(false);
      setErrorMessage(err?.response?.data?.message || err?.message || 'PIN failed');
    }
  }, [decideAction, doClock, loading, onClose, pin, pinRequirePhoto]);

  const capturePhoto = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) setCapturedImage(img);
  }, []);

  const confirmPinClockWithPhoto = useCallback(async () => {
    if (!staff || !clockAction || !capturedImage || loading) return;
    setLoading(true);
    try {
      await doClock({ staffId: staff._id, action: clockAction, photoBase64: capturedImage });
      setLoading(false);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setLoading(false);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Clock failed');
    }
  }, [capturedImage, clockAction, doClock, loading, onClose, staff]);

  const handleNfcCardTap = useCallback(async (cardId) => {
    const normalized = (cardId || '').trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    setNfcCardId(normalized);
    try {
      const lookup = await api.get(`/api/time-logs/nfc/lookup/${normalized}`);
      const data = lookup.data?.data;
      if (!lookup.data?.success || !data) {
        throw new Error(lookup.data?.message || 'Card not recognized');
      }

      const nextAction = data.isClockedIn ? 'out' : 'in';

      if (!nfcTapAndGo) {
        setLoading(false);
        setNfcStatus({
          staffName: data.name,
          staffPosition: data.position,
          action: nextAction,
          pendingConfirm: true
        });
        return;
      }

      const endpoint = nextAction === 'in' ? '/api/time-logs/nfc/clock-in' : '/api/time-logs/nfc/clock-out';
      const res = await api.post(endpoint, { nfcCardId: normalized });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'NFC clock failed');
      }

      setNfcStatus({
        staffName: data.name,
        staffPosition: data.position,
        action: nextAction,
        totalHours: res.data?.data?.totalHours
      });
      setLoading(false);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setLoading(false);
      setNfcStatus(null);
      setErrorMessage(err?.response?.data?.message || err?.message || 'NFC failed');
    }
  }, [nfcTapAndGo, onClose]);

  const confirmNfc = useCallback(async () => {
    if (!nfcStatus?.pendingConfirm || !nfcCardId || loading) return;
    setLoading(true);
    try {
      const endpoint = nfcStatus.action === 'in' ? '/api/time-logs/nfc/clock-in' : '/api/time-logs/nfc/clock-out';
      const res = await api.post(endpoint, { nfcCardId });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'NFC clock failed');
      }
      setNfcStatus((prev) => ({
        ...prev,
        pendingConfirm: false,
        totalHours: res.data?.data?.totalHours
      }));
      setLoading(false);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setLoading(false);
      setNfcStatus(null);
      setErrorMessage(err?.response?.data?.message || err?.message || 'NFC failed');
    }
  }, [loading, nfcCardId, nfcStatus, onClose]);

  // NFC keyboard wedge capture (fast reader input)
  useEffect(() => {
    if (!isOpen) return;
    if (modeLoading) return;
    if (attendanceMode !== 'NFC') return;

    let keyBuffer = '';
    let lastKeyTime = 0;
    const MAX_KEY_INTERVAL = 50;
    const MIN_CARD_LENGTH = 4;
    const MAX_CARD_LENGTH = 14;
    const BUFFER_TIMEOUT = 120;
    let bufferTimer = null;

    const onKeyDown = (e) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;
      if (timeSinceLastKey > MAX_KEY_INTERVAL && keyBuffer.length > 0) {
        keyBuffer = '';
      }
      lastKeyTime = now;

      if (bufferTimer) clearTimeout(bufferTimer);

      if (e.key === 'Enter') {
        const cardId = keyBuffer.trim().toUpperCase();
        keyBuffer = '';
        if (cardId.length >= MIN_CARD_LENGTH && cardId.length <= MAX_CARD_LENGTH && /^[A-F0-9]+$/i.test(cardId)) {
          handleNfcCardTap(cardId);
        }
        return;
      }

      if (/^[a-fA-F0-9]$/.test(e.key)) {
        keyBuffer += e.key;
        if (keyBuffer.length > MAX_CARD_LENGTH) {
          keyBuffer = keyBuffer.slice(-MAX_CARD_LENGTH);
        }
      }

      bufferTimer = setTimeout(() => {
        keyBuffer = '';
      }, BUFFER_TIMEOUT);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [attendanceMode, handleNfcCardTap, isOpen, modeLoading]);

  const pinDots = useMemo(() => pin.split('').map(() => '•').join(' '), [pin]);

  const renderPin = () => {
    if (showCamera) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{staff?.name} — Clock {clockAction === 'in' ? 'In' : 'Out'}</div>
            <button
              className="px-3 py-1 rounded border"
              onClick={() => {
                setShowCamera(false);
                setCapturedImage(null);
              }}
              disabled={loading}
            >
              Back
            </button>
          </div>

          <div className="rounded-lg overflow-hidden border" style={{ height: 360 }}>
            {!capturedImage ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                height="100%"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: 'user' }}
              />
            ) : (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            )}
          </div>

          {!capturedImage ? (
            <button
              className="w-full py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: theme.colors.accent }}
              onClick={capturePhoto}
              disabled={loading}
            >
              Capture Photo
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-lg border"
                onClick={() => setCapturedImage(null)}
                disabled={loading}
              >
                Retake
              </button>
              <button
                className="flex-1 py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: theme.colors.primary }}
                onClick={confirmPinClockWithPhoto}
                disabled={loading}
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-sm" style={{ color: theme.colors.secondary }}>
          Enter your PIN to clock in/out.
        </div>

        <div
          className="w-full py-3 px-4 text-center text-2xl tracking-widest font-mono rounded border"
          style={{ backgroundColor: theme.colors.activeBg, borderColor: theme.colors.muted }}
        >
          {pinDots || '• • • •'}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => {
            const label = k === 'del' ? 'DEL' : k === 'ok' ? 'OK' : String(k);
            const onClick = () => {
              if (k === 'del') {
                setPin((p) => p.slice(0, -1));
              } else if (k === 'ok') {
                handlePinSubmit();
              } else {
                setPin((p) => (p + k).replace(/\D/g, '').slice(0, 6));
              }
            };
            return (
              <button
                key={label}
                className="py-4 rounded-lg border font-semibold"
                style={{ borderColor: theme.colors.muted, color: theme.colors.primary }}
                onClick={onClick}
                disabled={loading}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          className="w-full py-3 rounded-lg font-semibold text-white"
          style={{ backgroundColor: theme.colors.primary }}
          onClick={handlePinSubmit}
          disabled={loading || pin.length < 4}
        >
          Clock
        </button>
      </div>
    );
  };

  const renderNfc = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.secondary }}>
          <FiCreditCard />
          <span>{nfcTestMode ? 'NFC Test Mode: type card ID + Enter' : 'Tap NFC card to clock in/out'}</span>
        </div>

        {nfcTestMode && (
          <input
            value={nfcCardId}
            onChange={(e) => setNfcCardId(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 14))}
            placeholder="Card ID"
            className="w-full px-3 py-3 rounded-lg border font-mono"
            style={{ borderColor: theme.colors.muted }}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNfcCardTap(nfcCardId);
            }}
            autoFocus
          />
        )}

        {nfcStatus ? (
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.colors.muted }}>
            <div className="font-semibold" style={{ color: theme.colors.primary }}>{nfcStatus.staffName}</div>
            <div className="text-sm" style={{ color: theme.colors.secondary }}>{nfcStatus.staffPosition}</div>
            <div className="text-sm mt-2" style={{ color: theme.colors.primary }}>
              Ready to Clock {nfcStatus.action === 'in' ? 'In' : 'Out'}
              {typeof nfcStatus.totalHours === 'number' && nfcStatus.action === 'out' ? ` (${nfcStatus.totalHours.toFixed(2)}h)` : ''}
            </div>

            {nfcStatus.pendingConfirm && (
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-3 rounded-lg border" onClick={() => setNfcStatus(null)} disabled={loading}>
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: theme.colors.primary }}
                  onClick={confirmNfc}
                  disabled={loading}
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-lg border text-center" style={{ borderColor: theme.colors.muted }}>
            <div className="text-4xl mb-2" style={{ color: theme.colors.accent }}>
              <FiClock className="inline" />
            </div>
            <div className="text-sm" style={{ color: theme.colors.primary }}>
              {nfcTestMode ? 'Enter Card ID and press Enter' : 'Awaiting NFC tap...'}
            </div>
          </div>
        )}

        {!nfcTapAndGo && attendanceMode === 'NFC' && (
          <div className="text-xs" style={{ color: theme.colors.muted }}>
            Confirm mode is enabled in settings.
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title={title}
      size="xl"
      showCloseButton
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="px-3 py-2 rounded-lg border flex items-center gap-2"
          style={{ borderColor: theme.colors.muted }}
        >
          {attendanceMode === 'NFC' ? <FiCreditCard /> : <FiUser />}
          <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>
            {modeLoading ? 'Loading…' : attendanceMode === 'NFC' ? 'NFC Mode' : 'PIN Mode'}
          </span>
        </div>

        <button
          className="ml-auto px-3 py-2 rounded-lg border flex items-center gap-2"
          style={{ borderColor: theme.colors.muted, color: theme.colors.primary }}
          onClick={() => {
            resetState();
          }}
          disabled={loading}
        >
          <FiX /> Reset
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg border text-sm" style={{ borderColor: theme.colors.muted, color: theme.colors.secondary }}>
          {errorMessage}
        </div>
      )}

      {modeLoading ? (
        <div className="py-10 text-center text-sm" style={{ color: theme.colors.muted }}>
          Loading attendance settings…
        </div>
      ) : attendanceMode === 'NFC' ? (
        renderNfc()
      ) : (
        renderPin()
      )}

      {loading && (
        <div className="mt-4 text-sm flex items-center gap-2" style={{ color: theme.colors.muted }}>
          <FiCheck /> Processing…
        </div>
      )}
    </Modal>
  );
};

export default QuickTimeClockModal;
