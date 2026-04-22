(function () {
  const pill = document.getElementById("status-pill");
  const details = document.getElementById("status-details");
  const errEl = document.getElementById("status-error");
  const fieldService = document.getElementById("field-service");
  const fieldUptime = document.getElementById("field-uptime");
  const fieldHttp = document.getElementById("field-http");
  const fieldDeployEnv = document.getElementById("field-deploy-env");
  const fieldBanner = document.getElementById("field-banner");
  const fieldConfig = document.getElementById("field-config");
  const fieldData = document.getElementById("field-data");
  const refreshBtn = document.getElementById("refresh-status");
  const buildHint = document.getElementById("build-hint");

  const metaBuild = document.querySelector('meta[name="build"]');
  if (metaBuild && metaBuild.content) {
    buildHint.textContent = "build " + metaBuild.content.slice(0, 19).replace("T", " ");
  }

  async function loadHealth() {
    pill.textContent = "Checking…";
    pill.dataset.state = "loading";
    details.hidden = true;
    errEl.hidden = true;

    try {
      const [healthRes, runtimeRes] = await Promise.all([
        fetch("/health", { headers: { Accept: "application/json" } }),
        fetch("/api/runtime", { headers: { Accept: "application/json" } }),
      ]);

      const body = await healthRes.json().catch(() => ({}));
      const runtime = await runtimeRes.json().catch(() => ({}));

      if (!healthRes.ok) {
        throw new Error("HTTP " + healthRes.status);
      }

      pill.textContent = body.status === "ok" ? "Healthy" : "Degraded";
      pill.dataset.state = body.status === "ok" ? "ok" : "error";

      fieldService.textContent = body.service || "—";
      fieldUptime.textContent =
        typeof body.uptimeSeconds === "number" ? body.uptimeSeconds + " s" : "—";
      fieldHttp.textContent = healthRes.status + " " + healthRes.statusText;

      if (runtimeRes.ok && runtime && typeof runtime === "object") {
        fieldDeployEnv.textContent = runtime.deploymentEnv || "—";
        fieldBanner.textContent = runtime.publicBanner || "—";
        const cfgBits = [];
        if (runtime.configPath) {
          cfgBits.push(runtime.configPath);
        }
        cfgBits.push(runtime.configLoaded ? "loaded" : "pending");
        fieldConfig.textContent = cfgBits.join(" · ");
        fieldData.textContent = runtime.dataDirWritable
          ? (runtime.dataDir || "/data") + " (writable)"
          : (runtime.dataDir || "/data") + " (not writable)";
      } else {
        fieldDeployEnv.textContent = "—";
        fieldBanner.textContent = "—";
        fieldConfig.textContent = "—";
        fieldData.textContent = "—";
      }

      details.hidden = false;
    } catch (e) {
      pill.textContent = "Unreachable";
      pill.dataset.state = "error";
      errEl.textContent = "Could not load /health. " + (e.message || String(e));
      errEl.hidden = false;
    }
  }

  refreshBtn.addEventListener("click", loadHealth);
  loadHealth();
})();
