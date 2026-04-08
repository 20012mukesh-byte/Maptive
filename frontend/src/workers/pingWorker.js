self.onmessage = async (event) => {
  const { url } = event.data ?? {};
  if (!url) return;

  const sample = async () => {
    let pingMs = -1;
    let packetLoss = 100;
    if (self.navigator.onLine) {
      const attempts = 3;
      let successes = 0;
      const times = [];
      for (let index = 0; index < attempts; index += 1) {
        const started = performance.now();
        try {
          const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}_${index}`, {
            method: 'HEAD',
            cache: 'no-store',
          });
          if (response.ok) {
            successes += 1;
            times.push(performance.now() - started);
          }
        } catch {
        }
      }
      packetLoss = Math.round(((attempts - successes) / attempts) * 100);
      pingMs = successes ? Math.round(times.reduce((sum, time) => sum + time, 0) / successes) : -1;
    }

    self.postMessage({ pingMs, packetLoss, online: self.navigator.onLine, sampledAt: Date.now() });
  };

  await sample();
  clearInterval(self.__sampleInterval);
  self.__sampleInterval = setInterval(sample, 12000);
};
