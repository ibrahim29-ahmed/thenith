let cachedDeviceIp = null;

export async function detectDeviceIp() {
  if (cachedDeviceIp) return cachedDeviceIp;

  try {
    const stored = sessionStorage.getItem("thenith_device_ip");
    if (stored) {
      cachedDeviceIp = stored;
      return stored;
    }
  } catch {}

  return new Promise((resolve) => {
    try {
      const RTCPC =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;
      if (!RTCPC) return resolve(null);

      const pc = new RTCPC({ iceServers: [] });
      pc.createDataChannel("");

      let done = false;
      const finish = (ip) => {
        if (done) return;
        done = true;
        try {
          pc.close();
        } catch {}
        if (ip) {
          cachedDeviceIp = ip;
          try {
            sessionStorage.setItem("thenith_device_ip", ip);
          } catch {}
        }
        resolve(ip || null);
      };

      const timer = setTimeout(() => finish(null), 1000);

      pc.onicecandidate = (e) => {
        if (!e?.candidate?.candidate) return;
        const line = e.candidate.candidate;
        const match = line.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
        if (match && match[0] && !match[0].startsWith("0.")) {
          clearTimeout(timer);
          finish(match[0]);
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish(null));
    } catch {
      resolve(null);
    }
  });
}

export function getCachedDeviceIp() {
  if (cachedDeviceIp) return cachedDeviceIp;
  try {
    return sessionStorage.getItem("thenith_device_ip") || null;
  } catch {
    return null;
  }
}

// Auto-detect on import
if (typeof window !== "undefined") {
  detectDeviceIp();
}

export default { detectDeviceIp, getCachedDeviceIp };
